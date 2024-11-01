#!/bin/bash

#
# Cleanup Reports will looks for stale reports and removed them from reports.ds and from htdocs/rpt path.
#
if [ -d /Sites/cold ]; then
    cd /Sites/cold || echo "work directory is $(pwd)"
fi

# Remove all but the latest run_people_csv and run_groups_csv reports.
function prune_standard_reports () {
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
        sqlite3 reports.ds/collection.db ".read prune_${REPORT_NAME}.sql";
    fi
}

# Remove all tail processing reports.
function prune_stale_processing_reports() {
    cat <<SQL >"prune_stale_processing_reports.sql"
update reports set src = json_patch(src, json_object('status', 'error', 'link', 'error://failed to process', 'updated', strftime('%FT%R:%fZ'))),
                   updated = strftime('%F %T')
  where src->>'status' = 'processing' and updated <= datetime('now', '-1 hours');
SQL
    sqlite3 reports.ds/collection.db ".read prune_stale_processing_reports.sql"
}

prune_standard_reports "run_people_csv" "rpt/people.csv"
prune_standard_reports "run_groups_csv" "rpt/groups.csv"
prune_stale_processing_reports 
