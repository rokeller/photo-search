package main

import (
	"encoding/json"
	"fmt"
	"io"
)

var (
	EmbeddingServerUnavailable = error(&photoSearchError{
		code:        "embedding_server_unavailable",
		message:     "embedding server unavailable",
		recoverable: true})
	VectorDatabaseUnavailable = error(&photoSearchError{
		code:        "vector_database_unavailable",
		message:     "vector database unavailable",
		recoverable: true})
)

type photoSearchError struct {
	code        string
	message     string
	recoverable bool
}

func (e *photoSearchError) Error() string {
	return fmt.Sprintf("%s (code = %s, recoverable = %t)",
		e.message, e.code, e.recoverable)
}

func (e *photoSearchError) WriteJson(w io.Writer) {
	_ = json.NewEncoder(w).Encode(map[string]any{
		"code":    e.code,
		"message": e.message,
	})
}
