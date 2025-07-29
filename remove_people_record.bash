#!/bin/bash

APP_NAME="$(basename "${0}")"
function usage() {
	cat <<TXT
%${APP_NAME}: user manual

# NAME

${APP_NAME}

# SYNOPSIS

#{APP_NAME} [OPTION] KEY_TO_REMOVE

# DESCRIPTION

Remove a people record from people.ds collection. 

NOTE: This will cause COLD to be off line momentarily to avoid conflicting
writes to the SQLite3 database.

# OPTIONS

-h, --help, help
: Display this help document.

# EXAMPLE

Move "Miles_Drew-M" to "Miles-Drew-M".

~~~shell
${APP_NAME} "Miles_Drew-M" "Miles-Drew-M"
~~~

TXT
}

if [ "$#" != "1" ]; then
	usage
	exit 1
fi

case "$1" in
  -h|--help|help)
    usage
	exit 0;
esac

export KEY="$1"

sudo systemctl stop cold
sudo systemctl stop cold_reports
sudo systemctl stop cold_api
read -p "Removing ${KEY} record? y/N " Y_N
if [ "${Y_N}" = "y" ]; then
	dataset delete people.ds "${KEY}"
else
	echo "aborting";
fi
sudo systemctl starts cold_api
sudo systemctl starts cold_reports
sudo systemctl starts cold

