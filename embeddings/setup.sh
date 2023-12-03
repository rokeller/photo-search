#!/bin/bash

# Remember to dot-source this file (. setup.sh OR source setup.sh)
# The environment doesn't work well otherwise.

SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
BASE_DIR=$SCRIPT_DIR/..
VENV_DIR=$BASE_DIR/embeddings.env

echo "Creating python virtual environment in $(realpath $VENV_DIR) ..."

python3 -m venv $VENV_DIR

set -e
source $VENV_DIR/bin/activate
set +e

python3 -m pip install -U sentence-transformers bottle Pillow

echo 'Environment set up. Run `deactivate` to deactivate.'
