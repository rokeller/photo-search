# Build Client
FROM node:22-alpine AS client

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /src

# First, let's restore packages.
COPY client/package.json ./
COPY client/pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the client bundles.
COPY client ./
ARG APP_VERSION
RUN VITE_APP_VERSION=${APP_VERSION} pnpm run build

# Build Server
FROM golang:1-alpine AS server

WORKDIR /src

# Now let's build the web server binaries.
COPY srv/web .
RUN --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 \
    go build -a -ldflags '-s -w'

# CA certs - we need a decent set of CA certificates so outgoing TLS channels
# can successfully be established on the below image from scratch.
FROM alpine AS certs

# Build the final image
FROM scratch

USER 1000:1000
WORKDIR /app
ENTRYPOINT [ "./web" ]
EXPOSE 8080/tcp

COPY --link --from=alpine /etc/ssl/certs /etc/ssl/certs
COPY --link --from=server /src/web /app
COPY --link --from=client /src/dist /app/dist
