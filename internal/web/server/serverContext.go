package server

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"syscall"
	"time"

	pb "github.com/qdrant/go-client/qdrant"
	"github.com/rokeller/photo-search/internal/web/models"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"gopkg.in/yaml.v3"
	"k8s.io/klog/v2"
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
	spaRootDir               string

	oauthSettings models.OAuthSettings
}

type photoPathsResult struct {
	Values     []string `json:"values"`
	NextOffset *string  `json:"next_offset,omitempty"`
}

func NewServerContext(addr, coll, embeddingsServiceBaseUrl, photosRootDir, configPath, spaRootDir string) (*serverContext, error) {
	conn, err := grpc.NewClient(addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		klog.Exitf("Failed to connect to qdrant '%s' gRPC: %v", addr, err)
		return nil, err
	}

	ctx := &serverContext{
		conn:                     conn,
		coll:                     coll,
		embeddingsServiceBaseUrl: strings.TrimSuffix(embeddingsServiceBaseUrl, "/"),
		photosRootDir:            photosRootDir,
		spaRootDir:               spaRootDir,

		oauthSettings: loadOAuthSettings(configPath),
	}

	return ctx.ensureCollection()
}

func (s *serverContext) Close() error {
	return s.conn.Close()
}

func loadOAuthSettings(configPath string) models.OAuthSettings {
	file, err := os.Open(configPath)
	if err != nil {
		klog.Exitf("Failed to read %q: %v", configPath, err)
	}

	defer file.Close()

	var settings models.OAuthSettings
	decoder := yaml.NewDecoder(file)
	err = decoder.Decode(&settings)
	if err != nil {
		klog.Exitf("Failed to parse %q: %v", configPath, err)
	}

	return settings
}

