#!/bin/bash

APP=$(basename "$0")

function usage() {
	cat <<EOT

USAGE:

      env DB_USER=XXXX DB_PASSWORD=XXXX \\
          APP_USER=XXXX APP_PASSWORD=XXXX \\
          $APP

or just 

    $APP

$APP setups up a dba user
and matomo user and database for doing web analytics.
You can either pass the desired values via the environment
or be prompted to type them in.  In the command using the
"env" above replace the XXXX with appropriate values.

EOT

	exit 0
}

function generate_mycnf() {
	FNAME="$1"
    NAME="$2"
    SECRET="$3"

	cat <<EOT >"${FNAME}"
[client]
user = $NAME
password = $SECRET
host = localhost

EOT

    chmod 600 "${FNAME}"
}

function app_setup() {
    if [ "$APP_USER" = "" ]; then
        echo "Enter name for Matomo db user"
        read APP_USER
    fi
    if [ "$APP_PASSWORD" = "" ]; then
        echo "Enter Matomo user password"
        read -s APP_PASSWORD
    fi
    sudo mysql --execute "CREATE DATABASE IF NOT EXISTS analytics"
    sudo mysql --execute "DROP USER IF EXISTS '$APP_USER'@'localhost'"
    sudo mysql --execute "CREATE USER IF NOT EXISTS '$APP_USER'@'localhost'  IDENTIFIED WITH mysql_native_password BY '$APP_PASSWORD'"
    sudo mysql --execute "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, DROP, ALTER, CREATE TEMPORARY TABLES, LOCK TABLES ON analytics.* TO '$APP_USER'@'localhost';"
    sudo mysql --execute "GRANT FILE ON *.* TO '$APP_USER'@'localhost';"
    generate_mycnf "matomo.cnf" "$APP_USER" "$APP_PASSWORD"
}

function dba_setup() {
    if [ "$DB_USER" = "" ]; then
        echo "Enter name for MySQL DB admin user"
        read DB_USER
    fi
    if [ "$DB_PASSWORD" = "" ]; then
        echo "Enter name for MySQL DB admin password"
        read -s DB_PASSWORD
    fi
    sudo mysql mysql --execute "DROP USER IF EXISTS '$DB_USER'@'localhost'"
    sudo mysql mysql --execute "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASSWORD}'"
    sudo mysql mysql --execute "GRANT ALL ON *.* TO '${DB_USER}'@'localhost'";
    generate_mycnf "$DB_USER.cnf" "$DB_USER" "$DB_PASSWORD"
}

#
# Main
#
for PARAM in $@; do
    if [ "${PARAM:0:2}" = "-h" ] || [ "${PARAM:0:3}" = "--h" ] || "${PARAM}" = "help" ]; then
        usage
    fi
done
echo "$APP will setup and configure a DBA account and Matomo database and user"
dba_setup
app_setup

