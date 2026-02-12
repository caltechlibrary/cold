#!/bin/bash

APP_NAME="$(basename "${0}")"
function usage() {
	cat <<TXT
%${APP_NAME}: user manual

# NAME

${APP_NAME}

# SYNOPSIS

#{APP_NAME} [OPTION] OLD_KEY NEW_KEY

# DESCRIPTION

Move a people record from old key to new. This updates both the key and
the internet clpid in the record.

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

if [ "$#" != "2" ]; then
	usage
	exit 1
fi

case "$1" in
  -h|--help|help)
    usage
	exit 0;
esac

export OLD_KEY="$1"
export NEW_KEY="$2"

sudo systemctl stop cold
sudo systemctl stop cold_reports
sudo systemctl stop cold_api
read -p "Moving ${OLD_KEY} to ${NEW_KEY}? y/N " Y_N
if [ "${Y_N}" = "y" ]; then
	sqlite3 people.ds/collection.db << SQL
update people 
set _key = '${NEW_KEY}', src = json_set(src, '$.clpid', '${NEW_KEY}')
where _key = '${OLD_KEY}';
SQL
else
	echo "aborting";
fi
sudo systemctl restart cold_api
sudo systemctl restart cold_reports
sudo systemctl restart cold

