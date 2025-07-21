module github.com/rokeller/photo-search/srv/web

go 1.23.0

toolchain go1.24.1

require (
	github.com/coreos/go-oidc/v3 v3.14.1
	github.com/disintegration/imaging v1.6.2 // direct
	github.com/golang/glog v1.2.5 // direct
	github.com/gorilla/mux v1.8.1 // direct
	github.com/qdrant/go-client v1.15.0 // direct
	google.golang.org/grpc v1.74.0 // direct
)

require gopkg.in/yaml.v3 v3.0.1

require (
	github.com/go-jose/go-jose/v4 v4.0.5 // indirect
	golang.org/x/crypto v0.38.0 // indirect
	golang.org/x/image v0.25.0 // indirect
	golang.org/x/net v0.40.0 // indirect
	golang.org/x/oauth2 v0.30.0 // indirect
	golang.org/x/sys v0.33.0 // indirect
	golang.org/x/text v0.25.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20250528174236-200df99c418a // indirect
	google.golang.org/protobuf v1.36.6 // indirect
)
