---
title: cold
abstract: "Caltech Library maintains a list of people, groups and funders and their related identifiers. For many years these were managed using a spreadsheets. That has become cumbersome. **COLD** manages data as JSON objects in [dataset](https://github.com/caltechlibrary/dataset) collections.

**COLD** is implemented as three web web services

- cold web UI
- cold JSON API (provided by datasetd)
- cold reports (the report request system)

Reports are implemented as a set of programs or bash scripts.

TypeScript+Deno is used to implement the web UI and report system.
The JSON API is provided by Dataset&#x27;s datasetd.
Access control is provided by the front end web server integrated with Shibboleth."
authors:
  - family_name: Doiel
    given_name: R. S.
    id: https://orcid.org/0000-0003-0900-6903

contributor:
  - family_name: Johnson
    given_name: Kathy
    id: https://orcid.org/0000-0002-0026-2516
  - family_name: Morrell
    given_name: Thomas E
    id: https://orcid.org/0000-0001-9266-5146

maintainer:
  - family_name: Doiel
    given_name: R. S.
    id: https://orcid.org/0000-0003-0900-6903

repository_code: https://github.com/caltechlibrary/cold
version: 0.0.51
license_url: https://software.library.caltech.edu/cold/LICENSE
operating_system:
  - Linux

programming_language:
  - CSS
  - HTML
  - JavaScript
  - JSON
  - shell (Bash)
  - SQL
  - Typescript
  - YAML

keywords:
  - metadata
  - objects
  - controlled vocabulary

date_released: 2026-08-24
---

About this software
===================

## cold 0.0.51

- Fixed run_publications_by_person_identifiers silently truncating results at 1000 records for anyone with more than 1000 matching CaltechAUTHORS records (confirmed live: Goddard-W-A-III had 1542 matching records, ~542 missing from report output with no error or warning)
- Added a shared caltechauthors_api.ts module providing fetchAllRecords(), which pages through the CaltechAUTHORS RDM API via links.next (instead of a single size=1000 request) and retries with backoff on HTTP 429 rate limiting
- Updated publications_by_person_identifiers.ts, generate_collaborator_rpt.ts, generate_collaborator_affiliations_rpt.ts, and generate_country_collaboration_rpt.ts to use fetchAllRecords(), fixing the same silent-truncation exposure in all four CaltechAUTHORS API report scripts
- Extracted buildRecordsQueryUrl() out of publications_by_person_identifiers.ts for unit testing without network access, matching the existing pattern in the collaborator report scripts
- Added test coverage: caltechauthors_api_test.ts (pagination, page-ceiling safety net, 429 retry/backoff, fail-fast on other errors) and publications_by_person_identifiers_test.ts

## Authors

- [R. S. Doiel](https://orcid.org/0000-0003-0900-6903)


## Contributors

- [Kathy Johnson](https://orcid.org/0000-0002-0026-2516)
- [Thomas E Morrell](https://orcid.org/0000-0001-9266-5146)


## Maintainers

- [R. S. Doiel](https://orcid.org/0000-0003-0900-6903)


Caltech Library maintains a list of people, groups and funders and their related identifiers. For many years these were managed using a spreadsheets. That has become cumbersome. **COLD** manages data as JSON objects in [dataset](https://github.com/caltechlibrary/dataset) collections.

**COLD** is implemented as three web web services

- cold web UI
- cold JSON API (provided by datasetd)
- cold reports (the report request system)

Reports are implemented as a set of programs or bash scripts.

TypeScript+Deno is used to implement the web UI and report system.
The JSON API is provided by Dataset&#x27;s datasetd.
Access control is provided by the front end web server integrated with Shibboleth.

- [License](https://software.library.caltech.edu/cold/LICENSE)
- [Code Repository](https://github.com/caltechlibrary/cold)
  - [Issue Tracker](https://github.com/caltechlibrary/cold/issues)

## Programming languages

- CSS
- HTML
- JavaScript
- JSON
- shell (Bash)
- SQL
- Typescript
- YAML


## Operating Systems

- Linux


## Software Requirements

- Deno >= 2.8.2
- Dataset >= 2.5.1
- CMTools >= 0.0.45b
- yq (mikefarah/yq) >= 4.44


## Software Suggestions

- GNU Make
- Pandoc >= 3.9


