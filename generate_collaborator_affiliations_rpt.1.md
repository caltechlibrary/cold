%generate_collaborator_affiliations_rpt(1) user manual | 0.0.49 15f9409
% R. S.Doiel
% 2026-06-05

# NAME

generate_collaborator_affiliations_rpt

# SYNOPSIS

generate_collaborator_affiliations_rpt [OPTIONS] CLPID

# DESCRIPTION

Given a CLPID, generate a collaborator affiliations report as a CSV file.
This report is similar to the basic collaborator report but expands affiliation
details. Each row represents one (coauthor, affiliation, CaltechAUTHORS record)
combination, allowing acknowledgement and additional information context to be
read per publication.

The output columns are:

- "4" / "A:": NSF format marker
- Name: coauthor display name
- Organizational Affiliation: affiliation name
- ROR ID: full ROR URL for the affiliation (if available in CaltechAUTHORS)
- Country: country name derived from the local ror.ds dataset
- Optional (email, Department): blank column for manual completion
- Last Active: publication year for that specific record
- Acknowledgements: acknowledgement text from the record
- Additional Information: additional information text from the record

Acknowledgement and Additional Information are sourced from the record's
metadata.additional_descriptions field (types "Acknowledgement" and
"Additional Information" respectively). Multiple entries of the same type
within one record are joined with two line breaks.

Records searched cover all available CaltechAUTHORS history. ROR country
lookups use the local ror.ds dataset collection and are cached per affiliation
to minimise datasetd calls.

# OPTIONS

-h, --help
: display help

-l, --license
: display license

-v, --version
: display version

--record_ids
: Include the CaltechAUTHORS record identifier as a final column (do not submit to NSF)

# EXAMPLE

Generate a collaborator affiliations report:

~~~shell
generate_collaborator_affiliations_rpt Newman-D-K >Newman_affiliations.csv
~~~

Include CaltechAUTHORS record IDs for cross-referencing:

~~~shell
generate_collaborator_affiliations_rpt --record_ids Newman-D-K >Newman_affiliations.csv
~~~

