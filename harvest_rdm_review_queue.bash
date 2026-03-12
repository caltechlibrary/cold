#!/bin/bash

C_NAME="rdm_review_queue.ds"
RDM_DBNAME=""

if [ "$1" = "" ]; then
	echo -n "Enter RDM DB name: "	
	read RDM_DBNAME
else
	RDM_DBNAME="$1"
fi
if [ "$RDM_DBNAME" = "" ]; then
	echo "error must have the name of the RDM database"
	exit 1
fi

#
# Make sure we have a review queue dataset collection setup.
#
if [ ! -d "${C_NAME}" ]; then
	echo "Initializing ${C_NAME}"
	dataset init "${C_NAME}"
fi

#
# Dump the records from Postgres
#
echo "Write ${RDM_DBNAME}.request_metadata and joined data to ${RDM_DBNAME}.jsonl"
psql "${RDM_DBNAME}" -c "
  SELECT
    json_build_object(
      'key', request_metadata.json->'topic'->>'record',
      'object', json_build_object(
        'title', request_metadata.json->'title',
        'description', rdm_records_metadata.json->'metadata'->'description',
        'custom_fields', rdm_records_metadata.json->'custom_fields',
        'creators', rdm_records_metadata.json->'metadata'->'creators',
        'submitted_by', username,
        'created', request_metadata.created::date,
        'updated', request_metadata.updated::date
    )) AS obj
  FROM
    request_metadata
    LEFT JOIN accounts_user ON (request_metadata.json->'created_by'->>'user'::text = accounts_user.id::text)
    LEFT JOIN rdm_records_metadata ON (request_metadata.json->'topic'->>'record' = rdm_records_metadata.json->>'id')
  WHERE
    request_metadata.json->'receiver'->>'community' = 'aedd135f-227e-4fdf-9476-5b3fd011bac6'
    AND request_metadata.json->>'type' = 'community-submission'
  ORDER BY
    request_metadata.updated DESC;
" -t -A -F $'\t' >"${RDM_DBNAME}.jsonl"

#
# Load into a dataset collection
#
echo "Loading ${RDM_DBNAME}.jsonl into ${C_NAME}"
dataset load -overwrite "${C_NAME}" <"${RDM_DBNAME}.jsonl"

