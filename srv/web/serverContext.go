package main

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/golang/glog"
	pb "github.com/qdrant/go-client/qdrant"
	"github.com/rokeller/photo-search/srv/web/models"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
)

const (
	METADATA_PATH = "path"
	METADATA_EXIF = "exif"

	EXIF_ORIENTATION = "Orientation"
)

type serverContext struct {
	conn                     *grpc.ClientConn
	coll                     string
	embeddingsServiceBaseUrl string
	photosRootDir            string
}

func newServerContext(addr, coll, embeddingsServiceBaseUrl, photosRootDir string) (*serverContext, error) {
	conn, err := grpc.Dial(addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if nil != err {
		glog.Exitf("Failed to connect to qdrant '%s' gRPC: %v", addr, err)
		return nil, err
	}

	ctx := &serverContext{
		conn:                     conn,
		coll:                     coll,
		embeddingsServiceBaseUrl: strings.TrimSuffix(embeddingsServiceBaseUrl, "/"),
		photosRootDir:            photosRootDir,
	}

	return ctx.ensureCollection()
}

func (c *serverContext) ensureCollection() (*serverContext, error) {
	client := pb.NewCollectionsClient(c.conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := client.Get(ctx,
		&pb.GetCollectionInfoRequest{CollectionName: c.coll})
	if nil != err {
		if codes.NotFound == status.Code(err) {
			return c.createCollection()
		} else {
			defer c.conn.Close()
			glog.Errorf("Failed to get collection details for '%s': %v", c.coll, err)
			return nil, err
		}
	}

	return c, nil
}

func (c *serverContext) createCollection() (*serverContext, error) {
	glog.V(1).Infof("Collection '%s' does not exist, creating it ...", c.coll)

	client := pb.NewCollectionsClient(c.conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := client.Create(ctx, &pb.CreateCollection{
		CollectionName: c.coll,
		VectorsConfig: &pb.VectorsConfig{
			Config: &pb.VectorsConfig_Params{
				Params: &pb.VectorParams{
					Size:     512,
					Distance: pb.Distance_Cosine,
				},
			},
		},
	})
	if nil != err {
		defer c.conn.Close()
		glog.Errorf("Failed to create collection '%s': %v", c.coll, err)
		return nil, err
	}

	glog.Infof("Collection '%s' successfully created.", c.coll)

	return c, nil
}

func (c *serverContext) upsert(items []*models.ItemToIndex) error {
	points := make([]*pb.PointStruct, len(items))

	for i, item := range items {
		points[i] = &pb.PointStruct{
			Id: &pb.PointId{
				PointIdOptions: &pb.PointId_Uuid{
					Uuid: pathHash(item.Path),
				},
			},
			Payload: map[string]*pb.Value{
				METADATA_PATH: {
					Kind: &pb.Value_StringValue{StringValue: item.Path},
				},
				METADATA_EXIF: {
					Kind: &pb.Value_StructValue{
						StructValue: &pb.Struct{
							Fields: exifTagsToPayloadFields(item.Exif),
						},
					},
				},
			},
			Vectors: &pb.Vectors{
				VectorsOptions: &pb.Vectors_Vector{
					Vector: &pb.Vector{
						Data: item.Vector,
					},
				},
			},
		}
	}

	client := pb.NewPointsClient(c.conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := client.Upsert(ctx, &pb.UpsertPoints{
		CollectionName: c.coll,
		Points:         points,
	})
	if nil != err {
		glog.Errorf("Failed to upsert points: %v", err)
		return err
	}

	return nil
}

func (c *serverContext) search(query string, limit uint, offset *uint) (*models.PhotoResultsResponse, error) {
	v, err := c.getEmbedding(query)
	if nil != err {
		glog.Errorf("Failed to get embedding for query '%s': %v", query, err)
		return nil, err
	}

	client := pb.NewPointsClient(c.conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	finalOffset := uint64(0)
	if nil != offset {
		finalOffset = uint64(*offset)
	}

	r, err := client.Search(ctx, &pb.SearchPoints{
		CollectionName: c.coll,
		Vector:         v,
		Limit:          uint64(limit),
		Offset:         &finalOffset,
		WithPayload: &pb.WithPayloadSelector{
			SelectorOptions: &pb.WithPayloadSelector_Enable{Enable: true},
		},
	})
	if nil != err {
		glog.Errorf("Failed to search for vector: %v", err)
		return nil, err
	}

	return makePhotoResultsResponse(r.Result), nil
}

func (c *serverContext) recommend(
	id string,
	limit uint,
	offset *uint,
) (*models.PhotoResultsResponse, error) {
	client := pb.NewPointsClient(c.conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	finalOffset := uint64(0)
	if nil != offset {
		finalOffset = uint64(*offset)
	}

	r, err := client.Recommend(ctx, &pb.RecommendPoints{
		CollectionName: c.coll,
		Positive: []*pb.PointId{
			{
				PointIdOptions: &pb.PointId_Uuid{Uuid: id},
			},
		},
		Limit:  uint64(limit),
		Offset: &finalOffset,
		WithPayload: &pb.WithPayloadSelector{
			SelectorOptions: &pb.WithPayloadSelector_Enable{Enable: true},
		},
	})
	if nil != err {
		glog.Errorf("Failed to recomment similar for '%s': %v", id, err)
		return nil, err
	}

	return makePhotoResultsResponse(r.Result), nil
}

func (c *serverContext) getPayloadById(id string) (map[string]*pb.Value, error) {
	client := pb.NewPointsClient(c.conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	r, err := client.Get(ctx, &pb.GetPoints{
		CollectionName: c.coll,
		Ids: []*pb.PointId{
			{
				PointIdOptions: &pb.PointId_Uuid{Uuid: id},
			},
		},
		WithPayload: &pb.WithPayloadSelector{
			SelectorOptions: &pb.WithPayloadSelector_Enable{Enable: true},
		},
	})
	if nil != err {
		glog.Errorf("Failed to get point details for '%s': %v", id, err)
		return nil, err
	}

	return r.Result[0].Payload, nil
}

func (c *serverContext) getEmbedding(query string) ([]float32, error) {
	bodyVals := url.Values{}
	bodyVals.Add("query", query)
	bodyStr := bodyVals.Encode()
	req, err := http.NewRequest("POST",
		c.embeddingsServiceBaseUrl+"/v1/embed",
		strings.NewReader(bodyStr))
	if nil != err {
		return nil, err
	}

	req.Header.Add("content-type", "application/x-www-form-urlencoded")
	req.Header.Add("content-length", strconv.Itoa(len(bodyStr)))

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Do(req)
	if nil != err {
		glog.Errorf("Failed to retrieve embedding for '%s': %v", query, err)
		return nil, err
	}

	defer resp.Body.Close()

	respBody := &models.EmbeddingResponse{}
	if err := json.NewDecoder(resp.Body).Decode(respBody); nil != err {
		glog.Errorf("Failed to decode embedding response: %v", err)
		return nil, err
	}

	return respBody.Vector, nil
}

func pathHash(path string) string {
	hash := sha1.Sum([]byte(path))
	// hash is 20 bytes, but we need 16 bytes to mimic a UUID; take the last 16 bytes
	return hex.EncodeToString(hash[4:])
}

func makePhotoResultsResponse(scoredItems []*pb.ScoredPoint) *models.PhotoResultsResponse {
	items := make([]*models.PhotoResultItem, len(scoredItems))
	for i, r := range scoredItems {
		items[i] = &models.PhotoResultItem{
			Id:    r.Id.GetUuid(),
			Score: r.Score,
			Path:  r.Payload[METADATA_PATH].GetStringValue(),
		}
	}

	result := &models.PhotoResultsResponse{
		Items: items,
	}

	return result
}

func exifTagsToPayloadFields(tags map[string]any) map[string]*pb.Value {
	result := make(map[string]*pb.Value)
	for k, v := range tags {
		switch val := v.(type) {
		case bool:
			result[k] = &pb.Value{Kind: &pb.Value_BoolValue{BoolValue: val}}
		case json.Number:
			if strings.Index(string(val), ".") >= 0 {
				// float64
				f, err := val.Float64()
				if nil == err {
					result[k] = &pb.Value{Kind: &pb.Value_DoubleValue{DoubleValue: f}}
				}
			} else {
				// int64
				i, err := val.Int64()
				if nil == err {
					result[k] = &pb.Value{Kind: &pb.Value_IntegerValue{IntegerValue: i}}
				}
			}
		case string:
			result[k] = &pb.Value{Kind: &pb.Value_StringValue{StringValue: val}}
		case nil:
			result[k] = &pb.Value{Kind: &pb.Value_NullValue{NullValue: pb.NullValue_NULL_VALUE}}

		default:
			glog.V(1).Infof("Unsupported tag value type for EXIF tag '%s': %v", k, v)
		}
	}

	return result
}

func getPathFromPayload(payload map[string]*pb.Value) *string {
	path := payload[METADATA_PATH].GetStringValue()
	return &path
}

func getOrientationFromPayload(payload map[string]*pb.Value) *int64 {
	field := getExifFieldFromPayload(payload, EXIF_ORIENTATION)
	if nil == field {
		return nil
	}

	switch f := field.Kind.(type) {
	case *pb.Value_DoubleValue:
		intVal := int64(f.DoubleValue)
		return &intVal

	case *pb.Value_IntegerValue:
		return &f.IntegerValue
	}

	glog.Warning("Tag 'Orientation' is neither float64 nor int64.")

	return nil
}

func getExifFieldFromPayload(payload map[string]*pb.Value, fieldName string) *pb.Value {
	exif := payload[METADATA_EXIF].GetStructValue()
	field, found := exif.Fields[fieldName]
	if !found {
		return nil
	}

	return field
}
