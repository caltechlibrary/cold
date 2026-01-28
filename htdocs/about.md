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
version: 0.0.34
license_url: https://caltechlibrary.github.io/cold/LICENSE
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

date_released: 2026-01-28
---

About this software
===================

## cold 0.0.34

- Implemented changes in issue #90, restricted dataset version to 2.2.0 due to bug in people_names query processing.

### Authors

- R. S. Doiel, <https://orcid.org/0000-0003-0900-6903>


### Contributors

- Kathy Johnson, <https://orcid.org/0000-0002-0026-2516>
- Thomas E Morrell, <https://orcid.org/0000-0001-9266-5146>


### Maintainers

- R. S. Doiel, <https://orcid.org/0000-0003-0900-6903>


Caltech Library maintains a list of people, groups and funders and their related identifiers. For many years these were managed using a spreadsheets. That has become cumbersome. **COLD** manages data as JSON objects in [dataset](https://github.com/caltechlibrary/dataset) collections.

**COLD** is implemented as three web web services

- cold web UI
- cold JSON API (provided by datasetd)
- cold reports (the report request system)

Reports are implemented as a set of programs or bash scripts.

TypeScript+Deno is used to implement the web UI and report system.
The JSON API is provided by Dataset&#x27;s datasetd.
Access control is provided by the front end web server integrated with Shibboleth.

- License: <https://caltechlibrary.github.io/cold/LICENSE>
- GitHub: <https://github.com/caltechlibrary/cold>
- Issues: <https://github.com/caltechlibrary/cold/issues>

### Programming languages

- CSS
- HTML
- JavaScript
- JSON
- shell (Bash)
- SQL
- Typescript
- YAML


### Operating Systems

- Linux


### Software Requirements

- Deno >= 2.6.6
- Dataset = 2.2.0
- CMTools >= 0.0.40


### Software Suggestions

- GNU Make
- Pandoc 3.1


