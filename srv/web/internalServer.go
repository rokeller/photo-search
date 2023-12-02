package main

import (
	"encoding/json"
	"net/http"

	"github.com/golang/glog"
	"github.com/gorilla/mux"
	"github.com/rokeller/photo-search/srv/web/models"
)

type internalServerContext struct {
	*serverContext
}

func NewInternalServer(ctx *serverContext) *http.Server {
	mux := mux.NewRouter()
	srv := &http.Server{
		Addr:    ":8081",
		Handler: mux,
	}

	mux.HandleFunc("/_health/{type}", HealthHandler).Methods("GET")

	internalCtx := internalServerContext{
		serverContext: ctx,
	}
	internalCtx.addV1API(mux.PathPrefix("/v1").Subrouter())

	return srv
}

func (c internalServerContext) addV1API(mux *mux.Router) {
	mux.HandleFunc("/index", c.handleV1PostIndex).
		Methods("POST").
		HeadersRegexp("Content-Type", "(text|application)/json")
}

func (c internalServerContext) handleV1PostIndex(w http.ResponseWriter, r *http.Request) {
	req := &models.IndexRequest{}
	json.NewDecoder(r.Body).Decode(req)

	w.Header().Add("content-type", "application/json; charset=utf-8")

	if err := c.upsert(req.Items); nil != err {
		glog.Errorf("Failed to insert items: %v", err)
		w.WriteHeader(500)
		json.NewEncoder(w).Encode(err)
	} else {
		glog.V(1).Infof("Successfully upserted %d item(s) ...", len(req.Items))
		w.WriteHeader(200)
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
	}
}
