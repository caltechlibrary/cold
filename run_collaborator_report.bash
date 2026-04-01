#!/bin/bash

if [ "$1" = "" ]; then
	echo "Missing clpid, aborting"
	exit 1
fi
CLPID="$1"
if dataset read people.ds "${CLPID}" >/dev/null; then
	../collaborator_reports/.venv/bin/python ../collaborator_reports/authors_nsf_table4.py "$CLPID" --record_ids
else
	echo "Failed to find '${CLPID}'"
	exit 1
fi

OUT_NAME="${CLPID}_nsf_collaborator_report.xlsx"
if [ -f "${OUT_NAME}" ]; then
	mv "${OUT_NAME}" htdocs/rpt/
else
	echo "Missing ${OUT_NAME}"
	exit 1
fi
