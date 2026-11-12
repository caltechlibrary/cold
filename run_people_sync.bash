#!/bin/bash
#
# run_people_sync.bash runs the COLD/RDM people sync (cold#122, DR-0032) for the
# report runner, for cron and by hand. It is a shim: the work is done by
# bin/people_sync (people_sync.ts).
#
# Usage:
#
#   ./run_people_sync.bash          sync everyone
#   ./run_people_sync.bash CLPID    sync one person
#
# Environment:
#
#   PEOPLE_SYNC_ENV      the env file naming the target. REQUIRED: there is no default, so
#                        a run never targets an RDM by accident (exit 78 without it)
#   PEOPLE_SYNC_TRIGGER  who started it: human or cron (recorded on the run);
#                        set by hand, it wins over COLD_TRIGGER
#   COLD_TRIGGER         the same, set by the report runner from the request
#   COLD_REQUEST_ID      the report request that started it (set by the report
#                        runner, recorded on the run)
#
# The env file's PEOPLE_SYNC_MODE decides whether anything is written to RDM:
# dry-run (the default) or apply. Exit codes are people_sync's; see --help.
#

if [ -d /Sites/cold ]; then cd /Sites/cold || exit 66; else cd "$(dirname "$0")" || exit 66; fi

if [ -z "${PEOPLE_SYNC_ENV:-}" ]; then
    echo "run_people_sync.bash: PEOPLE_SYNC_ENV is not set. It names the env file for the target RDM (for example caltechauthors.env) and there is no default; set it in the environment of the report runner or cron." >&2
    exit 78
fi

ARGS=(--env "${PEOPLE_SYNC_ENV}" --trigger "${PEOPLE_SYNC_TRIGGER:-${COLD_TRIGGER:-unknown}}")
if [ -n "${COLD_REQUEST_ID:-}" ]; then ARGS+=(--request-id "${COLD_REQUEST_ID}"); fi
if [ -n "${1:-}" ]; then ARGS+=(--scope "$1"); fi

if [ -x ./bin/people_sync ]; then
    exec ./bin/people_sync "${ARGS[@]}"
fi
exec deno run --allow-read --allow-write --allow-net --allow-run --allow-env people_sync.ts "${ARGS[@]}"
