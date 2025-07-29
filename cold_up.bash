#!/bin/bash

function usage() {
    APP_NAME="$(basename "$0")"
    cat <<TXT
%${APP_NAME} user manual
% R. S. Doiel
% 2025-07-29

# NAME

${APP_NAME}

# SYNOPSIS

${APP_NAME}

# DESCRIPTION

${APP_NAME} brings cold up in an orderly fashion. It follows
the following steps

1. Starts the api service (cold_api)
2. Starts the reports system (cold_reports)
3. Starts the front end service (cold)

# OPTION

-h, --help, help
| display this help message

# EXAMPLE

~~~
./${APP_NAME}
~~~

TXT
}

if [ "$1" != "" ]; then
    usage
    exit 0
fi


sudo systemctl start cold_api
sudo systemctl start cold_reports
sudo systemctl start cold
