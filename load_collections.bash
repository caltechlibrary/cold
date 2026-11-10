#!/bin/bash

#
# load_collections.bash replaces the dataset collections in the current directory
# with the contents of cold_collections.zip, which dump_collections.bash writes on
# the host the data came from (usually production).
#
# Usage:
#
#   [MAX_CAPACITY=N] ./load_collections.bash [overwrite]
#
# By default each collection is CLEARED and then loaded, so the result is a copy of
# the dump and no record survives that is not in it. That is the right way to take
# a copy of production data. With the word "overwrite" the collection is not
# cleared and `dataset load -overwrite` upserts instead; records that exist only
# locally then survive.
#
# MAX_CAPACITY is the per-object buffer in MB handed to `dataset load` (default 8).
# A record larger than the buffer stops the load part way through, leaving a silently
# incomplete collection, so every load is verified: the number of records in the
# collection must equal the number of lines in the dump. When that fails, raise
# MAX_CAPACITY and run again. The zip is kept, so a run is repeatable.
#
# A dump with no records is NOT allowed to clear a collection that has some, unless
# ALLOW_EMPTY=1 is set: an empty dump usually means the dump failed at the source.
#
# Only collections that exist in the current directory AND in the zip are touched.
# Everything is processed even when one fails; the exit status is that of the first
# failure, in sorted order, and the counts are printed.
#
# Exit status:
#   0   every collection loaded and verified
#   2   usage
#   66  cold_collections.zip is missing
#   74  a clear or a load failed, or the verification count did not match
#   75  datasetd is running; stop it before replacing its collections
#

MAX_CAPACITY="${MAX_CAPACITY:-8}"
MODE="clear"
case "${1:-}" in
    "") ;;
    overwrite) MODE="overwrite" ;;
    *)
        echo "usage: [MAX_CAPACITY=N] $0 [overwrite]" >&2
        exit 2
        ;;
esac

if [ ! -f cold_collections.zip ]; then
    echo "cold_collections.zip not found in $(pwd)" >&2
    exit 66
fi
if pgrep -x datasetd >/dev/null 2>&1; then
    echo "datasetd is running; stop it before replacing its collections" >&2
    exit 75
fi

LOADED=0
FAILED=0
SKIPPED=0
FIRST_RC=0
fail() {
    FAILED=$((FAILED + 1))
    if [ "$FIRST_RC" -eq 0 ]; then FIRST_RC=74; fi
}

for C_NAME in $(find . -maxdepth 1 -type d -name '*.ds' | sort); do
    C_NAME="${C_NAME#./}"
    TABLE="$(basename "${C_NAME}" ".ds")"
    JSONL_NAME="${TABLE}.jsonl"
    # -o: always take the zip's copy; -u would keep a newer, stale local file.
    if ! unzip -o -q cold_collections.zip "${JSONL_NAME}" 2>/dev/null; then
        echo "${C_NAME}: not in cold_collections.zip, left alone"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    WANT="$(wc -l <"${JSONL_NAME}" | tr -d ' ')"
    echo "${JSONL_NAME} (${WANT} records) -> ${C_NAME} [${MODE}]"
    # An empty dump over a non-empty local collection is almost always a dump that
    # failed at the source (dump_collections.bash carries on after an error), not a
    # collection that really is empty. Clearing would destroy data for nothing.
    if [ "${WANT}" = "0" ] && [ "${MODE}" = "clear" ] && [ "${ALLOW_EMPTY:-}" != "1" ]; then
        HAVE="$(dataset count "${C_NAME}" 2>/dev/null)"
        case "${HAVE}" in
            ''|*[!0-9]*)
                # dataset count prints -1 when the collection cannot be read, for
                # example a renamed directory whose table still has the old name.
                echo "${C_NAME}: the dump is empty and the local collection cannot be read (no such table?); left alone."
                SKIPPED=$((SKIPPED + 1))
                continue
                ;;
        esac
        if [ "${HAVE:-0}" != "0" ]; then
            echo "${C_NAME}: the dump is EMPTY but the local collection holds ${HAVE} records; not clearing it." >&2
            echo "${C_NAME}: if the dump is wrong, fix it at the source; to clear anyway run with ALLOW_EMPTY=1." >&2
            fail
            continue
        fi
    fi
    if [ "${MODE}" = "clear" ]; then
        if ! dsquery "${C_NAME}" "delete from ${TABLE}" >/dev/null; then
            echo "${C_NAME}: could not clear the collection" >&2
            fail
            continue
        fi
        LEFT="$(dataset count "${C_NAME}" 2>/dev/null)"
        if [ "${LEFT}" != "0" ]; then
            echo "${C_NAME}: still holds ${LEFT:-unknown} records after clearing" >&2
            fail
            continue
        fi
        LOAD_OPTS=(-max-capacity "${MAX_CAPACITY}")
    else
        LOAD_OPTS=(-overwrite -max-capacity "${MAX_CAPACITY}")
    fi
    if ! dataset load "${LOAD_OPTS[@]}" "${C_NAME}" <"${JSONL_NAME}"; then
        echo "${C_NAME}: dataset load reported failure" >&2
        fail
        continue
    fi
    GOT="$(dataset count "${C_NAME}" 2>/dev/null)"
    OK=0
    if [ "${MODE}" = "clear" ]; then
        if [ "${GOT}" = "${WANT}" ]; then OK=1; fi
    else
        if [ -n "${GOT}" ] && [ "${GOT}" -ge "${WANT}" ] 2>/dev/null; then OK=1; fi
    fi
    if [ "${OK}" -ne 1 ]; then
        echo "${C_NAME}: VERIFY FAILED, ${GOT:-unknown} records in the collection, ${WANT} in the dump." >&2
        echo "${C_NAME}: raise MAX_CAPACITY (now ${MAX_CAPACITY} MB) and run again; the collection is incomplete until then." >&2
        fail
        continue
    fi
    LOADED=$((LOADED + 1))
done

echo "loaded ${LOADED}, failed ${FAILED}, skipped ${SKIPPED}"
exit "${FIRST_RC}"
