package main

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/golang/glog"
	pb "github.com/qdrant/go-client/qdrant"
	"github.com/rokeller/photo-search/srv/web/models"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"gopkg.in/yaml.v3"
)

const (
	METADATA_PATH      = "path"
	METADATA_TIMESTAMP = "timestamp"
	METADATA_EXIF      = "exif"

	EXIF_CAMERA_MAKE  = "Make"
	EXIF_CAMERA_Model = "Model"
	EXIF_ORIENTATION  = "Orientation"
)

type serverContext struct {
	conn                     *grpc.ClientConn
	coll                     string
	embeddingsServiceBaseUrl string
	photosRootDir            string

	oauthSettings models.OAuthSettings
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

		oauthSettings: loadOAuthSettings(),
	}

	return ctx.ensureCollection()
}

func loadOAuthSettings() models.OAuthSettings {
	file, err := os.Open("config/oauth.yaml")
	if nil != err {
		glog.Exitf("Failed to read oauth.yaml: %v", err)
	}

	defer file.Close()

	var settings models.OAuthSettings
	decoder := yaml.NewDecoder(file)
	err = decoder.Decode(&settings)
	if nil != err {
		glog.Exitf("Failed to parse oauth.yaml: %v", err)
	}

	return settings
}

func (c *serverContext) ensureCollection() (*serverContext, error) {
	client := pb.NewCollectionsClient(c.conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := client.Get(ctx,
		&pb.GetCollectionInfoRequest{CollectionName: c.coll})
	if nil != err {
		code := status.Code(err)

		switch code {
		case codes.NotFound:
			return c.createCollection()

		case codes.Unavailable, codes.DeadlineExceeded:
			glog.Errorf("Vector database is unavailable: %v; grpc code = %v", err, code)
			return nil, VectorDatabaseUnavailable

		default:
			glog.Errorf("Failed to get collection details for '%s': %v; grpc code = %v", c.coll, err, code)
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
		payload := map[string]*pb.Value{
			METADATA_PATH: {
				Kind: &pb.Value_StringValue{StringValue: item.Payload.Path},
			},
			METADATA_EXIF: {
				Kind: &pb.Value_StructValue{
					StructValue: &pb.Struct{
						Fields: exifTagsToPayloadFields(item.Payload.Exif),
					},
				},
			},
		}

		if nil != item.Payload.Timestamp {
			payload[METADATA_TIMESTAMP] = &pb.Value{
				Kind: &pb.Value_IntegerValue{IntegerValue: *item.Payload.Timestamp},
			}
		} else {
			glog.Warningf("Image at path '%s' has no timestamp.", item.Payload.Path)
		}

		points[i] = &pb.PointStruct{
			Id: &pb.PointId{
				PointIdOptions: &pb.PointId_Uuid{
					Uuid: pathHash(item.Payload.Path),
				},
			},
			Payload: payload,
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
		code := status.Code(err)
		glog.Errorf("Failed to upsert points: %v; grpc code: %v", err, code)

		switch code {
		case codes.Unavailable, codes.DeadlineExceeded:
			return VectorDatabaseUnavailable

		default:
			return err
		}
	}

	return nil
}

func (c *serverContext) delete(items []string) error {
	client := pb.NewPointsClient(c.conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pointIds := make([]*pb.PointId, len(items))
	for i, item := range items {
		pointIds[i] = &pb.PointId{
			PointIdOptions: &pb.PointId_Uuid{
				Uuid: pathHash(item),
			},
		}
	}

	_, err := client.Delete(ctx, &pb.DeletePoints{
		CollectionName: c.coll,
		Points: &pb.PointsSelector{
			PointsSelectorOneOf: &pb.PointsSelector_Points{
				Points: &pb.PointsIdsList{
					Ids: pointIds,
				},
			},
		},
	})
	if nil != err {
		code := status.Code(err)
		glog.Errorf("Failed to delete points: %v; grpc code: %v", err, code)

		switch code {
		case codes.Unavailable, codes.DeadlineExceeded:
			return VectorDatabaseUnavailable

		default:
			return err
		}
	}

	return nil
}

func (c *serverContext) search(
	query string,
	limit uint,
	offset *uint,
	filter *models.PhotoFilter,
) (*models.PhotoResultsResponse, error) {
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

	qdrantFilter := makeQdrantFilter(filter)
	glog.V(1).Infof("Search filter: %v", qdrantFilter)

	r, err := client.Search(ctx, &pb.SearchPoints{
		CollectionName: c.coll,
		Vector:         v,
		Limit:          uint64(limit),
		Offset:         &finalOffset,
		Filter:         qdrantFilter,
		WithPayload: &pb.WithPayloadSelector{
			SelectorOptions: &pb.WithPayloadSelector_Enable{Enable: true},
		},
	})
	if nil != err {
		code := status.Code(err)
		glog.Errorf("Failed to search vectors: %v; grpc code: %v", err, code)

		switch code {
		case codes.Unavailable, codes.DeadlineExceeded:
			return nil, VectorDatabaseUnavailable

		default:
			return nil, err
		}
	}

	return makePhotoResultsResponse(r.Result), nil
}

func (c *serverContext) recommend(
	id string,
	limit uint,
	offset *uint,
	filter *models.PhotoFilter,
) (*models.PhotoResultsResponse, error) {
	client := pb.NewPointsClient(c.conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	finalOffset := uint64(0)
	if nil != offset {
		finalOffset = uint64(*offset)
	}

	qdrantFilter := makeQdrantFilter(filter)
	glog.V(1).Infof("Recommend filter: %v", qdrantFilter)

	r, err := client.Recommend(ctx, &pb.RecommendPoints{
		CollectionName: c.coll,
		Positive: []*pb.PointId{
			{
				PointIdOptions: &pb.PointId_Uuid{Uuid: id},
			},
		},
		Limit:  uint64(limit),
		Offset: &finalOffset,
		Filter: qdrantFilter,
		WithPayload: &pb.WithPayloadSelector{
			SelectorOptions: &pb.WithPayloadSelector_Enable{Enable: true},
		},
	})
	if nil != err {
		code := status.Code(err)
		glog.Errorf("Failed to recommend similar for '%s': %v; grpc code: %v",
			id, err, code)

		switch code {
		case codes.Unavailable, codes.DeadlineExceeded:
			return nil, VectorDatabaseUnavailable

		default:
			return nil, err
		}
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
		code := status.Code(err)
		glog.Errorf("Failed to get point details for '%s': %v; grpc code: %v",
			id, err, code)

		switch code {
		case codes.Unavailable, codes.DeadlineExceeded:
			return nil, VectorDatabaseUnavailable

		default:
			return nil, err
		}
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
		if errors.Is(err, syscall.ECONNREFUSED) {
			return nil, EmbeddingServerUnavailable
		}

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
			Id:        r.Id.GetUuid(),
			Path:      *getPathFromPayload(r.Payload),
			Timestamp: getTimestampFromPayload(r.Payload),
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
		val, err := exifTagValueToFieldValue(v)
		if nil != err {
			glog.Errorf("Failed to convert value '%v' to qdrant field value: %v", v, err)
		}
		result[k] = val
	}

	return result
}

func exifTagValueToFieldValue(v any) (*pb.Value, error) {
	switch val := v.(type) {
	case bool:
		return &pb.Value{Kind: &pb.Value_BoolValue{BoolValue: val}}, nil

	case json.Number:
		if strings.Index(string(val), ".") >= 0 {
			// float64
			f, err := val.Float64()
			if nil == err {
				return &pb.Value{Kind: &pb.Value_DoubleValue{DoubleValue: f}}, nil
			}
			return nil, err
		} else {
			// int64
			i, err := val.Int64()
			if nil == err {
				return &pb.Value{Kind: &pb.Value_IntegerValue{IntegerValue: i}}, nil
			}
			return nil, err
		}

	case string:
		return &pb.Value{Kind: &pb.Value_StringValue{StringValue: val}}, nil

	case []any:
		values := make([]*pb.Value, len(val))
		for i, value := range val {
			tmp, err := exifTagValueToFieldValue(value)
			if nil != err {
				return nil, err
			}
			values[i] = tmp
		}
		return &pb.Value{Kind: &pb.Value_ListValue{}}, nil

	case nil:
		return &pb.Value{Kind: &pb.Value_NullValue{NullValue: pb.NullValue_NULL_VALUE}}, nil

	default:
		glog.V(1).Infof("Unsupported tag value type: %v", v)
		return nil, errors.New("unsupported tag value type")
	}
}

func getPathFromPayload(payload map[string]*pb.Value) *string {
	path := payload[METADATA_PATH].GetStringValue()
	return &path
}

func getTimestampFromPayload(payload map[string]*pb.Value) *int64 {
	timestamp, found := payload[METADATA_TIMESTAMP]
	if !found {
		return nil
	}

	val := timestamp.GetIntegerValue()
	return &val
}

func getCameraFromPayload(payload map[string]*pb.Value) *string {
	makeVal := getExifFieldFromPayload(payload, EXIF_CAMERA_MAKE)
	modelVal := getExifFieldFromPayload(payload, EXIF_CAMERA_Model)

	if nil == makeVal && nil == modelVal {
		return nil
	}

	var result string
	if nil != makeVal {
		result = makeVal.GetStringValue()

		if nil != modelVal {
			result += fmt.Sprintf(" (%s)", modelVal.GetStringValue())
		}
	} else {
		result = modelVal.GetStringValue()
	}

	return &result
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

func makeQdrantFilter(filter *models.PhotoFilter) *pb.Filter {
	if nil == filter {
		return nil
	}

	var must []*pb.Condition
	var should []*pb.Condition

	if nil != filter.NotBefore || nil != filter.NotAfter {
		var notBefore *float64
		var notAfter *float64

		if nil != filter.NotBefore {
			val := float64(*filter.NotBefore)
			notBefore = &val
		}

		if nil != filter.NotAfter {
			val := float64(*filter.NotAfter)
			notAfter = &val
		}

		timestampFilter := &pb.Condition{
			ConditionOneOf: &pb.Condition_Field{
				Field: &pb.FieldCondition{
					Key: METADATA_TIMESTAMP,
					Range: &pb.Range{
						Gte: notBefore,
						Lt:  notAfter,
					},
				},
			},
		}

		must = append(must, timestampFilter)
	}

	if nil != filter.OnThisDay {
		timestamp := time.Unix(*filter.OnThisDay, 0)
		curYear, curMonth, curDay := timestamp.Date()
		glog.V(2).Infof("Create filter for on-this-day %v", timestamp)

		for year := 2000; year <= curYear+1; year++ {
			startOfDay := time.Date(year, curMonth, curDay, 0, 0, 0, 0, time.UTC)
			notBefore := float64(startOfDay.Unix())
			notAfter := notBefore + 24*60*60

			dateRangeForYear := &pb.Condition{
				ConditionOneOf: &pb.Condition_Field{
					Field: &pb.FieldCondition{
						Key: METADATA_TIMESTAMP,
						Range: &pb.Range{
							Gte: &notBefore,
							Lt:  &notAfter,
						},
					},
				},
			}

			should = append(should, dateRangeForYear)
		}
	}

	if len(must) > 0 || len(should) > 0 {
		return &pb.Filter{
			Must:   must,
			Should: should,
		}
	}

	return nil
}
