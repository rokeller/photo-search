package server

import (
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"k8s.io/klog/v2"
)

type spaHandler struct {
	staticPath string
	indexPath  string

	fs http.Handler
}

func newSpaHandler(staticPath string) spaHandler {
	return spaHandler{
		staticPath: staticPath,
		indexPath:  "index.html",

		fs: http.FileServer(http.Dir(staticPath)),
	}
}

// ServeHTTP inspects the URL path to locate a file within the static dir
// on the SPA handler. If a file is found, it will be served. If not, the
// file located at the index path on the SPA handler will be served.
func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	basePath, err := filepath.Abs(h.staticPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cleanURLPath := path.Clean("/" + r.URL.Path)
	localPath := filepath.Join(basePath, filepath.FromSlash(cleanURLPath))
	resolvedLocalPath, err := filepath.Abs(localPath)
	if err != nil {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}
	if resolvedLocalPath != basePath && !strings.HasPrefix(resolvedLocalPath, basePath+string(os.PathSeparator)) {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	klog.V(2).InfoS("Serving static file",
		"localPath", resolvedLocalPath,
		"urlPath", r.URL.Path)
	fi, err := os.Stat(resolvedLocalPath)
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
	h.fs.ServeHTTP(w, r)
}
