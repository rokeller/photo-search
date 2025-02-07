module github.com/rokeller/photo-search/srv/web

go 1.22.7

toolchain go1.23.3

require (
	github.com/coreos/go-oidc/v3 v3.12.0
	github.com/disintegration/imaging v1.6.2 // direct
	github.com/golang/glog v1.2.4 // direct
	github.com/gorilla/mux v1.8.1 // direct
	github.com/qdrant/go-client v1.13.0 // direct
	google.golang.org/grpc v1.70.0 // direct
)

require gopkg.in/yaml.v3 v3.0.1

require (
	github.com/go-jose/go-jose/v4 v4.0.4 // indirect
	golang.org/x/crypto v0.31.0 // indirect
	golang.org/x/image v0.23.0 // indirect
	golang.org/x/net v0.33.0 // indirect
	golang.org/x/oauth2 v0.24.0 // indirect
	golang.org/x/sys v0.28.0 // indirect
	golang.org/x/text v0.21.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20241219192143-6b3ec007d9bb // indirect
	google.golang.org/protobuf v1.36.0 // indirect
)
