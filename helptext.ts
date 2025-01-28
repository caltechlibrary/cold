export function fmtHelp(
  txt: string,
  appName: string,
  version: string,
  releaseDate: string,
  releaseHash: string,
): string {
  return txt.replaceAll("{app_name}", appName)
    .replaceAll("{version}", version)
    .replaceAll("{release_date}", releaseDate)
    .replaceAll("{release_hash}", releaseHash);
}

export const coldHelpText =
  `%{app_name}(1) user manual | {version} {release_hash}
% R. S.Doiel
% {release_date}

# NAME

{app_name}

# SYNOPSIS

{app_name} [OPTIONS]

# DESCRIPTION

{app_name} provides the admin interface for {app_name}. Cold is implemented using dataset collections
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
: set the url to the datasetd API provided for {app_name}


# EXAMPLE

{app_name} is setup to run at <http://localhost:8111>. The static content hosted in
the "/var/www/html/{app_name}/app" directory.  The datasetd service is setup to run at
<http://localhost:8112> supporting the people, groups and vocabularies dataset
collections.

~~~shell
{app_name} -port=8111 -htdocs=/var/www/html/{app_name}/app \\
           -apiUrl=http://localhost:8112
~~~

`;

export const coldReportsHelpText =
  `%{app_name}(1) user manual | {version} {release_hash}
% R. S.Doiel
% {release_date}
    
# NAME
    
{app_name}
    
# SYNOPSIS
    
{app_name} [OPTIONS] [REPORTS_YAML]

# DESCRIPTION
    
{app_name} processes the report request queue. {app_name} is expected to validate
the report request, launch the report. The report is responsible to writing it's output
to standard out which is read by the {app_name}. {app_name} then renders the report
to a known location and updates the link data in the report request record.

REPORTS_YAML is the filename to read for configuring which reports are allowed to run and
what programs are executed as a result. If it is not provided then "{app_name}.yaml" is looked
for in the current working directory.

{app_name} requires access to the COLD JSON API to manage report requests.

Two example reports are provided in the COLD repository. Both are written in Bash and
require that dataset's dsquery program are available.  The provided report examples
are "run_people_csv.bash" and "run_groups_csv.bash".

Reports can be written in any language supported by the host system or can be 
compiled programs. The primary requirement is that they write their results to standard
out so that the report runner can manage making the reports available via the COLD web app.
    
{app_name} is designed as daemon suitable to run under systemd or other service management
system.  Logging is written to standard output. Included in the COLD repository is an example
service file to use when deploying {app_name}.

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

Shown is starting {app_name} with an explicit configuration file, "my_{app_name}.yaml" file, then
run with the default configuration file, "{app_name}.yaml" in the same working directory.

~~~shell
{app_name} my_{app_name}.yaml
{app_name}
~~~

`;

export const directorySyncHelpText =
  `%{app_name}(1) user manual | {version}  {release_hash}
% R. S.Doiel
% {release_date}

# NAME
    
{app_name}
    
# SYNOPSIS
    
{app_name} [OPTIONS]
    
# DESCRIPTION
    
{app_name} synchronizes the content between Caltech Directory and CaltechPEOPLE.
It uses the COLD Admin API as well as the Caltech Directory website content as a
data source.
    
Assuming COLD Admin is running on it's standard ports no configuration is needed.
    
{app_name} is suitable to run from a cronjob on the same machine which hosts COLD.
    
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

{app_name} is setup to contact https://directory.caltech.edu to harvest directory content.

~~~shell
{app_name}
~~~


`;
