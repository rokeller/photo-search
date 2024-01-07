package models

type PhotosRequestBase struct {
	Limit  *uint `json:"limit,omitempty"`
	Offset *uint `json:"offset,omitempty"`

	Filter *PhotoFilter `json:"filter,omitempty"`
}

type SearchPhotosRequest struct {
	Query string `json:"query"`
	PhotosRequestBase
}

type RecommendPhotosRequest struct {
	Id string `json:"id"`
	PhotosRequestBase
}

type PhotoFilter struct {
	NotBefore *int64 `json:"notBefore,omitempty"`
	NotAfter  *int64 `json:"notAfter,omitempty"`

	OnThisDay *int64 `json:"onThisDay,omitempty"`
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
