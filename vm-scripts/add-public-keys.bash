#!/bin/bash

function usage() {
    APP_NAME=$(basename $0)
    cat <<EOF
USAGE:

   ${APP} USERNAME

This script retrieves the public SSH keys from
GitHub and appends them to the .ssh/authorized_keys
file.
  
EOF
}

if [ "$1" = "" ]; then
    usage
    exit 1
fi

UNAME="$1"
curl -O "https://github.com/${UNAME}.keys"
read -p "Append to authorized keys? yes/no " Y_N
if [ "${Y_N:0:1}" = "y" ] || [ "${Y_N:0:1}" = "Y" ]; then
  cat "${UNAME}.keys" >>$HOME/.ssh/authorized_keys
fi
