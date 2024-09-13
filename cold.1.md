%cold(1) user manual | 0.0.6 
% R. S.Doiel
%  

# NAME

cold

# SYNOPSIS

cold [OPTIONS]

# DESCRIPTION

cold provides the public human user interface for cold. It uses
a set of dataset collections for persistence and relies on datasetd
for JSON API to each collection. **cold** is a read only service.

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
: set the port number, default 8110

htdocs
: set the static content directory, default ./htdocs

apiUrl
: set the url to the datasetd API provided for cold


# EXAMPLE

cold is setup to run at <http://localhost:8110>. The static content hosted in
the "htdocs" directory.  The datasetd service is setup to run at
<http://localhost:8112> supporting the people, groups and funders dataset
collections.

~~~shell
deno task start
~~~


