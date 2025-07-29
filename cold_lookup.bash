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

${APP_NAME} C_NAME KEY

# DESCRIPTION

${APP_NAME} will look up the KEY record in the C_NAME (dataset collection)
using the COLD API. This provides you with a quick way to see the record that
will show up for a person in the COLD web application.

It performs a curl call.
# OPTION

-h, --help, help
| display this help message

# EXAMPLE

~~~
./${APP_NAME} people.ds Minchew-B-M
~~~

TXT
}

if [ "$1" = "" ] || [ "$2" = "" ]; then
    usage
    exit 0
fi

curl -H 'Content-Type: application/json' "http://localhost:8112/api/$1/object/$2"
