# Photo Search by flrx39.net

This repository holds everything needed to run a browser GUI offering semantic
search for your own photos.

## High-level Overview

Photo Search comes with a few separate components.

* An _indexing script_ ([`embeddings/index-photos.py`](embeddings/index-photos.py))
  that calculates vector embeddings for photos and sends these embeddings to an
  _indexing server_. This is designed to be run directly on a machine with decent
  hardware (and a GPU) to get fast indexing.
* A minimal _embedding server script_ ([`embeddings/server.py`](embeddings/server.py))
  that calculates vector embeddings for multi-lingual natural language queries
  such that these queries can be matched with embeddings calculated for photos.
  This is designed to be run directly on a machine with decent hardware (and a
  GPU) to get fast embedding creation.
* An executable _web server_ ([`srv/web/`](srv/web/)) written in go that offers
  HTTP endpoints for the above mentioned _indexing server_ as well as endpoints
  to search and retrieve photos from the browser GUI. This is designed to be
  run inside a Kubernetes cluster with access to the embedding server.
* A modern _browser GUI_ ([`client/`](client/)) written largely in TypeScript
  and using react that uses the above web server to search and retrieve the
  photos. This is designed to run a Kubernetes cluster.

## How to run

More to come here.
