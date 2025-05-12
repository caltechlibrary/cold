#!/bin/bash

WORK_DIR=$(dirname "$0")
if [ "${WORK_DIR}" != "" ]; then
    cd "${WORK_DIR}" || exit 1
fi
if [ "$1" = "push_to_cold" ]; then
    echo "Pushing journal vocabulary request into reports.ds";
    curl -X POST -d 'report_name=thesis_option_vocabulary' http://localhost:8111/reports/
else
    ./bin/thesis_option_vocabulary
fi