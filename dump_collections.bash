#!/bin/bash

#
# Dump the dataset collections to corresponding JSON line files.
#
find ./ -maxdepth 1 -type d |
    grep -E '\.ds$' |
    while read -r C_NAME; do
        JSONL_NAME="$(basename "${C_NAME}" ".ds").jsonl"
        echo "${C_NAME} -> ${JSONL_NAME}"
        dataset dump "${C_NAME}" >"${JSONL_NAME}"
    done
echo "Archiving the JSONL files"
zip cold_collections.zip -- *.jsonl
