%cold(1) user manual | 0.0.7 2024-10-09
    % R. S.Doiel
    % 2024-10-09 472d71f
    
    # NAME
    
    cold
    
    # SYNOPSIS
    
    cold [OPTIONS]
    
    # DESCRIPTION
    
    cold synchronizes the content between Caltech Directory and CaltechPEOPLE.
    It uses the COLD Admin API as well as the Caltech Directory website content as a
    data source.
    
    Assuming COLD Admin is running on it's standard ports no configuration is needed.
    
    cold is suitable to run from a cronjob on the same machine which hosts COLD.
    
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

cold is setup to contact {directoryUrl} to harvest directory content.

~~~shell
cold
~~~


