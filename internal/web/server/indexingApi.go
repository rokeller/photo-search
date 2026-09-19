package server

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/rokeller/photo-search/internal/web/models"
	"k8s.io/klog/v2"
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

	mux.HandleFunc("/_health/{type}", HealthHandler).Methods(http.MethodGet)

	internalCtx := internalServerContext{
		serverContext: ctx,
	}
	internalCtx.addV1API(mux.PathPrefix("/v1").Subrouter())

	return srv
}

func (c internalServerContext) addV1API(mux *mux.Router) {
	mux.HandleFunc("/index", c.handleV1GetIndex).
		Methods(http.MethodGet)

	mux.HandleFunc("/index", c.handleV1PostToIndex).
		Methods(http.MethodPost).
		HeadersRegexp("Content-Type", "(text|application)/json")

	mux.HandleFunc("/index/remove", c.handleV1DeleteFromIndex).
		Methods(http.MethodPost).
		HeadersRegexp("Content-Type", "(text|application)/json")
}

func (c internalServerContext) handleV1GetIndex(w http.ResponseWriter, r *http.Request) {
	offsetStr := r.URL.Query().Get("offset")
	pageSizeStr := r.URL.Query().Get("size")

	w.Header().Add("content-type", "application/json; charset=utf-8")

	var offset *string
	var pageSize uint32
	if offsetStr != "" {
		offset = &offsetStr
	}
	if pageSizeStr != "" {
		pageSizeUi64, err := strconv.ParseUint(pageSizeStr, 10, 32)
		if err != nil {
			klog.ErrorS(err, "Failed to parse page size", "str", pageSizeStr)
		} else {
			pageSize = uint32(pageSizeUi64)
		}
	}
	if pageSize <= 0 {
		pageSize = 100
	}

	res, err := c.getPhotoPaths(pageSize, offset, r.Context())
	if err != nil {
		klog.ErrorS(err, "Failed to get paths", "pageSize", pageSize, "offset", offset)
		w.WriteHeader(500)
		json.NewEncoder(w).Encode(err)
	} else {
		w.WriteHeader(200)
		json.NewEncoder(w).Encode(res)
	}
}

func (c internalServerContext) handleV1PostToIndex(w http.ResponseWriter, r *http.Request) {
	req := &models.IndexRequest{}
	decoder := json.NewDecoder(r.Body)
	decoder.UseNumber()
	decoder.Decode(req)

	w.Header().Add("content-type", "application/json; charset=utf-8")

	if err := c.upsert(req.Items); err != nil {
		klog.ErrorS(err, "Failed to upsert items", req.Items)
		w.WriteHeader(500)
		json.NewEncoder(w).Encode(err)
	} else {
		klog.V(1).InfoS("Successfully upserted items", "num", len(req.Items), "items", req.Items)
		w.WriteHeader(200)
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
	}
}

func (c internalServerContext) handleV1DeleteFromIndex(w http.ResponseWriter, r *http.Request) {
	req := &models.DeleteFromIndexRequest{}
	decoder := json.NewDecoder(r.Body)
	decoder.Decode(req)

	w.Header().Add("content-type", "application/json; charset=utf-8")

	if err := c.delete(req.Items); err != nil {
		klog.ErrorS(err, "Failed to delete photos from index", "paths", req.Items)
		w.WriteHeader(500)
		json.NewEncoder(w).Encode(err)
	} else {
		klog.V(1).InfoS("Successfully deleted photos", "num", len(req.Items), "paths", req.Items)
		w.WriteHeader(200)
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
	}
}
