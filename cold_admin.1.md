%cold_admin(1) user manual |  2024-09-16
% R. S.Doiel
% 2024-09-16 2f8bd4e

# NAME

cold_admin

# SYNOPSIS

cold_admin [OPTIONS]

# DESCRIPTION

cold_admin provides the admin interface for cold. Cold is implemented using dataset collections
for object persistence and relies on datasetd for JSON API to each collection.

# OPTIONS


help
: display help

license
: display license

version
: display version

debug
: turn on debug logging

port
: set the port number, default 8111

htdocs
: set the static content directory, default ./htdocs

apiUrl
: set the url to the datasetd API provided for cold


# EXAMPLE

cold_admin is setup to run at <http://localhost:8111>. The static content hosted in
the "/var/www/html/cold/app" directory.  The datasetd service is setup to run at
<http://localhost:8112> supporting the people, groups and vocabularies dataset
collections.

~~~shell
cold_admin -port=8111 -htdocs=/var/www/html/cold/app            -apiUrl=http://localhost:8112
~~~


