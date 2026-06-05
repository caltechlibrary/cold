%generate_collaborator_rpt(1) user manual | 0.0.49 2cda10d
% R. S.Doiel
% 2026-06-05

# NAME

generate_collaborator_rpt

# SYNOPSIS

generate_collaborator_rpt CLPID [--record_ids]

# DESCRIPTION

Given a CLPID generate a collaborator report as a CSV file suitable for NSF.
One row is produced per unique coauthor aggregated across all CaltechAUTHORS
records from the past 48 months.

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

# EXAMPLE

~~~shell
generate_collaborator_rpt Newman-D-K --record_ids >Diane_Newman_Collaborators.csv
~~~


