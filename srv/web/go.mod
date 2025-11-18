module github.com/rokeller/photo-search/srv/web

go 1.24.0

toolchain go1.24.1

require (
	github.com/coreos/go-oidc/v3 v3.16.0
	github.com/disintegration/imaging v1.6.2 // direct
	github.com/golang/glog v1.2.5 // direct
	github.com/gorilla/mux v1.8.1 // direct
	github.com/qdrant/go-client v1.16.0 // direct
	google.golang.org/grpc v1.76.0 // direct
)

require gopkg.in/yaml.v3 v3.0.1

require (
	github.com/go-jose/go-jose/v4 v4.1.3 // indirect
	golang.org/x/image v0.25.0 // indirect
	golang.org/x/net v0.47.0 // indirect
	golang.org/x/oauth2 v0.30.0 // indirect
	golang.org/x/sys v0.38.0 // indirect
	golang.org/x/text v0.31.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20251111163417-95abcf5c77ba // indirect
	google.golang.org/protobuf v1.36.10 // indirect
)
