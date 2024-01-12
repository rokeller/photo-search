package main

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	w.Header().Add("content-type", "application/json; charset=utf-8")
	w.WriteHeader(200)

	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"type":   vars["type"],
	})
}
