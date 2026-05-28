#!/bin/bash

if [ "$1" = "" ]; then
	echo "Missing country_code, aborting"
	exit 1
fi
COUNTRY_CODE="$1"
# Validate: must be exactly 2 uppercase ASCII letters
if ! echo "${COUNTRY_CODE}" | grep -qE '^[A-Z]{2}$'; then
	echo "Invalid country_code '${COUNTRY_CODE}': must be an ISO 3166-1 alpha-2 code (e.g. AU, DE, JP)"
	exit 1
fi
./bin/generate_country_collaboration_rpt "${COUNTRY_CODE}"
