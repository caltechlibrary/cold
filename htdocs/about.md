---
title: cold
abstract: |-
  Caltech Library maintains a list of people, groups and funders and their related identifiers. For many years these were managed using a spreadsheets. That has become cumbersome. **COLD** manages data as JSON objects in [dataset](https://github.com/caltechlibrary/dataset) collections.

  **COLD** is implemented as three web web services

  - cold web UI
  - cold JSON API (provided by datasetd)
  - cold reports (the report request system)

  Reports are implemented as a set of programs or bash scripts.

  TypeScript+Deno is used to implement the web UI and report system.
  The JSON API is provided by Dataset's datasetd.
  Access control is provided by the front end web server integrated with Shibboleth.
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
version: 0.0.45
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

date_released: 2026-05-18
---

About this software
===================

## cold 0.0.45

- Improved publications by person identifier report
  - by Person Identifiers CSV column headings to search_clpid and search_orcid
- Implemented CaltechTHESIS Administrative Search to COLD following similar structure

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
The JSON API is provided by Dataset's datasetd.
Access control is provided by the front end web server integrated with Shibboleth.

- [License](https://caltechlibrary.github.io/cold/LICENSE)
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

- Deno >= 2.7.12
- Dataset >= 2.4.0
- CMTools >= 0.0.43


## Software Suggestions

- GNU Make
- Pandoc >= 3.9


