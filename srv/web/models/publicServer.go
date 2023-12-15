package models

type SearchPhotosRequest struct {
	Query  string `json:"query"`
	Limit  *uint  `json:"limit"`
	Offset *uint  `json:"offset"`

	Filter *PhotoFilter `json:"filter,omitempty"`
}

type RecommendPhotosRequest struct {
	Id     string `json:"id"`
	Limit  *uint  `json:"limit"`
	Offset *uint  `json:"offset"`

	Filter *PhotoFilter `json:"filter,omitempty"`
}

type PhotoFilter struct {
	NotBefore *int64 `json:"notBefore,omitempty"`
	NotAfter  *int64 `json:"notAfter,omitempty"`
}

type PhotoResultsResponse struct {
	Items []*PhotoResultItem `json:"items"`
}

type PhotoResultItem struct {
	Id        string `json:"id"`
	Path      string `json:"path"`
	Timestamp *int64 `json:"timestamp,omitempty"`
}

type EmbeddingResponse struct {
	Vector []float32 `json:"v"`
}
