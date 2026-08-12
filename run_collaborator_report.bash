#!/bin/bash

if [ "$1" = "" ]; then
	echo "Missing clpid, aborting"
	exit 1
fi
CLPID="$1"
if dataset read people.ds "${CLPID}" >/dev/null; then
    #deno run --allow-net --allow-env generate_collaborator_rpt.ts --author_identifier="${CLPID}" --record_ids
    ./bin/generate_collaborator_rpt "${CLPID}" --record_ids --format=xlsx
#	../collaborator_reports/.venv/bin/python ../collaborator_reports/authors_nsf_table4.py "${CLPID}" --record_ids >/dev/null
else
	echo "Failed to find '${CLPID}'"
	exit 1
fi
