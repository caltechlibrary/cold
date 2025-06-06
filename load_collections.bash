#!/bin/bash

OVERWRITE=""
if [ "$1" = "overwrite" ]; then
  OVERWRITE="$1";
fi

#
# Load the dataset collections to corresponding JSON line files.
#
find ./ -type d -depth 1 |
    grep -E '\.ds$' |
    while read -r C_NAME; do
        JSONL_NAME="$(basename "${C_NAME}" ".ds").jsonl"
        echo "Unarchiving ${JSONL_NAME}"
        if unzip -u cold_collections.zip "${JSONL_NAME}"; then
            echo "Wrote ${JSONL_NAME}"
            if [ -f "${JSONL_NAME}" ]; then
                echo "${JSONL_NAME} -> ${C_NAME}"
                if [ "${OVERWRITE}"  = "overwrite" ]; then
                    dataset load -overwrite "${C_NAME}" <"${JSONL_NAME}"
                else
                    dataset load "${C_NAME}" <"${JSONL_NAME}"
                fi
            fi
        else
            echo "failed to unarchive ${JSONL_NAME}"
        fi
    done
