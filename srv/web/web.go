package main

import (
	"errors"
	"flag"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/golang/glog"
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
)

func main() {
	flag.Parse()

	glog.Infof("Trying to connect to qdrant at '%s', using collection '%s' ...",
		*qdrantAddr, *qdrantColl)

	// TODO: validate flags

	srv, err := newServerContext(*qdrantAddr,
		*qdrantColl,
		*embeddingsServiceBaseUrl,
		*photosRootDir)
	if nil != err {
		glog.Exitf("Failed to connect to qdrant collection: %v", err)
	}
	defer srv.conn.Close()

	publicSrv := NewPublicServer(srv)
	internalSrv := NewInternalServer(srv)

	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGTERM, syscall.SIGINT)

	glog.Infof("Running public HTTP server at '%s' ...", publicSrv.Addr)
	go serveHTTP(publicSrv)

	glog.Infof("Running internal HTTP server at '%s' ...", internalSrv.Addr)
	go serveHTTP(internalSrv)

	defer internalSrv.Close()
	defer publicSrv.Close()

	s := <-c
	glog.V(0).Info("Got signal:", s)
}

func serveHTTP(server *http.Server) {
	if err := server.ListenAndServe(); nil != err {
		if errors.Is(err, http.ErrServerClosed) {
			glog.Infof("Server at '%s' successfully shut down.", server.Addr)
			return
		}

		glog.Exitf("Failed to listen at '%s': %v", server.Addr, err)
	}
}
