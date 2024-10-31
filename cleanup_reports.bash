#!/bin/bash

#
# Cleanup Reports will looks for stale reports and removed them from reports.ds and from htdocs/rpt path.
#

# Remove all but the latest run_people_csv reports.
function prune_updated_reports () {
    REPORT_NAME="$1"
    LINK="$2"
    echo "REPORT_NAME -> ${REPORT_NAME}"
    echo "LINK -> ${LINK}"
    if [ -f "htdocs/${LINK}" ]; then
        cat <<SQL >"prune_${REPORT_NAME}.sql"
delete from reports
  where _key in (
  select _key from reports
    where src->>'status' = 'completed' and src->>'report_name' = '${REPORT_NAME}'
    order by updated desc
    limit 1000 offset 1);
SQL

        #cat "prune_${REPORT_NAME}.sql"

        sqlite3 reports.ds/collection.db ".read prune_${REPORT_NAME}.sql"
    fi
}

prune_updated_reports "run_people_csv" "rpt/people.csv"
prune_updated_reports "run_groups_csv" "rpt/groups.csv"
