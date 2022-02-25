#!/bin/bash

PATH="/usr/local/bin:/usr/bin:/bin"
export PATH

#
# Setup environment
#
cd "$(dirname "$0")/.."
echo "Working directory $(pwd)"

#
# Start the webserver with an environment from /Sites/SITENAME/etc/cold.bash
#

function startService() {
        echo "Starting cold"
        /usr/local/bin/cold /usr/local/etc/cold/settings.json
}

function stopService() {
        echo "Stopping cold"
        for PID in $(pgrep cold); do
                kill -s TERM "$PID"
        done
}

function statusService() {
        for PID in $(pgrep cold); do
                echo "CAIT running as $PID"
        done
}

# Handle requested action
case "$1" in
        start)
                startService
                ;;
        stop)
                stopService
                ;;
        restart)
                stopService
                startService
                ;;
        status)
                statusService
                ;;
        *)
                echo 'usage: epi3apid [start|stop|restart|reindex|status]'
                ;;
esac



