module github.com/rokeller/photo-search/srv/web

go 1.22.2

toolchain go1.23.1

require (
	github.com/coreos/go-oidc/v3 v3.11.0
	github.com/disintegration/imaging v1.6.2 // direct
	github.com/golang/glog v1.2.2 // direct
	github.com/gorilla/mux v1.8.1 // direct
	github.com/qdrant/go-client v1.11.1 // direct
	google.golang.org/grpc v1.67.1 // direct
)

require gopkg.in/yaml.v3 v3.0.1

require (
	github.com/go-jose/go-jose/v4 v4.0.2 // indirect
	golang.org/x/crypto v0.26.0 // indirect
	golang.org/x/image v0.18.0 // indirect
	golang.org/x/net v0.28.0 // indirect
	golang.org/x/oauth2 v0.22.0 // indirect
	golang.org/x/sys v0.24.0 // indirect
	golang.org/x/text v0.17.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20240827150818-7e3bb234dfed // indirect
	google.golang.org/protobuf v1.34.2 // indirect
)