func (c *serverContext) ensureCollection() (*serverContext, error) {
	client := pb.NewCollectionsClient(c.conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := client.Get(ctx,
		&pb.GetCollectionInfoRequest{CollectionName: c.coll})
	if err != nil {
		code := status.Code(err)

		switch code {
		case codes.NotFound:
			return c.createCollection()

		case codes.Unavailable, codes.DeadlineExceeded:
			klog.ErrorS(err, "Vector database is unavailable", "code", code)
			return nil, VectorDatabaseUnavailable

		default:
			klog.ErrorS(err, "Failed to get collection details", "collection", c.coll, "code", code)
			return nil, err
		}
	}

	return c, nil
}

func (c *serverContext) createCollection() (*serverContext, error) {
	klog.V(1).InfoS("Collection does not exist, creating it", "collection", c.coll)

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
	if err != nil {
		defer c.conn.Close()
		klog.ErrorS(err, "Failed to create collection", "collection", c.coll)
		return nil, err
	}

	klog.InfoS("Collection successfully created", "collection", c.coll)

	return c, nil
}

func (c *serverContext) getPhotoPaths(pageSize uint32, offset *string, ctx context.Context) (*photoPathsResult, error) {
	client := pb.NewPointsClient(c.conn)
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req := pb.ScrollPoints{
		CollectionName: c.coll,
		WithPayload: &pb.WithPayloadSelector{
			SelectorOptions: &pb.WithPayloadSelector_Include{
				Include: &pb.PayloadIncludeSelector{
					Fields: []string{METADATA_PATH},
				},
			},
		},
		WithVectors: &pb.WithVectorsSelector{
			SelectorOptions: &pb.WithVectorsSelector_Enable{
				Enable: false,
			},
		},
		Limit: &pageSize,
	}
	if offset != nil {
		req.Offset = &pb.PointId{
			PointIdOptions: &pb.PointId_Uuid{
				Uuid: *offset,
			},
		}
	}
	resp, err := client.Scroll(ctx, &req)
	if err != nil {
		return nil, err
	}

	paths := make([]string, len(resp.Result))
	for i, path := range resp.Result {
		paths[i] = *getPathFromPayload(path.Payload)
	}
	var nextOffset *string
	if resp.NextPageOffset != nil {
		nextUuid := resp.NextPageOffset.GetUuid()
		nextOffset = &nextUuid
	}

	return &photoPathsResult{
		Values:     paths,
		NextOffset: nextOffset,
	}, nil
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

		if item.Payload.Timestamp != nil {
			payload[METADATA_TIMESTAMP] = &pb.Value{
				Kind: &pb.Value_IntegerValue{IntegerValue: *item.Payload.Timestamp},
			}
		} else {
			klog.V(1).InfoS("Image has no timestamp", "path", item.Payload.Path)
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
	if err != nil {
		code := status.Code(err)
		klog.ErrorS(err, "Failed to upsert points", "code", code)

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
	if err != nil {
		code := status.Code(err)
		klog.ErrorS(err, "Failed to delete points", "code", code)

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
	if err != nil {
		klog.ErrorS(err, "Failed to get embedding", "query", query)
		return nil, err
	}

	client := pb.NewPointsClient(c.conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	finalOffset := uint64(0)
	if offset != nil {
		finalOffset = uint64(*offset)
	}

	qdrantFilter := makeQdrantFilter(filter)
	klog.V(1).InfoS("Search", "filter", qdrantFilter)

	req := &pb.QueryPoints{
		CollectionName: c.coll,
		Query:          pb.NewQuery(v...),
		Limit:          new(uint64(limit)),
		Offset:         &finalOffset,
		Filter:         qdrantFilter,
		WithPayload: &pb.WithPayloadSelector{
			SelectorOptions: &pb.WithPayloadSelector_Enable{Enable: true},
		},
	}
	if filter != nil && filter.MinScore != nil {
		req.ScoreThreshold = filter.MinScore
	}

	r, err := client.Query(ctx, req)
	if err != nil {
		code := status.Code(err)
		klog.ErrorS(err, "Failed to search vectors", "code", code)

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
	if offset != nil {
		finalOffset = uint64(*offset)
	}

	qdrantFilter := makeQdrantFilter(filter)
	klog.V(1).InfoS("Recommend", "filter", qdrantFilter)

	req := &pb.QueryPoints{
		CollectionName: c.coll,
		Query: pb.NewQueryRecommend(&pb.RecommendInput{
			Positive: []*pb.VectorInput{
				{
					Variant: &pb.VectorInput_Id{
						Id: pb.NewID(id),
					},
				},
			},
		}),
		Limit:  new(uint64(limit)),
		Offset: &finalOffset,
		Filter: qdrantFilter,
		WithPayload: &pb.WithPayloadSelector{
			SelectorOptions: &pb.WithPayloadSelector_Enable{Enable: true},
		},
	}
	if filter != nil && filter.MinScore != nil {
		req.ScoreThreshold = filter.MinScore
	}
	r, err := client.Query(ctx, req)
	if err != nil {
		code := status.Code(err)
		klog.ErrorS(err, "Failed to recommend similar", "id", id, "code", code)

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
	if err != nil {
		code := status.Code(err)
		klog.ErrorS(err, "Failed to get point details", "id", id, "code", code)

		switch code {
		case codes.Unavailable, codes.DeadlineExceeded:
			return nil, VectorDatabaseUnavailable

		default:
			return nil, err
		}
	}

	if len(r.Result) == 1 {
		return r.Result[0].Payload, nil
	} else {
		return nil, nil
	}
}

func (c *serverContext) deleteFromIndexById(id string) error {
	client := pb.NewPointsClient(c.conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	klog.InfoS("Deleting photo from index", "id", id)
	_, err := client.Delete(ctx, &pb.DeletePoints{
		CollectionName: c.coll,
		Points: &pb.PointsSelector{
			PointsSelectorOneOf: &pb.PointsSelector_Points{
				Points: &pb.PointsIdsList{
					Ids: []*pb.PointId{
						{PointIdOptions: &pb.PointId_Uuid{Uuid: id}},
					},
				},
			},
		},
	})
	if err != nil {
		code := status.Code(err)
		klog.ErrorS(err, "Failed to delete point from index", "id", id, "code", code)

		switch code {
		case codes.Unavailable, codes.DeadlineExceeded:
			return VectorDatabaseUnavailable

		default:
			return err
		}
	}
	return nil
}

func (c *serverContext) getEmbedding(query string) ([]float32, error) {
	bodyVals := url.Values{}
	bodyVals.Add("query", query)
	bodyStr := bodyVals.Encode()
	req, err := http.NewRequest("POST",
		c.embeddingsServiceBaseUrl+"/v1/embed",
		strings.NewReader(bodyStr))
	if err != nil {
		return nil, err
	}

	req.Header.Add("content-type", "application/x-www-form-urlencoded")
	req.Header.Add("content-length", strconv.Itoa(len(bodyStr)))

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		if errors.Is(err, syscall.ECONNREFUSED) {
			return nil, EmbeddingServerUnavailable
		}

		klog.ErrorS(err, "Failed to retrieve embedding", "query", query)
		return nil, err
	}

	defer resp.Body.Close()

	respBody := &models.EmbeddingResponse{}
	if err := json.NewDecoder(resp.Body).Decode(respBody); err != nil {
		klog.ErrorS(err, "Failed to decode embedding response")
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
		if err != nil {
			klog.ErrorS(err, "Failed to convert qdrant field value", "value", v)
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
		if strings.Contains(string(val), ".") {
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
			if err != nil {
				return nil, err
			}
			values[i] = tmp
		}
		return &pb.Value{Kind: &pb.Value_ListValue{}}, nil

	case nil:
		return &pb.Value{Kind: &pb.Value_NullValue{NullValue: pb.NullValue_NULL_VALUE}}, nil

	default:
		klog.V(1).InfoS("Unsupported tag value", "type", v)
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

	default:
		klog.ErrorS(nil, "Tag 'Orientation' is neither float64 nor int64", "type", f)
		return nil
	}
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

	if filter.NotBefore != nil || filter.NotAfter != nil {
		var notBefore *float64
		var notAfter *float64

		if filter.NotBefore != nil {
			val := float64(*filter.NotBefore)
			notBefore = &val
		}

		if filter.NotAfter != nil {
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

	if filter.OnThisDay != nil {
		timestamp := time.Unix(*filter.OnThisDay, 0)
		curYear, curMonth, curDay := timestamp.Date()
		klog.V(2).InfoS("Create filter for on-this-day", "timestamp", timestamp)

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
