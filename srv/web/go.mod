module github.com/rokeller/photo-search/srv/web

go 1.22.7

toolchain go1.23.3

require (
	github.com/coreos/go-oidc/v3 v3.11.0
	github.com/disintegration/imaging v1.6.2 // direct
	github.com/golang/glog v1.2.3 // direct
	github.com/gorilla/mux v1.8.1 // direct
	github.com/qdrant/go-client v1.12.0 // direct
	google.golang.org/grpc v1.69.2 // direct
)

require gopkg.in/yaml.v3 v3.0.1

require (
	github.com/go-jose/go-jose/v4 v4.0.2 // indirect
	golang.org/x/crypto v0.31.0 // indirect
	golang.org/x/image v0.18.0 // indirect
	golang.org/x/net v0.30.0 // indirect
	golang.org/x/oauth2 v0.23.0 // indirect
	golang.org/x/sys v0.28.0 // indirect
	golang.org/x/text v0.21.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20241015192408-796eee8c2d53 // indirect
	google.golang.org/protobuf v1.35.1 // indirect
)
