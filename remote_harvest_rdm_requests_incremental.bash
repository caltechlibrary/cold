#!/bin/bash

# remote_harvest_rdm_requests_incremental.bash
#
# Keeps rdm_requests.ds current between full harvests. Runs frequently; the
# full harvest runs nightly.
#
# Three passes, each producing its own JSON-L file and each upserted
# (DR-0013). Nothing here ever wipes the collection.
#
#   1. Every currently-submitted request, unconditionally. The set is small --
#      about 918 rows -- so re-harvesting all of it costs less than detecting
#      which are new, and a failed run leaves nothing to reconcile.
#
#   2. Everything changed since the watermark, selected BY PARENT. A new
#      version is a new row, and a deleted version makes the target fall back
#      to an older row whose timestamp is old, so asking "did the joined
#      version move" misses both. Asking "did any version of this parent move"
#      does not (DR-0015).
#
#   3. A prune: requests that have left the states librarians care about, and
#      records whose parent has lost its last present version.
#
# The watermark is read once and every pass uses that one value, less a short
# overlap applied in SQL. rdm_requests_lastmod.txt is rewritten only after all
# three passes succeed (DR-0014 decision 5), so a failure re-covers the same
# window on the next run rather than skipping it. Upserts make re-harvesting a
# row harmless, which is what makes that safe rather than merely cautious.
#
# Usage: remote_harvest_rdm_requests_incremental.bash [path_to_env_file]
#
# Env file variables:
#   RDM_HOST       SSH hostname for the RDM deployment
#   RDM_URL        public base URL, used to build record and request links
#   CONTAINER_NAME name of the Postgres docker container
#   RDM_DBNAME     database name, also used as the Postgres username

WORK_DIR=$(dirname "$0")
if [ "${WORK_DIR}" != "" ]; then
    cd "${WORK_DIR}" || exit 1
fi

C_NAME="rdm_requests.ds"
C_TABLE="rdm_requests"
LASTMOD_FILE="rdm_requests_lastmod.txt"

if [ ! -f "rdm_requests_harvest_sql.bash" ]; then
    echo "Error: rdm_requests_harvest_sql.bash not found beside $(basename "$0")."
    exit 1
fi
# shellcheck source=rdm_requests_harvest_sql.bash
. ./rdm_requests_harvest_sql.bash

usage() {
    APP_NAME="$(basename "$0")"
    cat <<TXT

# NAME

${APP_NAME}

# SYNOPSIS

${APP_NAME} [OPTIONS] <path_to_env_file>

# DESCRIPTION

Incremental harvest of CaltechAUTHORS RDM requests into ${C_NAME}.

Reads the timestamp in ${LASTMOD_FILE}, runs three passes against the remote
RDM Postgres, and upserts the results. Pass one re-harvests every
currently-submitted request. Pass two harvests everything whose record changed
since the watermark, selected by parent so that a newly published version or a
deleted version is caught. Pass three removes rows for requests that have been
cancelled or declined and for records whose parent is now wholly deleted.

The collection is never emptied. ${LASTMOD_FILE} is rewritten only after all
three passes succeed, so an interrupted run re-covers its window next time.

Run frequently via cron. remote_harvest_rdm_requests_full.bash must have run
at least once first, to create the collection and the watermark.

Env file variables:
  RDM_HOST       remote machine name used to reach the RDM instance
  RDM_URL        public base URL of the RDM instance, used in record links
  CONTAINER_NAME RDM's Postgres runs in a docker container; this names it
  RDM_DBNAME     database name and username used by RDM inside the container

# OPTIONS

-h, --help, help
: Display this help message

# EXAMPLE

~~~
${APP_NAME} caltechauthors.env
~~~

TXT
    exit 0
}

if [[ "$1" == "-h" || "$1" == "--help" || "$1" == "help" ]]; then
    usage
fi

