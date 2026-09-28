#!/bin/bash
#
# check_alerts.bash is the alerting facility's reconciler (cold DR-0028).
# It discovers alerts by enumerating every "reports:" key in
# cold_reports.yaml beginning "alert_" -- adding a new watermark-staleness
# alert is a YAML stanza, not an edit to this script. For each one it
# reconciles the watermark's staleness against whether the alert's artifact
# already exists:
#
#   stale, no artifact   -> enqueue (report runs, writes the artifact, mails)
#   stale, artifact exists -> nothing -- this is what makes it edge-triggered
#   fresh, artifact exists -> clear the artifact and the queue row
#   fresh, no artifact    -> nothing
#
# Idempotent by construction: running it by hand clears a resolved alert,
# and frequency does not affect email volume.
#
if [ -d /Sites/cold ]; then cd /Sites/cold || exit 1; fi

CONFIG="cold_reports.yaml"
BASE_URL="http://localhost:8111"

for KEY in $(yq -r '.reports | keys | .[]' "${CONFIG}" | grep '^alert_'); do
    WATERMARK="$(yq -r ".reports.${KEY}.watermark" "${CONFIG}")"
    THRESHOLD="$(yq -r ".reports.${KEY}.threshold_minutes" "${CONFIG}")"
    EMAILS="$(yq -r ".reports.${KEY}.emails // \"\"" "${CONFIG}")"
    ARTIFACT="htdocs/rpt/${KEY}.txt"

    STALE=false
    if [ -f "${WATERMARK}" ] && find "${WATERMARK}" -mmin "+${THRESHOLD}" | grep -q .; then
        STALE=true
    fi

    if [ "${STALE}" = true ] && [ ! -f "${ARTIFACT}" ]; then
        echo "ALERT firing: ${KEY} (watermark ${WATERMARK} older than ${THRESHOLD} minutes)"
        curl -s -H "Accept: application/json" \
            -F "report_name=${KEY}" -F "emails=${EMAILS}" \
            "${BASE_URL}/reports"
        echo
    elif [ "${STALE}" = false ] && [ -f "${ARTIFACT}" ]; then
        echo "ALERT cleared: ${KEY}"
        rm -f "${ARTIFACT}"
        sqlite3 reports.ds/collection.db \
            "delete from reports where src->>'report_name' = '${KEY}';"
    fi
done
