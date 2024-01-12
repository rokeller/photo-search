package main

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/golang/glog"
)

type spaHandler struct {
	staticPath string
	indexPath  string
}

// ServeHTTP inspects the URL path to locate a file within the static dir
// on the SPA handler. If a file is found, it will be served. If not, the
// file located at the index path on the SPA handler will be served.
func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Join cleans results to prevent directory traversal.
	path := filepath.Join(h.staticPath, r.URL.Path)
	glog.V(2).Infof("ServeStatic: %s (%s)", path, r.URL.Path)

	// Check if there's a file at the given path.
	fi, err := os.Stat(path)
	if os.IsNotExist(err) || fi.IsDir() {
		// No dice, serve index.html instead, with 1d caching.
		w.Header().Add("cache-control", "max-age=86400")
		http.ServeFile(w, r, filepath.Join(h.staticPath, h.indexPath))
		return
	} else if err != nil {
		// An error we haven't account for, respond with HTTP 500.
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// All good, let's serve the static file.
	if strings.HasPrefix(r.URL.Path, "/assets/") {
		// Assets have hashes in their names, so a new version produces a new asset.
		w.Header().Add("cache-control", "max-age=31556736, immutable")
	} else {
		// Non-assets like the index.html could change per release, but still
		// deserve some caching.
		w.Header().Add("cache-control", "max-age=86400")
	}
	http.FileServer(http.Dir(h.staticPath)).ServeHTTP(w, r)
}
