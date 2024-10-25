%directory_sync(1) user manual | 0.0.9 2024-10-24 ea5aeff
% R. S.Doiel
% 2024-10-24 ea5aeff
    
# NAME
    
directory_sync
    
# SYNOPSIS
    
directory_sync [OPTIONS] [REPORTS_YAML]

# DESCRIPTION
    
directory_sync processes the report quest queue. The directory_sync is expected to validate
the report request, launch the report passing to it via standard input a JSON expression
holding the request details.  In return directory_sync monitors the execution of the request
and listens in standard input for a JSON object describing the result then updates the
report request queue accordingly.

REPORTS_YAML is the filename to read for configuring which reports are allowed to run and
what programs are executed as a result. If it is not provided then reports.yaml is looked
for in the current working directory.

directory_sync requires access to the COLD JSON API to manage report requests.

Reports are simply scripts or programs that read a JSON object form standard input,
render a report including storing it and determining the URL where the report can
be retrieved. When the report is completed then it returns the JSON object it recieved
updated with the eport status, link information.  It the responsible of the report to
determine where it's results are stored (e.g. G-Drive, Box, etc).  When the reports
results are recieved by the runner it will notify anyone in the email list of the 
report results (e.g. report name, final status and link).
    
directory_sync is designed as daemon suitable to run under systemd or other service management
system.  Logging is written to standard output.

# OPTIONS

help
: display help

license
: display license

version
: display version

debug
: turn on debug logging


# EXAMPLE


~~~shell
directory_sync reports.yaml
~~~


