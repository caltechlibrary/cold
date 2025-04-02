%cold(1) user manual | 0.0.20 1245151
% R. S.Doiel
% NaN-NaN-NaN

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

baseUrl
: set the browser's base path reference, default ://

apiUrl
: set the url to the datasetd API provided for cold


# EXAMPLE

cold is setup to run at <http://localhost:8111>. The static content hosted in
the "/var/www/html/cold/app" directory.  The datasetd service is setup to run at
<http://localhost:8112> supporting the people, groups and vocabularies dataset
collections.

~~~shell
cold -port=8111 -htdocs=/var/www/html/cold/app \
           -apiUrl=http://localhost:8112
~~~


