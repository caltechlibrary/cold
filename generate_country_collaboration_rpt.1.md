%generate_country_collaboration_rpt(1) user manual | 0.0.47 039fd36
% R. S. Doiel
% 2026-05-27

# NAME

generate_country_collaboration_rpt

# SYNOPSIS

generate_country_collaboration_rpt [OPTIONS] COUNTRY_CODE

# DESCRIPTION

generate_country_collaboration_rpt generates a country collaboration report for CaltechAUTHORS records.
Given an ISO 3166-1 alpha-2 country code, it queries the local ROR dataset (ror.ds)
for all research organizations in that country, then searches CaltechAUTHORS for
records where those ROR identifiers appear in creator affiliations, contributor
affiliations, or funding entries.

Each output row represents one (ROR, CaltechAUTHORS record) pair. The columns are:

- country: country name for the matched ROR organization
- ror: full ROR URL of the matched organization
- organization: name of the matched ROR organization
- year: publication year, enabling engagement to be tracked over time
- caltech_authors: semicolon-separated Caltech creators and contributors (Caltech ROR or clpid);
  each entry is formatted as "Name (clpid)" or "Name (orcid)" when an identifier is available
- rdm_record_id: the CaltechAUTHORS InvenioRDM record identifier

# OPTIONS

-h, --help
: display help

-l, --license
: display license

-v, --version
: display version

# ARGUMENTS

COUNTRY_CODE
: ISO 3166-1 alpha-2 two-letter country code (e.g. AU, DE, JP, GB)

# EXAMPLE

Generate a country collaboration report for Australia:

~~~shell
generate_country_collaboration_rpt AU
~~~

Generate a report for Germany:

~~~shell
generate_country_collaboration_rpt DE
~~~