if [ $# -eq 0 ]; then
    read -r -p "No .env file provided. Enter the path to your .env file: " ENV_FILE
    if [ -z "$ENV_FILE" ]; then
        echo "Error: No .env file path provided."
        exit 1
    fi
else
    ENV_FILE="$1"
fi

get_env_var() {
    local var_name="$1"
    if [ -f "$ENV_FILE" ]; then
        grep "^${var_name}=" "$ENV_FILE" | cut -d '=' -f 2- | head -n 1
    fi
}

RDM_HOST="$(get_env_var "RDM_HOST")"
RDM_URL="$(get_env_var "RDM_URL")"
CONTAINER_NAME="$(get_env_var "CONTAINER_NAME")"
RDM_DBNAME="$(get_env_var "RDM_DBNAME")"

if [ -z "$RDM_HOST" ] || [ -z "$RDM_URL" ] || [ -z "$CONTAINER_NAME" ] || [ -z "$RDM_DBNAME" ]; then
    echo "Error: RDM_HOST, RDM_URL, CONTAINER_NAME and RDM_DBNAME must all be set in ${ENV_FILE}."
    exit 1
fi

if [ ! -d "${C_NAME}" ]; then
    echo "Error: ${C_NAME} does not exist. Run remote_harvest_rdm_requests_full.bash first."
    exit 1
fi

if [ ! -f "${LASTMOD_FILE}" ]; then
    echo "Error: ${LASTMOD_FILE} not found. Run remote_harvest_rdm_requests_full.bash first."
    exit 1
fi

WATERMARK="$(cat "${LASTMOD_FILE}")"
if [ -z "${WATERMARK}" ]; then
    echo "Error: ${LASTMOD_FILE} is empty."
    exit 1
fi

echo "RDM_HOST:  ${RDM_HOST}"
echo "watermark: ${WATERMARK} (less ${RDM_WATERMARK_OVERLAP} of overlap)"

#shellcheck disable=SC2029
CONTAINER_ID="$(ssh "${RDM_HOST}" "docker ps --filter 'name=${CONTAINER_NAME}' --format '{{.ID}}'")"
if [ -z "${CONTAINER_ID}" ]; then
    echo "Error: no running container matching '${CONTAINER_NAME}' on ${RDM_HOST}."
    exit 1
fi
echo "CONTAINER_ID -> ${CONTAINER_ID}"

# run_remote_query SQL_FILE OUT_FILE -- ship the SQL to the RDM host, run it
# through psql inside the container, bring the result back.
run_remote_query() {
    local sql_file="$1" out_file="$2"
    local cmd_file="docker_cmd_${sql_file%.sql}.bash"

    cat <<CMD >"${cmd_file}"

docker cp "${sql_file}" "${CONTAINER_ID}:${sql_file}"

docker exec -i ${CONTAINER_ID} \
  psql --username ${RDM_DBNAME} ${RDM_DBNAME} -f ${sql_file} -t -A -F \$'\t' \
  >${out_file}

CMD

    scp -q "${cmd_file}" "${sql_file}" "${RDM_HOST}":./ || return 1
    #shellcheck disable=SC2029
    ssh "${RDM_HOST}" "bash ${cmd_file}" || return 1
    scp -q "${RDM_HOST}":"${out_file}" ./ || return 1
    return 0
}

# --- Pass 1: every currently-submitted request ------------------------------

echo
echo "Pass 1: all currently-submitted requests ..."
emit_harvest_sql "${RDM_URL}" "AND fr.status = 'submitted'" >rdm_requests_pass1.sql || exit 1
run_remote_query rdm_requests_pass1.sql rdm_requests_pass1.jsonl || exit 1

if ! load_jsonl_verified "${C_NAME}" "${C_TABLE}" rdm_requests_pass1.jsonl; then
    echo "Pass 1 failed. Watermark not advanced."
    exit 1
fi
echo "Pass 1: ${LOAD_TOUCHED} submitted requests upserted."

# --- Pass 2: everything changed since the watermark, by parent --------------

echo
echo "Pass 2: records changed since the watermark ..."
emit_harvest_sql "${RDM_URL}" "$(emit_changed_since_predicate "${WATERMARK}")" \
    >rdm_requests_pass2.sql || exit 1
run_remote_query rdm_requests_pass2.sql rdm_requests_pass2.jsonl || exit 1

if ! load_jsonl_verified "${C_NAME}" "${C_TABLE}" rdm_requests_pass2.jsonl; then
    echo "Pass 2 failed. Watermark not advanced."
    exit 1
fi
echo "Pass 2: ${LOAD_TOUCHED} changed records upserted."

# --- Pass 3: prune ----------------------------------------------------------

echo
echo "Pass 3: pruning ..."
emit_prune_keys_sql "${WATERMARK}" >rdm_requests_pass3.sql || exit 1
run_remote_query rdm_requests_pass3.sql rdm_requests_pass3.keys || exit 1

PRUNED=0
MISSING=0
while IFS= read -r key; do
    [ -z "${key}" ] && continue
    if dataset delete "${C_NAME}" "${key}" 2>/dev/null; then
        PRUNED=$((PRUNED + 1))
    else
        # Expected and harmless: most cancelled or declined requests were never
        # harvested in the first place, so there is nothing to delete.
        MISSING=$((MISSING + 1))
    fi
done <rdm_requests_pass3.keys
echo "Pass 3: ${PRUNED} rows removed, ${MISSING} keys were not in the collection."

# --- Watermark, only now ----------------------------------------------------

date -u +"%Y-%m-%d %H:%M:%S" >"${LASTMOD_FILE}"
echo
echo "All three passes succeeded. Watermark advanced in ${LASTMOD_FILE}."
