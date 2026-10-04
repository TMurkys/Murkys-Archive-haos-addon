#!/usr/bin/env bash
set -eu

cd /app
mkdir -p /data

export PORT="${PORT:-8099}"
export DATA_DIR="${DATA_DIR:-/data}"

node server.js
