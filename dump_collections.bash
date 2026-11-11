#!/bin/bash

#
# dump_collections.bash dumps every dataset collection (*.ds) in the current
# directory to a JSON Lines file and archives the result as
# cold_collections.zip.
#
# Usage:
#
#   ./dump_collections.bash
#
# Every collection is attempted, in sorted order. A dump is written to a
# temporary file and moved into place only when `dataset dump` succeeds, so a
# failure never leaves a partial .jsonl. The archive holds exactly the files
# this run dumped (not stale .jsonl from an earlier run), is built beside the
# real name and moved into place only when `zip` succeeds, and is not built at
# all when any dump failed: a partial archive must not pass for a complete one.
# The successful .jsonl files stay on disk either way.
#
# Exit status (workspace DR-0014):
#
#   0   every collection dumped and the archive was written (or there was
#       nothing to dump)
#   2   a command-line argument was given; nothing was attempted
#   74  a dump or the archive failed; the counts and the failed names are
#       printed first
#

if [ "$#" -ne 0 ]; then
    echo "usage: dump_collections.bash (takes no arguments)" >&2
    exit 2
fi

dumped=()
failed=()

while IFS= read -r C_NAME; do
    [ -n "${C_NAME}" ] || continue
    JSONL_NAME="$(basename "${C_NAME}" ".ds").jsonl"
    TMP_NAME="${JSONL_NAME}.tmp.$$"
    echo "${C_NAME} -> ${JSONL_NAME}"
    if dataset dump "${C_NAME}" >"${TMP_NAME}" && mv -- "${TMP_NAME}" "${JSONL_NAME}"; then
        dumped+=("${JSONL_NAME}")
    else
        rm -f -- "${TMP_NAME}"
        echo "dump failed: ${C_NAME}" >&2
        failed+=("${C_NAME}")
    fi
done < <(find ./ -maxdepth 1 -type d -name '*.ds' | sort)

echo "${#dumped[@]} dumped, ${#failed[@]} failed"

if [ "${#failed[@]}" -ne 0 ]; then
    echo "not archiving: ${#failed[@]} dump(s) failed: ${failed[*]}" >&2
    exit 74
fi

if [ "${#dumped[@]}" -eq 0 ]; then
    exit 0
fi

echo "Archiving the JSONL files"
TMP_ZIP="tmp.$$.cold_collections.zip"
if zip -q "${TMP_ZIP}" -- "${dumped[@]}" && mv -- "${TMP_ZIP}" cold_collections.zip; then
    exit 0
fi
rm -f -- "${TMP_ZIP}"
echo "archive failed: cold_collections.zip" >&2
exit 74
