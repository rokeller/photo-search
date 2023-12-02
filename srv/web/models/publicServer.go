package models

type SearchPhotosRequest struct {
	Query  string `json:"query"`
	Limit  *uint  `json:"limit"`
	Offset *uint  `json:"offset"`
}

type PhotoResultsResponse struct {
	Items []*PhotoResultItem `json:"items"`
}

type RecommendPhotosRequest struct {
	Id     string `json:"id"`
	Limit  *uint  `json:"limit"`
	Offset *uint  `json:"offset"`
}

type PhotoResultItem struct {
	Id    string  `json:"id"`
	Path  string  `json:"path"`
	Score float32 `json:"score"`
}

type EmbeddingResponse struct {
	Vector []float32 `json:"v"`
}
