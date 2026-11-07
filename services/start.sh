#!/bin/sh
set -eu
python bootstrap.py
exec "$@" --port "${API_PORT:?API_PORT is required}"