#!/bin/bash
#
# run_alert_watermark_stale.bash prints an alert report body for a stale
# watermark file. It takes no CLI parameters -- its shape (which watermark,
# what threshold, whose alert this is, who gets notified) comes entirely
# from the environment, set by cold_reports.ts's Runnable.run() from the
# alert's cold_reports.yaml stanza and, for EMAILS, from the queued
# request. This lets one script cover every watermark-staleness alert
# (cold DR-0028): adding a new one is a YAML stanza, not a new script.
#
# The script runs before cold_reports.ts sends the notification mail, so
# "Notified:" below states intent, not a completed action.
#
echo "Alert: ${LABEL} is stale"
echo "Watermark file: ${WATERMARK}"
echo "Threshold: ${THRESHOLD_MINUTES} minutes"
echo "Detected stale at: $(date)"
if [ -n "${EMAILS}" ]; then
    echo "Notified: ${EMAILS}"
else
    echo "Notified: (no recipients configured)"
fi
