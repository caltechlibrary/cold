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
version: 0.0.53
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

date_released: 2026-09-18
---

About this software
===================

## cold 0.0.53

- Issue #105: a technical reports report. It is a metadata triage tool rather than a listing, selecting the union of every record typed publication-technicalnote with every record carrying any of the four custom series fields whatever its type -- about 19,400 rows. The union is what makes a misclassified record visible, which a type-restricted query cannot do by definition (DR-0011). Sorting by series puts a misfiled record next to its correctly-typed siblings
- The report is sourced from rdm_requests.ds through a datasetd named query rather than the CaltechAUTHORS API, which removes the 10,000-result window along with the resource-type slicing, two guards and roughly 75 HTTP requests that working around it required (DR-0012). The query projects five fields rather than whole rows: 8 MB instead of 83 MB for the same 19,431 rows
- DR-0022 corrects one clause of DR-0012: the report must NOT filter is_latest. Every harvested row is already its parent's newest present version (DR-0015), so that flag means "unchanged since submission", and filtering on it would drop 5,821 works for no reason beyond having been re-versioned. The unfiltered selection reproduces all four of DR-0011's independently measured figures within +2
- The report distinguishes a failed query from an empty one. Dataset.query() returns undefined for any non-ok response and an empty array for a genuinely empty result; conflating them would emit a header-only CSV and exit 0 when datasetd is down, so the runner would mark the report completed and hand the requester an empty file. Zero rows is success (DR-0009); a failed request is not. The same conflation remains in generate_country_collaboration_rpt.ts and is filed upstream against dataset and ts_dataset
- The documentation site is built in CI from docs/ by the shared caltechlibrary/workflows repository, and generated HTML is no longer committed (workspace DR-0010, closed by DR-0021). Retired: static.yml, website.mak, page.tmpl, the orphaned cold_page.tmpl, both Lua filters, the website target and 38 stale root .html files. Man page sources moved into docs/
- make and make test no longer require CMTools: version.ts and CITATION.cff moved from the build target to release, so a deployment needs no cmt at all. Five documents still listed CMTools as a build or deployment requirement and were corrected; docs/deployment.md also claimed Deno 2.2.0 against a project whose browser bundling has needed 2.7 since April
- Every external import now resolves through deno.json's import map. Eleven bypassed it with an inline jsr: specifier or a deno.land URL, each pinning whatever version the generating model had been trained on. Floating "@*" specifiers go from 6 to 0 and remote URL entries from 65 to 8 -- 27 of those came from a single import of deno.land/std@0.200.0/assert. A lint_imports task enforces no-import-prefix and no-unversioned-import in both test and check
- bundle.ts is removed: unreferenced by any task or target, superseded by the native deno bundle task for the same file, and it did not compile. build.ts loses its transpile half, dead since the note in its own source marking the v2.7 switch to deno bundle, going from 106 lines to 50 and from 6 type errors to 0. Neither had been in the check task, which is why both went unnoticed
- Formatting is deno's own default rather than a personal .editorconfig, pinned in deno.json and scoped to JavaScript and TypeScript so prose is left alone (workspace DR-0011 and DR-0012)
