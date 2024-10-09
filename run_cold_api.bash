#!/bin/bash
APP_NAME="$0"
BASE_DIR="$(dirname "$0")"
CMD="/usr/local/bin/datasetd"
cd "$BASE_DIR"
$CMD cold_api.yaml
