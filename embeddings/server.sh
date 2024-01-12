#!/bin/bash

SCRIPT_DIR=$(dirname $0)
. $SCRIPT_DIR/setup.sh

python $SCRIPT_DIR/server.py

deactivate
