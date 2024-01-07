package models

type IndexRequest struct {
	Items []*ItemToIndex `json:"items"`
}

type ItemToIndex struct {
	Payload ItemPayload `json:"p"`
	Vector  []float32   `json:"v"`
}

type ItemPayload struct {
	Path      string         `json:"path"`
	Timestamp *int64         `json:"timestamp"`
	Exif      map[string]any `json:"exif"`
}

type DeleteFromIndexRequest struct {
	Items []string `json:"paths"`
}
