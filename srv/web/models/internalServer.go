package models

type IndexRequest struct {
	Items []*ItemToIndex `json:"items"`
}

type ItemToIndex struct {
	Path   string    `json:"path"`
	Vector []float32 `json:"v"`
}
