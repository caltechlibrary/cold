%cold_reports(1) user manual | 0.0.32 e75d2b7
% R. S.Doiel
% 2025-05-16
    
# NAME
    
cold_reports
    
# SYNOPSIS
    
cold_reports [OPTIONS] [REPORTS_YAML]

# DESCRIPTION
    
cold_reports processes the report request queue. cold_reports is expected to validate
the report request, launch the report. The report is responsible to writing it's output
to standard out which is read by the cold_reports. cold_reports then renders the report
to a known location and updates the link data in the report request record.

REPORTS_YAML is the filename to read for configuring which reports are allowed to run and
what programs are executed as a result. If it is not provided then "cold_reports.yaml" is looked
for in the current working directory.

cold_reports requires access to the COLD JSON API to manage report requests.

Two example reports are provided in the COLD repository. Both are written in Bash and
require that dataset's dsquery program are available.  The provided report examples
are "run_people_csv.bash" and "run_groups_csv.bash".

Reports can be written in any language supported by the host system or can be 
compiled programs. The primary requirement is that they write their results to standard
out so that the report runner can manage making the reports available via the COLD web app.
    
cold_reports is designed as daemon suitable to run under systemd or other service management
system.  Logging is written to standard output. Included in the COLD repository is an example
service file to use when deploying cold_reports.

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

Shown is starting cold_reports with an explicit configuration file, "my_cold_reports.yaml" file, then
run with the default configuration file, "cold_reports.yaml" in the same working directory.

~~~shell
cold_reports my_cold_reports.yaml
cold_reports
~~~


