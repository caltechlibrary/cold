%publications_by_person_identifiers(1) user manual | 0.0.45 536ae4a
% R. S.Doiel
% 2026-05-18

# NAME

publications_by_person_identifiers

# SYNOPSIS

publications_by_person_identifiers [OPTIONS] [CLPID] [ORCID]

# DESCRIPTION

publications_by_person_identifiers retrieves publication records from the Invenio RDM JSON API for CaltechAUTHORS
based on a CLPID (Caltech Library People Identifier) and/or ORCID. It outputs the results
in one of three formats: csv (default), json, or jsonl.

At least one of CLPID or ORCID must be provided as positional arguments. Both can be
provided to combine results. If a parameter is not known, pass an empty string.

The report includes the following fields for each publication:
- clpid: The CLPID provided as input for the search
- orcid: The ORCID provided as input for the search
- rdm_id: The RDM record identifier
- title: The publication title
- publication_year: The year of publication
- doi: The Digital Object Identifier
- authors_with_affiliations: authors with their affiliations
- acknowledgements: The acknowledgements text
- funding: funding information
- record_clpid: The CLPID found in the matching author's identifiers from the RDM record
- record_orcid: The ORCID found in the matching author's identifiers from the RDM record

# OPTIONS

-h, --help
: display help

-l, --license
: display license

-v, --version
: display version

-f, --format=FORMAT
: Output format. One of 'json', 'csv', or 'jsonl' (default: csv).
  - json: JSON array of all records
  - jsonl: JSON Lines (one record per line)
  - csv: Comma-separated values with flattened array fields

# ARGUMENTS

CLPID
: Caltech Library People Identifier to search for (optional if ORCID provided)

ORCID
: ORCID identifier to search for (optional if CLPID provided)

# EXAMPLE

Retrieve publications for a person by CLPID (default csv format):

~~~shell
publications_by_person_identifiers Newman-D-K
~~~

Retrieve publications for a person by ORCID as JSON array:

~~~shell
publications_by_person_identifiers -f json "" 0000-0000-0000-0000
~~~

Retrieve publications as CSV:

~~~shell
publications_by_person_identifiers -f csv Newman-D-K
~~~

Retrieve publications using both CLPID and ORCID:

~~~shell
publications_by_person_identifiers Newman-D-K 0000-0000-0000-0000
~~~

Retrieve publications with unknown CLPID:

~~~shell
publications_by_person_identifiers "" 0000-0000-0000-0000
~~~


