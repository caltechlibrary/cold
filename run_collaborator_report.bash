#!/bin/bash

if [ "$1" = "" ]; then
	echo "Missing clpid, aborting"
	exit 1
fi
CLPID="$1"

# The output format must match the content_type declared for this report in
# cold_reports.yaml (the runner picks the download's file extension from
# that same field), so derive --format from it rather than hardcoding it
# here. See Issue #106.
CONTENT_TYPE="$(yq -r '.reports.run_collaborator_report.content_type' cold_reports.yaml)"
case "${CONTENT_TYPE}" in
	text/csv)
		FORMAT="csv"
		;;
	application/vnd.ms-excel)
		FORMAT="xlsx"
		;;
	*)
		echo "Unsupported content_type '${CONTENT_TYPE}' for run_collaborator_report in cold_reports.yaml, defaulting to csv" 1>&2
		FORMAT="csv"
		;;
esac

if dataset read people.ds "${CLPID}" >/dev/null; then
    #deno run --allow-net --allow-env generate_collaborator_rpt.ts --author_identifier="${CLPID}" --record_ids
    ./bin/generate_collaborator_rpt "${CLPID}" --record_ids --format="${FORMAT}"
#	../collaborator_reports/.venv/bin/python ../collaborator_reports/authors_nsf_table4.py "${CLPID}" --record_ids >/dev/null
else
	echo "Failed to find '${CLPID}'"
	exit 1
fi
