# Build Client
FROM node:20-alpine AS client

WORKDIR /src

# First, let's restore packages.
COPY client/package.json ./
COPY client/yarn.lock ./
RUN yarn install

# Now let's build the client bundles.
COPY client ./
ARG APP_VERSION
RUN VITE_APP_VERSION=${APP_VERSION} yarn build

# Build Server
FROM golang:1-alpine AS server

WORKDIR /src

# First, let's fetch dependencies.
COPY srv/web/go.* ./
RUN go mod download

# Now let's build the web server binaries.
COPY srv/web .
RUN CGO_ENABLED=0 go build -a -ldflags '-s -w'

# CA certs - we need a decent set of CA certificates so outgoing TLS channels
# can successfully be established on the below image from scratch.
FROM alpine as certs

# Build the final image
FROM scratch

USER 1000:1000
WORKDIR /app
ENTRYPOINT [ "./web" ]
EXPOSE 8080/tcp

COPY --link --from=alpine /etc/ssl/certs /etc/ssl/certs
COPY --link --from=server /src/web /app
COPY --link --from=client /src/dist /app/dist
