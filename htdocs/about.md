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
version: 0.0.54
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

date_released: 2026-09-25
---

About this software
===================

## cold 0.0.54

- Issue #104 (harvest half only): rdm_requests.ds now carries `reviewers` and `reviewer_names` on every request. The reviewer field turned out to be real, first-class RDM data (request.reviewers, gated by REQUESTS_REVIEWERS_ENABLED) rather than something derived from community membership, and it was simply never selected before. Four scoping decisions in DR-0025: users only this cut (zero production requests carry a group-type reviewer, so there was nothing to resolve against), reviewer_names joined with "; " matching the existing groups column's convention, username rather than full_name matching submitted_by's convention, and it ships alone rather than bundled with #104's later UI comments
- No incremental-harvest code change was needed: the incremental shares emit_harvest_sql with the full harvest (DR-0014 decision 8), so both fields arrived automatically on its next scheduled tick -- verified against live production counts rather than assumed
- This is the data foundation only. cold_api.yaml has no review_queue_by_reviewer query and rdm_review_queue.ts has no Reviewer column, CSV field, or search-dropdown option yet -- #104 stays open for that UI cycle, plus Tom's later asks (title/publisher search, a client-side sortable-table rearchitecture, splitting the live queue into its own URL path, matching irdm-queue-portal's sort/order UI)
