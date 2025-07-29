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

${APP_NAME} brings cold down in an orderly fashion. It follows
the following steps

1. Stops the front end service (cold)
2. Stops the reports system (cold_reports)
3. Stops the api service (cold_api)

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

sudo systemctl stop cold
sudo systemctl stop cold_reports
sudo systemctl stop cold_api
