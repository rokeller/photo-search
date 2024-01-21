package main

import (
	"encoding/json"
	"errors"
	"image"
	"image/jpeg"
	"net/http"
	"path"
	"strconv"

	"github.com/disintegration/imaging"
	"github.com/golang/glog"
	"github.com/gorilla/mux"
	"github.com/rokeller/photo-search/srv/web/models"
)

type publicServerContext struct {
	*serverContext
}

func NewPublicServer(ctx *serverContext) *http.Server {
	mux := mux.NewRouter()
	srv := &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}

	publicCtx := publicServerContext{
		serverContext: ctx,
	}

	wellKnownRouter := mux.PathPrefix("/.well-known").Subrouter()
	publicCtx.addWellKnown(wellKnownRouter)

	apiRouter := mux.PathPrefix("/api/v1").Subrouter()
	authMiddleware := NewAuthenticationMiddleware(
		ctx.oauthSettings.Audience,
		ctx.oauthSettings.Issuer,
	)
	// The APIs require authentication.
	apiRouter.Use(authMiddleware.Middleware)
	publicCtx.addV1API(apiRouter)

	spa := spaHandler{staticPath: "dist", indexPath: "index.html"}
	mux.PathPrefix("/").Handler(spa)

	return srv
}

func (c publicServerContext) addWellKnown(mux *mux.Router) {
	mux.HandleFunc("/flrx39.net/photoSearch/auth/config", c.handleWellKnownAuthConfig).
		Methods("GET")
}

func (c publicServerContext) handleWellKnownAuthConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("content-type", "application/json; charset=utf-8")
	w.WriteHeader(200)
	json.NewEncoder(w).Encode(c.serverContext.oauthSettings)
}

func (c publicServerContext) addV1API(mux *mux.Router) {
	mux.HandleFunc("/photos/search", c.handleV1SearchPhotos).
		Methods("POST").
		HeadersRegexp("Content-Type", "(text|application)/json")

	mux.HandleFunc("/photos/recommend", c.handleV1RecommendPhotos).
		Methods("POST").
		HeadersRegexp("Content-Type", "(text|application)/json")

	mux.HandleFunc("/photos/{id}", c.handleV1PhotosGetById).
		Methods("GET")

	mux.HandleFunc("/photos/{id}/{width}", c.handleV1PhotosWithWidthGetById).
		Methods("GET")
}

func (c publicServerContext) handleV1SearchPhotos(w http.ResponseWriter, r *http.Request) {
	req := &models.SearchPhotosRequest{}
	json.NewDecoder(r.Body).Decode(req)

	w.Header().Add("content-type", "application/json; charset=utf-8")

	limit := uint(10)
	if nil != req.Limit {
		limit = *req.Limit
	}

	res, err := c.search(req.Query, limit, req.Offset, req.Filter)
	if nil != err {
		c.respondForError(err, w)
	} else {
		w.WriteHeader(200)
		json.NewEncoder(w).Encode(res)
	}
}

func (c publicServerContext) handleV1RecommendPhotos(w http.ResponseWriter, r *http.Request) {
	req := &models.RecommendPhotosRequest{}
	json.NewDecoder(r.Body).Decode(req)

	w.Header().Add("content-type", "application/json; charset=utf-8")

	limit := uint(10)
	if nil != req.Limit {
		limit = *req.Limit
	}

	res, err := c.recommend(req.Id, limit, req.Offset, req.Filter)
	if nil != err {
		c.respondForError(err, w)
	} else {
		w.WriteHeader(200)
		json.NewEncoder(w).Encode(res)
	}
}

func (c publicServerContext) handleV1PhotosGetById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	payload, err := c.getPayloadById(id)
	if nil != err {
		c.respondForError(err, w)
	} else {
		relPath := getPathFromPayload(payload)
		absPath := path.Join(c.photosRootDir, *relPath)
		w.Header().Add("cache-control", "max-age=31556736, immutable")
		http.ServeFile(w, r, absPath)
	}
}

func (c publicServerContext) handleV1PhotosWithWidthGetById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	widthStr := vars["width"]

	width, err := strconv.Atoi(widthStr)
	if nil != err {
		w.WriteHeader(400)
	}

	payload, err := c.getPayloadById(id)
	if nil != err {
		c.respondForError(err, w)
		return
	}

	relPath := getPathFromPayload(payload)
	absPath := path.Join(c.photosRootDir, *relPath)
	image, err := resizeImage(absPath, width)
	if nil != err {
		w.WriteHeader(500)
		return
	}

	orientation := getOrientationFromPayload(payload)
	if nil != orientation {
		// Apply the reverse transformation of the orientation in the EXIF tags
		// to put the photo into the right shape again.
		image = realignImage(image, *orientation)
	} else {
		glog.V(1).Infof("Missing 'Orientation' tag in '%s'.", *relPath)
	}

	w.Header().Add("cache-control", "max-age=31556736, immutable")
	w.Header().Add("content-type", "image/jpeg")

	jpeg.Encode(w, image, &jpeg.Options{Quality: 66})
}

func (c publicServerContext) respondForError(err error, w http.ResponseWriter) {
	var pserr *photoSearchError

	if errors.As(err, &pserr) {
		if pserr.recoverable {
			w.WriteHeader(503)
		} else {
			w.WriteHeader(500)
		}

		pserr.WriteJson(w)
	} else {
		w.WriteHeader(500)
		json.NewEncoder(w).Encode(err)
	}
}

func resizeImage(path string, newWidth int) (image.Image, error) {
	image, err := imaging.Open(path)
	if err != nil {
		glog.Errorf("Failed to open photo file '%s': %v", path, err)
		return nil, err
	}

	resized := imaging.Resize(image, newWidth, 0, imaging.Lanczos)

	return resized, nil
}

func realignImage(img image.Image, orientation int64) image.Image {
	// See https://exiftool.org/TagNames/EXIF.html
	switch orientation {
	case 1: // Normal, do nothing
		return img

	case 2: // Mirror horizontal
		return imaging.FlipH(img)

	case 3: // Rotate 180
		return imaging.Rotate180(img)

	case 4: // Mirror vertical
		return imaging.FlipV(img)

	case 5: // Mirror horizontal and rotate 270 degrees clockwise
		return imaging.FlipH(imaging.Rotate90(img))

	case 6: // Rotate 90 degrees clockwise
		return imaging.Rotate270(img) // _counter_-clockwise

	case 7: // Mirror horizontal and rotate 90 degrees clockwise
		return imaging.FlipH(imaging.Rotate270(img))

	case 8: // Rotate 270 degrees clockwise
		return imaging.Rotate90(img) // _counter_-clockwise

	default:
		return img
	}
}
