#!/bin/bash

# remote_harvest_rdm_requests_full.bash
#
# Full harvest of CaltechAUTHORS RDM requests into rdm_requests.ds. Upserts
# every harvested row and then sweeps whatever it did not touch, so a failed
# load leaves the collection stale but whole rather than half empty (DR-0017).
# Intended for a nightly cron entry and for initial setup;
# remote_harvest_rdm_requests_incremental.bash keeps the collection current
# between runs.
#
# Replaces remote_harvest_rdm_review_queue.bash and
# remote_harvest_rdm_review_submissions.bash, which harvested the same
# collection with two different field sets and left its contents dependent on
# which script ran last. See DR-0013.
#
# The SQL body lives in rdm_requests_harvest_sql.bash, shared with the incremental
# (DR-0014 decision 8). Metadata is taken from each record's newest present
# version rather than from the version the request named (DR-0015).
#
# Usage: remote_harvest_rdm_requests_full.bash [path_to_env_file]
#
# Env file variables:
#   RDM_HOST       SSH hostname for the RDM deployment
#   RDM_URL        public base URL, used to build record and request links
#   CONTAINER_NAME name of the Postgres docker container
#   RDM_DBNAME     database name, also used as the Postgres username
#
# After a successful run the current UTC timestamp is written to
# rdm_requests_lastmod.txt for the incremental harvest to use as its watermark.

WORK_DIR=$(dirname "$0")
if [ "${WORK_DIR}" != "" ]; then
    cd "${WORK_DIR}" || exit 1
fi

C_NAME="rdm_requests.ds"
C_TABLE="rdm_requests"
LASTMOD_FILE="rdm_requests_lastmod.txt"
SQL_FILE="rdm_requests_full.sql"
JSONL_FILE="rdm_requests_full.jsonl"
CMD_FILE="docker_cmd_rdm_requests_full.bash"

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

Full harvest of CaltechAUTHORS RDM requests into ${C_NAME}.

${APP_NAME} generates SQL and a docker command file, copies both to the
remote RDM host, runs the query through psql inside the Postgres container,
retrieves the resulting JSON-L, upserts every record into ${C_NAME} and then
deletes the rows this harvest did not touch. It never empties the collection:
if the load is incomplete, nothing is swept and the previous contents stand.

The collection holds one row per community-submission request in a state
librarians care about, keyed by the record id the request named. Metadata
comes from that record's newest version that has not been deleted, so a
record edited by publishing a new version reads as its current self rather
than as the version originally submitted.

Run nightly via cron, and once before the first incremental harvest.
remote_harvest_rdm_requests_incremental.bash keeps the collection current
in between.

Env file variables:
  RDM_HOST       remote machine name used to reach the RDM instance, for
                 example the name of the AWS load balancer
  RDM_URL        public base URL of the RDM instance, used in record links
  CONTAINER_NAME RDM's Postgres runs in a docker container; this names it
  RDM_DBNAME     database name and username used by RDM inside the container

# OPTIONS

-h, --help, help
: Display this help message

# EXAMPLE

This is an example env file.

~~~
RDM_HOST=rdm.library.example.edu
RDM_URL=https://rdm.library.example.edu
CONTAINER_NAME=repository-db-1
RDM_DBNAME=repository
~~~

If this was saved as caltechauthors.env then you would run it with

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

NEED_SAVE=0

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

if [ -z "$RDM_HOST" ]; then
    read -r -p "Enter RDM_HOST: " RDM_HOST
    NEED_SAVE=1
fi
if [ -z "$RDM_URL" ]; then
    read -r -p "Enter RDM_URL: " RDM_URL
    NEED_SAVE=1
fi
if [ -z "$CONTAINER_NAME" ]; then
    read -r -p "Enter CONTAINER_NAME: " CONTAINER_NAME
    NEED_SAVE=1
fi
if [ -z "$RDM_DBNAME" ]; then
    read -r -p "Enter RDM_DBNAME: " RDM_DBNAME
    NEED_SAVE=1
fi

if [ -z "$RDM_HOST" ] || [ -z "$RDM_URL" ] || [ -z "$CONTAINER_NAME" ] || [ -z "$RDM_DBNAME" ]; then
    echo "Error: RDM_HOST, RDM_URL, CONTAINER_NAME and RDM_DBNAME must all be provided."
    exit 1
fi

if [ "$NEED_SAVE" -eq 1 ]; then
    read -r -p "Do you want to save these variables to a new .env file? (y/n): " save_env
    if [[ "$save_env" =~ ^[Yy]$ ]]; then
        NEW_ENV_FILE="${ENV_FILE}.new"
        cat <<ENVFILE >"${NEW_ENV_FILE}"
RDM_HOST=${RDM_HOST}
RDM_URL=${RDM_URL}
CONTAINER_NAME=${CONTAINER_NAME}
RDM_DBNAME=${RDM_DBNAME}
ENVFILE
        echo "Variables saved to ${NEW_ENV_FILE}"
    fi
fi

echo "RDM_HOST:       ${RDM_HOST}"
echo "RDM_URL:        ${RDM_URL}"
echo "CONTAINER_NAME: ${CONTAINER_NAME}"
echo "RDM_DBNAME:     ${RDM_DBNAME}"

# Initialise the collection if it does not exist. The DSN matches the
# collection cold already uses for its other sqlstore collections.
if [ ! -d "${C_NAME}" ]; then
    echo "Initialising ${C_NAME} ..."
    dataset init "${C_NAME}" 'sqlite://collection.db' || exit 1
