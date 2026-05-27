#!/bin/bash

if [ "$1" = "" ]; then
	echo "Missing clpid, aborting"
	exit 1
fi
CLPID="$1"
if dataset read people.ds "${CLPID}" >/dev/null; then
    ./bin/generate_collaborator_affiliations_rpt "${CLPID}" --record_ids
else
	echo "Failed to find '${CLPID}'"
	exit 1
fi
