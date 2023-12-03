package models

type IndexRequest struct {
	Items []*ItemToIndex `json:"items"`
}

type ItemToIndex struct {
	Path   string         `json:"path"`
	Exif   map[string]any `json:"exif"`
	Vector []float32      `json:"v"`
}