fi

#shellcheck disable=SC2029
CONTAINER_ID="$(ssh "${RDM_HOST}" "docker ps --filter 'name=${CONTAINER_NAME}' --format '{{.ID}}'")"
if [ -z "${CONTAINER_ID}" ]; then
    echo "Error: no running container matching '${CONTAINER_NAME}' on ${RDM_HOST}."
    exit 1
fi
echo "CONTAINER_ID -> ${CONTAINER_ID}"

# The full harvest passes no extra predicate: every request the selection
# matches is harvested.
if ! emit_harvest_sql "${RDM_URL}" "" >"${SQL_FILE}"; then
    echo "Error: could not generate ${SQL_FILE}."
    exit 1
fi

cat <<CMD >"${CMD_FILE}"

docker cp "${SQL_FILE}" "${CONTAINER_ID}:${SQL_FILE}"

docker exec -i ${CONTAINER_ID} \
  psql --username ${RDM_DBNAME} ${RDM_DBNAME} -f ${SQL_FILE} -t -A -F \$'\t' \
  >${JSONL_FILE}

CMD

echo "Running full harvest query on ${RDM_HOST} ..."
scp "${CMD_FILE}" "${SQL_FILE}" "${RDM_HOST}":./ || exit 1
# CMD_FILE is expanded client side on purpose: it names a file we just copied.
#shellcheck disable=SC2029
if ! ssh "${RDM_HOST}" "bash ${CMD_FILE}"; then
    echo "Error: remote harvest command failed."
    exit 1
fi
scp "${RDM_HOST}":"${JSONL_FILE}" ./ || exit 1

if [ ! -s "${JSONL_FILE}" ]; then
    echo "Error: harvest produced empty output, aborting before the wipe."
    exit 1
fi

RECORD_COUNT=$(wc -l <"${JSONL_FILE}" | tr -d ' ')
echo "Harvested ${RECORD_COUNT} records."

# Distinct keys, not lines: two requests could in principle name the same topic
# record, and the completeness check below must not become wrong if they ever
# do.
EXPECTED=$(awk 'match($0, /"key"[^"]*"[^"]*"/) {
    k = substr($0, RSTART, RLENGTH); sub(/^"key"[^"]*"/, "", k); sub(/"$/, "", k)
    seen[k] = 1
} END { print length(seen) }' "${JSONL_FILE}")
if [ -z "${EXPECTED}" ] || [ "${EXPECTED}" -eq 0 ]; then
    echo "Error: could not extract keys from ${JSONL_FILE}; refusing to load."
    exit 1
fi
echo "Distinct keys in harvest: ${EXPECTED}"

# DR-0017: upsert then sweep, never wipe. T is captured before the load so that
# "touched by this run" is exactly "updated >= T". dataset's SQLite store bumps
# updated on every upsert, even a byte-identical one (sqlstore.go, UPDATE ...
# SET src = ?, updated = datetime()), and a created row takes the column
# default. Both are UTC, as is date -u here.
SWEEP_MARK="$(date -u +"%Y-%m-%d %H:%M:%S")"

# -m sizes bufio.Scanner's buffer in megabytes. The default is 1 MB and one
# CaltechAUTHORS record exceeds it: v62zd-ahy22 carries 2,379 creators and
# serialises to 1.10 MB. A too-long line does not skip that record -- Scan()
# returns false and the load STOPS there, which on 2026-09-09 loaded 31,470 of
# 111,202 rows and reported it as "1 load errors". 82 rows are already over
# 512 KB, so the headroom here is deliberate.
echo "Loading into ${C_NAME} (upsert) ..."
if ! dataset load -overwrite -m 8 "${C_NAME}" <"${JSONL_FILE}"; then
    echo "Error: dataset load failed. Collection left as it was; nothing swept."
    exit 1
fi

# Completeness gate. A truncated load is reported by dataset as a small number
# of errors regardless of how many rows it skipped, so count what was actually
# touched before deleting anything.
TOUCHED=$(dsquery "${C_NAME}" \
    "SELECT count(*) FROM ${C_TABLE} WHERE updated >= '${SWEEP_MARK}'" |
    tr -dc '0-9')
if [ "${TOUCHED}" != "${EXPECTED}" ]; then
    echo "Error: load touched ${TOUCHED} rows but the harvest holds ${EXPECTED} keys."
    echo "The load did not complete. Nothing swept; ${C_NAME} keeps its previous contents."
    exit 1
fi

SWEPT=$(dsquery "${C_NAME}" \
    "SELECT count(*) FROM ${C_TABLE} WHERE updated < '${SWEEP_MARK}'" |
    tr -dc '0-9')
echo "Sweeping ${SWEPT} rows this harvest did not touch ..."
if ! dsquery "${C_NAME}" "DELETE FROM ${C_TABLE} WHERE updated < '${SWEEP_MARK}'" >/dev/null; then
    echo "Error: sweep failed. ${C_NAME} holds this harvest plus ${SWEPT} stale rows."
    exit 1
fi

echo "Success! ${TOUCHED} records in ${C_NAME}, ${SWEPT} swept."
date -u +"%Y-%m-%d %H:%M:%S" >"${LASTMOD_FILE}"
echo "Harvest timestamp saved to ${LASTMOD_FILE}." 
