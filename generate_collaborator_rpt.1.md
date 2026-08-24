%generate_collaborator_rpt(1) user manual | 0.0.51 1e024ce
% R. S.Doiel
% 2026-08-24

# NAME

generate_collaborator_rpt

# SYNOPSIS

generate_collaborator_rpt CLPID [--record_ids] [--format=csv|xlsx]

# DESCRIPTION

Given a CLPID generate an NSF Collaborator Report as CSV or XLSX, suitable
for NSF. One row is produced per unique coauthor aggregated across all
CaltechAUTHORS records from the past 48 months.

The output columns are:

- "4" / "A:": NSF format marker
- Name: coauthor display name
- Organizational Affiliation: comma-separated affiliations
- Optional (email, Department): blank column for manual completion
- Last Active: most recent publication year for that coauthor

# OPTION

-h, --help
: display help

-l, --license
: display license

-v, --version
: display version

--record_ids
: Include the CaltechAUTHORS record identifiers in the output (do not submit to NSF)

-f, --format=csv|xlsx
: Set the output format written to standard output. Defaults to csv.

# EXAMPLE

~~~shell
generate_collaborator_rpt Newman-D-K --record_ids >Diane_Newman_Collaborators.csv
generate_collaborator_rpt Newman-D-K --record_ids --format=xlsx >Diane_Newman_Collaborators.xlsx
~~~


