# Photo Search by flrx39.net

GitHub Release:
[![GitHub Release](https://img.shields.io/github/v/release/rokeller/photo-search)](https://github.com/rokeller/photo-search/releases/latest)

Container images:
[![Web Docker Image Version](https://img.shields.io/docker/v/rokeller/photo-search?label=photo-search)](https://hub.docker.com/r/rokeller/photo-search)
[![Web Docker Image Size](https://img.shields.io/docker/image-size/rokeller/photo-search?label=photo-search)](https://hub.docker.com/r/rokeller/photo-search)

[![Embeddings Docker Image Version](https://img.shields.io/docker/v/rokeller/photo-search-embedding?label=photo-search-embedding)](https://hub.docker.com/r/rokeller/photo-search-embedding)
[![Embeddings Docker Image Size](https://img.shields.io/docker/image-size/rokeller/photo-search-embedding?label=photo-search-embedding)](https://hub.docker.com/r/rokeller/photo-search-embedding)


This repository holds everything needed to run a browser GUI offering semantic
search for your own photos.

## High-level Overview

Photo Search comes with a few separate components.

* An _indexing tool_ ([`indexing/src`](indexing/src)) that calculates vector
  embeddings for photos and sends these embeddings to the _indexing server_,
  which is part of the _web server_ below. This tool is designed to be run on
  a schedule (e.g. a cron job in Kubernetes), such that new photos are indexed
  periodically. The tool is built with Rust for fast and efficient indexing.
  The tool replaces the old Python-based indexing script to reduce the memory
  footprint and the amount of libraries that need downloading. The Python tool
  required around 10 GiB or more in dependencies (yuk!), the indexing tool
  (without the model, which both the script and the tool need) is around 10 MiB -
  a reduction of 99.9% or so.
* A minimal _embedding server_ ([`srv/embeddings/`](srv/embeddings/)) that
  calculates vector embeddings for multi-lingual natural language queries, such
  that these queries can be matched/compared with embeddings calculated for
  photos. This server is designed to be run inside a Kubernetes cluster right
  next to the below _web server_ and is made with Rust. It replaces the old
  Python-based embedding server to reduce the memory footprint. Initial tests
  show a memory footprint of about 40% of that of the Python-based embedding
  server.
* An executable _web server_ ([`srv/web/`](srv/web/)) that offers
  HTTP endpoints for the above mentioned _indexing server_ as well as endpoints
  to search and retrieve photos from the browser GUI. This is designed to be
  run inside a Kubernetes cluster with access to the embedding server.
* A modern _browser GUI_ ([`client/`](client/)) written largely in TypeScript
  and using react, that uses the above web server to search and retrieve the
  photos. The static assets produced for the client are designed to be served
  by the above _web server_.

Access to the GUI is only granted for authenticated users (more on this later)
such that you can enjoy searching your photos without making them available to
everybody. Future releases may allow to configure anonymous access though.

## Screenshots

Here's (a blurred) view of the photos from a sample set of about 15K photos
when searching for `French Riviera`.

![Semantic search on photos](docs/screenshot.webp)

## How to run

First of all, you need to make sure the models used to create embeddings for
photos and textual queries are available on the machines that run the _embedding
server_ and the _indexing tool_. The [.models/download.sh](.models/download.sh)
script helps you with this:

```bash
cd .models
# This requires git and git LFS:
./download.sh
```

In terms of model files, the code mostly relies on the various `model.safetensors`
files. Note that not all models on huggingface.co have pre-generated
`model.safetensor` files. Where that is not the case, one can easily convert e.g.
a `pytorch_model.bin` file to a `model.safetensors` file using Python:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('.models/clip-ViT-B-32')
model.save_pretrained('.models/clip-ViT-B-32')
```

You can run the _embedding server_ for example using the
[`photo-search-embedding` container image](https://hub.docker.com/r/rokeller/photo-search-embedding)
as follows (example):

```bash
embeddings \
  --model-path /mnt/path-to/clip-ViT-B-32-multilingual-v1 \
  --binding 127.0.0.1:8082
```

Please note that the only files from the
[`clip-ViT-B-32-multilingual-v1` Model](https://huggingface.co/sentence-transformers/clip-ViT-B-32-multilingual-v1)
that are actually needed by the embedding server are:

* `./config.json`
* `./tokenizer.json`
* `./model.safetensors`
* `./2_Dense/model.safetensors`

Run the _web server_ for example using the
[`photo-search` container image](https://hub.docker.com/r/rokeller/photo-search)
as follows (example):

```bash
web --qdrant-addr=qdrant-photos:6334 \
    --qdrant-coll=my-photos \
    --mbed=http://host-running-embedding-server:8082/ \
    --photos=/mnt/nfs/photos
```

Before the Photo Search web server can return any meaningful results, you will
need to index all your photos. This requires access to the internal REST APIs of
the _web server_ (the parameter `http://web-server:8081/`
in the example below). You can run the _indexing tool_ as follows (example):

```bash
indexing \
  --model .models/clip-ViT-B-32/0_CLIPModel \
  --photos /mnt/nfs/photos \
  --indexing-server http://host-running-web-server:8081
```

Please note that the only file from the
[`clip-ViT-B-32` Model](https://huggingface.co/sentence-transformers/clip-ViT-B-32)
that is actually needed by the indexing tool is `0_CLIPModel/model.safetensors`
(which at least the huggingface.co repo above does not have yet, but you can
convert yourself easily, see above).

> **Note**: It is important that the root path passed to indexing tool refers
    to the same directory as the path passed to the web server. This is because
    the indexing tool will use relative paths for indexed photos that will be
    stored in the vector database. If the two components cannot find photos in
    the same relative location, Photo Search won't work properly.

### Authentication

Authentication is required and cannot be turned off as of yet. This it to make
sure that running Photo Search is safe and helping you protect your privacy
out-of-the-box. The _web server_ expects a file in a subdirectory of the work
directory, called `config`, and in that directory, there needs to be a file
called `oauth.yaml`. That file must hold the configuration needed to configure
an OIDC-compliant identity provider both for use with the SPA to initiate
authentication and fetch bearer tokens, as well as for the server to know which
bearer tokens to trust.

| Item | Description | Required? |
|---|---|---|
| `clientId` | The client ID parameter to use from the SPA when authenticating with the IdP. | ✅ |
| `authority` | The authority the SPA should when authenticating with the IdP. It must provide the `.well-known/openid-configuration` endpoint for discovery. | ✅ |
| `scopes` | An array of scopes the SPA should ask for when authenticating the user. | 🚫 |
| `audience` | The audience of bearer tokens expected for authenticated users. The server will verify that the audience matches. | ✅ |
| `issuer` | The issuer of bearer tokens expected for authenticated users. The server will verify that the issuer matches. In some cases this is the same as the `authority`. | ✅ |

For example:

#### Example: Microsoft Entra ID (v2)

```yaml
clientId: 4d868f99-2918-4470-a39b-1342548c50e4
authority: https://login.microsoftonline.com/my-domain.com/
audience: api://photos.my-domain.com
issuer: https://login.microsoftonline.com/f432db16-a40f-4376-9920-65324b4a362f/v2.0
scopes:
  - api://photos.my-domain.com/Photos.Read
```

#### Example: Microsoft Entra ID (v1)

```yaml
clientId: 4d868f99-2918-4470-a39b-1342548c50e4
authority: https://sts.windows.net/f432db16-a40f-4376-9920-65324b4a362f/
audience: api://4d868f99-2918-4470-a39b-1342548c50e4
issuer: https://sts.windows.net/f432db16-a40f-4376-9920-65324b4a362f/
scopes:
  - api://4d868f99-2918-4470-a39b-1342548c50e4/Photos.Read
```

### Runtime dependencies

This section explains how details on the dependencies needed by Photo Search at
runtime are made available to the web server.

#### Qdrant vector database

Photo Search needs access to a [Qdrant](https://qdrant.tech/) vector database
(last tested with Qdrant v1.14). See
[Installation - Qdrant](https://qdrant.tech/documentation/guides/installation/)
for installation options. Once installed, you can advertise the location of the
Qdrant database to the web server by passing the following flags:

| Flag | Description | Default value |
|---|---|---|
| `--qdrant-addr=<host:port>` | Host and port of the Qdrant gRPC API. | `--qdrant-addr=qdrant:6334` |
| `--qdrant-coll=<collection>` | Name of the Qdrant collection to hold vectors and metadata for photos. | `--qdrant-coll=photos` |

#### Embeddings Server

The embedding server is needed to create embeddings for textual queries from the
GUI on your photos. To let the Photo Search web server know how to connect to
this (internal) service, the `--mbed=<base-url>` flag must be set. The default
value is `http://localhost:8082/`. The embedding server also works well when
running as another container next to the web server container in the same pod
in Kubernetes.

#### Photos storage

The web server also needs read-only access to the photos to be searched. This
is to allow limiting access only to authenticated users, and to create previews
for search results.
The root path to the photos is configured through the `--photos=<path>` flag,
which by default is left empty, so please make sure you point this to the mount
point where your photos are located.

### Run on Kubernetes

Photo Search is largely designed to run on Kubernetes, though it can run outside
of Kubernetes too.

TODO: More details on how to run on Kubernetes and outside.
