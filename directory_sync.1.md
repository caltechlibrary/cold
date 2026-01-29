%directory_sync(1) user manual | 0.0.35  ac9dee8
% R. S.Doiel
% 2026-01-28

# NAME
    
directory_sync
    
# SYNOPSIS
    
directory_sync [OPTIONS]
    
# DESCRIPTION
    
directory_sync synchronizes the content between Caltech Directory and CaltechPEOPLE.
It uses the COLD Admin API as well as the Caltech Directory website content as a
data source.
    
Assuming COLD Admin is running on it's standard ports no configuration is needed.
    
directory_sync is suitable to run from a cronjob on the same machine which hosts COLD.
    
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
: set the port number for the COLD Admin JSON API, default 8112

directory
: set the Caltech Directory URL, default https://directory.caltech.edu


# EXAMPLE

directory_sync is setup to contact https://directory.caltech.edu to harvest directory content.

~~~shell
directory_sync
~~~



