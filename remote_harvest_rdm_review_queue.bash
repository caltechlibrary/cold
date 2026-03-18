#!/bin/bash

# Display usage information
usage() {
    APP_NAME="$(basename "$0")"
    cat <<TXT

# NAME

${APP_NAME}

# SYNOPSIS

${APP_NAME} [OPTIONS] <path_to_env_file>"

# DESCRIPTION

${APP_NAME} takes a simple environment file and uses it to make a connection
to the remote RDM deployment and render the RDM review queue as a JSONL document.
The document is then copied back to the requesting host.

The script will then generate SQL and a docker command file to execute on the remote
system. It'll copy them there then execute them via SSH. The resulting jsonl file is
retrieved from the remote system and loaded into the rdm_review_queue.ds dataset
collection.

The env file contains three variables

RDM_HOST
: The remote machine name used to access the RDM instance (example the IP address or
name of the AWS load balancer)

CONTAINER_NAME
: RDM's Postgres runs in a docker container. This the name of the container.

RDM_DBNAME
: This is the database name and username used by RDM in the docker container Postgres.

# OPTIONS

-h, --help, help
: Display this help message

# EXAMPLE

This is an example env file.

~~~
HOST=rdm.library.example.edu
CONTAINER_NAME=repository-db-1
RDM_DBNAME=repository
~~~

If this was saved as rdm.env then you would run it with the follow

~~~
$APP_NAME rdm.env
~~~



TXT
    exit 0
}

# Check for help flags
if [[ "$1" == "-h" || "$1" == "--help" || "$1" == "help" ]]; then
    usage
fi

# If no parameters are provided, display usage and prompt for .env file
if [ $# -eq 0 ]; then
    usage
    read -p "No .env file provided. Enter the path to your .env file: " ENV_FILE
    if [ -z "$ENV_FILE" ]; then
        echo "Error: No .env file path provided."
        exit 1
    fi
else
    ENV_FILE="$1"
fi

NEED_SAVE=0

# Function to read a variable from .env file
get_env_var() {
    local var_name="$1"
    if [ -f "$ENV_FILE" ]; then
        grep "^${var_name}=" "$ENV_FILE" | cut -d '=' -f 2- | head -n 1
    fi
}

# Attempt to read from .env file
RDM_HOST="$(get_env_var "RDM_HOST")"
CONTAINER_NAME="$(get_env_var "CONTAINER_NAME")"
RDM_DBNAME="$(get_env_var "RDM_DBNAME")"

# Prompt for missing values
if [ -z "$RDM_HOST" ]; then
    read -p "Enter RDM_HOST: " RDM_HOST
    NEED_SAVE=1
fi

if [ -z "$CONTAINER_NAME" ]; then
    read -p "Enter CONTAINER_NAME: " CONTAINER_NAME
    NEED_SAVE=1
fi

if [ -z "$RDM_DBNAME" ]; then
    read -p "Enter RDM_DBNAME: " RDM_DBNAME
    NEED_SAVE=1
fi

# Check if all variables are populated
if [ -z "$RDM_HOST" ] || [ -z "$CONTAINER_NAME" ] || [ -z "$RDM_DBNAME" ]; then
    echo "Error: All parameters (RDM_HOST, CONTAINER_NAME, RDM_DBNAME) must be provided."
    exit 1
fi

# Ask if the user wants to save the variables to a new .env file (only if prompted)
if [ "$NEED_SAVE" -eq 1 ]; then
    read -p "Do you want to save these variables to a new .env file? (y/n): " save_env
    if [[ "$save_env" =~ ^[Yy]$ ]]; then
        NEW_ENV_FILE="${ENV_FILE}.new"
        echo "RDM_HOST=$RDM_HOST" > "$NEW_ENV_FILE"
        echo "CONTAINER_NAME=$CONTAINER_NAME" >> "$NEW_ENV_FILE"
        echo "RDM_DBNAME=$RDM_DBNAME" >> "$NEW_ENV_FILE"
        echo "Variables saved to $NEW_ENV_FILE"
    fi
fi

# Proceed with the script
echo "RDM_HOST: $RDM_HOST"
echo "CONTAINER_NAME: $CONTAINER_NAME"
echo "RDM_DBNAME: $RDM_DBNAME"

#
# Ready to get stapshot from RDM
#
CONTAINER_ID="$(ssh "${RDM_HOST}" "docker ps --filter 'name=${CONTAINER_NAME}' --format '{{.ID}}'")"
echo "CONTAINER_ID -> ${CONTAINER_ID}"

# SQL query (your provided query)
cat <<SQL_QUERY >"${RDM_DBNAME}_review_queue.sql"
  SELECT
    json_build_object(
      'key', request_metadata.json->'topic'->>'record',
      'object', json_build_object(
        'title', request_metadata.json->'title',
        'description', rdm_drafts_metadata.json->'metadata'->'description',
        'publisher', rdm_drafts_metadata.json->'metadata'->>'publisher',
        'publication_date', rdm_drafts_metadata.json->'metadata'->>'publication_date',
        'custom_fields', rdm_drafts_metadata.json->'custom_fields',
        'creators', rdm_drafts_metadata.json->'metadata'->'creators',
        'funding', rdm_drafts_metadata.json->'metadata'->'funding',
        'submitted_by', username,
        'created', request_metadata.created::date,
        'updated', request_metadata.updated::date
    )) AS obj
  FROM
    request_metadata
    LEFT JOIN accounts_user ON (request_metadata.json->'created_by'->>'user'::text = accounts_user.id::text)
    LEFT JOIN rdm_drafts_metadata ON (request_metadata.json->'topic'->>'record' = rdm_drafts_metadata.json->>'id')
  WHERE
    request_metadata.json->'receiver'->>'community' = 'aedd135f-227e-4fdf-9476-5b3fd011bac6'
    AND request_metadata.json->>'type' = 'community-submission'
  ORDER BY
    request_metadata.updated DESC;

SQL_QUERY

cat <<CMD >dockerCmd.bash

docker cp "${RDM_DBNAME}_review_queue.sql" "${CONTAINER_ID}:${RDM_DBNAME}_review_queue.sql"

docker exec -i ${CONTAINER_ID} \
  psql --username ${RDM_DBNAME} $RDM_DBNAME -f ${RDM_DBNAME}_review_queue.sql  -t -A -F $'\t' \
  >${RDM_DBNAME}_review_queue.jsonl

CMD

# Execute the query inside the container and save the output as JSONL
cat dockerCmd.bash
scp dockerCmd.bash $RDM_HOST:./
scp "${RDM_DBNAME}_review_queue.sql" $RDM_HOST:./

ssh $RDM_HOST "bash dockerCmd.bash"
scp $RDM_HOST:${RDM_DBNAME}_review_queue.jsonl ./
if [ -f "${RDM_DBNAME}_review_queue.jsonl" ]; then
    echo "Loading ${RDM_DBNAME}_review_queue.jsonl into rdm_review_queue.ds"
    if dataset load -overwrite rdm_review_queue.ds <"${RDM_DBNAME}_review_queue.jsonl"; then
        echo "Success!"
    else
        echo "Something went wrong"
    fi
fi
