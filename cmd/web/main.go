package main

import (
	"errors"
	"flag"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/rokeller/photo-search/internal/web/server"
	"k8s.io/klog/v2"
)

var (
	qdrantAddr = flag.String("qdrant-addr", "qdrant:6334",
		"The address of the qdrant server to connect to.")
	qdrantColl = flag.String("qdrant-coll", "photos",
		"The name of the qdrant collection to use.")
	embeddingsServiceBaseUrl = flag.String("mbed", "http://localhost:8082/",
		"The base address of the service calculating embeddings for queries.")
	photosRootDir = flag.String("photos", "",
		"The root directory where the photos are located.")
	spaRootDir = flag.String("spa-dir", "dist",
		"The path to the SPA root directory.")
	configPath = flag.String("oauth-config", "config/oauth.yaml",
		"The path to the oauth.yaml config file.")
)

func main() {
	klog.InitFlags(nil)
	flag.Parse()
	defer klog.Flush()
	klog.InfoS("Trying to connect to qdrant", "server", *qdrantAddr, "collection", *qdrantColl)

	srv, err := server.NewServerContext(*qdrantAddr,
		*qdrantColl,
		*embeddingsServiceBaseUrl,
		*photosRootDir,
		*configPath,
		*spaRootDir,
	)
	if nil != err {
		klog.Exitf("Failed to connect to qdrant collection: %v", err)
	}
	defer srv.Close()

	publicSrv := server.NewPublicServer(srv)
	internalSrv := server.NewInternalServer(srv)

	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGTERM, syscall.SIGINT)

	klog.InfoS("Starting public HTTP server", "addr", publicSrv.Addr)
	go serveHTTP(publicSrv)

	klog.InfoS("Starting internal HTTP server", "addr", internalSrv.Addr)
	go serveHTTP(internalSrv)

	defer internalSrv.Close()
	defer publicSrv.Close()

	s := <-c
	klog.InfoS("Done", "signal", s)
}

func serveHTTP(server *http.Server) {
	if err := server.ListenAndServe(); nil != err {
		if errors.Is(err, http.ErrServerClosed) {
			klog.InfoS("Server successfully shut down", "addrd", server.Addr)
			return
		}

		klog.Exitf("Failed to listen at '%s': %v", server.Addr, err)
	}
}
