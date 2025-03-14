module github.com/rokeller/photo-search/srv/web

go 1.23.0

toolchain go1.24.1

require (
	github.com/coreos/go-oidc/v3 v3.13.0
	github.com/disintegration/imaging v1.6.2 // direct
	github.com/golang/glog v1.2.4 // direct
	github.com/gorilla/mux v1.8.1 // direct
	github.com/qdrant/go-client v1.13.0 // direct
	google.golang.org/grpc v1.71.0 // direct
)

require gopkg.in/yaml.v3 v3.0.1

require (
	github.com/go-jose/go-jose/v4 v4.0.5 // indirect
	golang.org/x/crypto v0.36.0 // indirect
	golang.org/x/image v0.25.0 // indirect
	golang.org/x/net v0.37.0 // indirect
	golang.org/x/oauth2 v0.28.0 // indirect
	golang.org/x/sys v0.31.0 // indirect
	golang.org/x/text v0.23.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20250313205543-e70fdf4c4cb4 // indirect
	google.golang.org/protobuf v1.36.5 // indirect
)
