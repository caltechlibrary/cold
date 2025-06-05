#!/bin/bash

#
# Dump the dataset collections to corresponding JSON line files.
#
ls -1 -d *.ds | while read C_NAME; do
  JSONL_NAME="$(basename "${C_NAME}" ".ds").jsonl"
  echo "${C_NAME} -> ${JSONL_NAME}";
  dataset dump "${C_NAME}" >"${JSONL_NAME}"
done
echo "Archiving the JSONL files"
zip cold_collections.zip *.jsonl
