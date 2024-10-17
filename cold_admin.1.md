%cold(1) user manual | 0.0.9 2024-10-17 9bf9a1c
% R. S.Doiel
% 2024-10-17 9bf9a1c

# NAME

cold

# SYNOPSIS

cold [OPTIONS]

# DESCRIPTION

cold provides the admin interface for cold. Cold is implemented using dataset collections
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

cold is setup to run at <http://localhost:8111>. The static content hosted in
the "/var/www/html/cold/app" directory.  The datasetd service is setup to run at
<http://localhost:8112> supporting the people, groups and vocabularies dataset
collections.

~~~shell
cold -port=8111 -htdocs=/var/www/html/cold/app            -apiUrl=http://localhost:8112
~~~


