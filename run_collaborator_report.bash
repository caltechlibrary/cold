#!/bin/bash

if [ "$1" = "" ]; then
	echo "Missing clpid, aborting"
	exit 1
fi
CLPID="$1"
if dataset read people.ds "${CLPID}" >/dev/null; then
    #deno run --allow-net --allow-env generate_collaborator_rpt.ts --author_identifier="${CLPID}" --record_ids
    ./bin/generate_collaborator_rpt "${CLPID}" --record_ids
#	../collaborator_reports/.venv/bin/python ../collaborator_reports/authors_nsf_table4.py "${CLPID}" --record_ids >/dev/null
else
	echo "Failed to find '${CLPID}'"
	exit 1
fi

# OUT_NAME="${CLPID}_nsf_collaborator_report.xlsx"
# if [ -f "${OUT_NAME}" ]; then
# 	mv "${OUT_NAME}" htdocs/rpt/
# 	# xlsx2csv htdocs/rpt/Briney-Kristin-A_nsf_collaborator_report.xlsx 'NSF Collaborator Report Table 4'
# 	xlsx2csv "htdocs/rpt/${OUT_NAME}" 'NSF Collaborator Report Table 4'
# else
# 	echo "Missing ${OUT_NAME}"
# 	exit 1
# fi
