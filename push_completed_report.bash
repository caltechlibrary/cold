#!/bin/bash

#
# Push compelted report takes a report name and link path and creates/replaces the
# record in the reports.ds collection.
#
if [ -d /Sites/cold ]; then cd /Sites/cold || exit 1; fi


#{
#    "content_type": null,
#    "emails": "rsdoiel@localhost",
#    "id": "842482ce-6985-5440-8820-871ebf07928b",
#    "link": "rpt/people.csv",
#    "report_name": "run_people_csv",
#    "requested": "2024-11-04T18:45:11.197Z",
#    "status": "completed",
#    "updated": "2024-11-04T18:45:17.122Z"
#}
function push_report() {
	report_name="$1"
	report_link="$2"
	timestamp="$(date +"%Y-%m-%d %H:%M:%S%z")"
	dataset delete reports.ds "$report_name"
	cat <<JSON | dataset create -i - reports.ds "${report_name}"
{
    "content_type": "text/csv",
    "emails": "",
    "id": "${report_name}",
    "link": "${report_link}",
    "report_name": "${report_name}",
    "requested": "$timestamp",
    "status": "completed",
    "updated": "$timestamp"
}
JSON
}

if [ "$1" = "" ] || [ "$2" = "" ]; then
	echo "USAGE: $0 REPORT_NAME REPORT_LINK"
	exit 1
fi
push_report "$1" "$2"
