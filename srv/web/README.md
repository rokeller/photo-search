# Photo Search API Server

This is the web server offering the Photo Search APIs required by the GUI, as
well as the internal indexing API required by the
[`index-photos.py`](/embeddings/index-photos.py) script.

The server does not manage the vectors and photo metadata itself. Instead, it
relies on [qdrant](https://qdrant.tech) for doing so. You then need to pass
the address (host name/IP and port) of qdrant the gRPC endpoint to the web
server using the `--qdrant-addr` flag. For example:

```bash
web --qdrant-addr photo-search:6334
```

## qdrant installation

You need to install `qdrant`. It's easy to do so using `helm` and an existing
Kubernetes cluster.

```bash
# if the qdrant helm repo isn't added yet:
helm repo add qdrant https://qdrant.github.io/qdrant-helm

helm repo update
helm upgrade -i photo-search qdrant/qdrant
```
