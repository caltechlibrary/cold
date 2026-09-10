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
version: 0.0.52
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

date_released: 2026-09-09
---

About this software
===================

## cold 0.0.52

- Issue #109: the CaltechAUTHORS RDM harvest is redesigned. The collection is renamed rdm_review_queue.ds to rdm_requests.ds and is filled by a pair of scripts, remote_harvest_rdm_requests_full.bash nightly and remote_harvest_rdm_requests_incremental.bash every 15 minutes on weekdays. The collection is a mirror of RDM's request and record state; the librarians' review queue is now a view over it. The feature, browser module and page keep the review-queue name -- only the collection was misnamed (DR-0013, DR-0016)
- Three separate causes of "I worked on this record, came back to COLD, and nothing had changed" were found, only one of which was known
- (1) The review-queue harvest had been silently truncating its load since 13 April 2026. One submitted record carrying 2,379 creators serialises to 1.10 MB, and dataset load's scanner buffer defaults to 1 MB -- a too-long line does not skip the record, it stops the load. That record sat at line 471 of 918, so 440 rows had not refreshed in five months while the collection still looked full. Loads now pass -m 8
- (2) A community-submission request names one specific record version, and publishing a new version in RDM does not create a second request, so the harvest was pinned to the version originally submitted on 37,178 of 110,284 published rows -- 34% of the collection, mostly an artefact of the EPrints migration creating a second version. Metadata now comes from each record's newest version that has not been deleted (DR-0015). The rule is the newest version that has not been deleted rather than rdm_versions_state.latest_id, so that a parent whose latest version is deleted still resolves to a surviving earlier one; no parent is in that state today, but RDM permits it
- (3) State transitions between full harvests, the originally reported symptom, are covered by the incremental's parent-level change detection -- necessary because a new version is a new row, so no timestamp on the harvested row can see it
- Visible data changes on the first harvest, all corrections: creators differ on 28,223 rows and custom_fields on 4,469 against the previous collection, and unique_creator_ror_ids grows from 5,853 to 6,805, so the country collaboration report covers about 16% more institutions
- New harvested fields: resource_type, parent_id, is_latest, version_index, record_state, access, submitted_rdmid and has_draft. resource_type had zero occurrences in the entire previous collection and is what unblocks the reports in issue #105
- The full harvest upserts and then sweeps rows it did not touch rather than wiping first, and refuses to sweep unless the rows touched equal the distinct keys in the harvest (DR-0017). An interrupted load now leaves the collection stale but whole; the first production run under the old scheme left it two thirds empty
- Harvest SQL restructured for performance (DR-0018, DR-0019). Records resolve through pidstore_pid's unique index and then by primary key instead of joining on json->>'id', the target version is picked from heap columns with its json fetched afterwards, and @mentions are aggregated in one pass instead of scanning a 280 MB table once per output row. Pass 1 of the incremental went from 32 minutes to 955 milliseconds. The full harvest keeps a streaming plan because it returns 99% of the corpus, and the test suite asserts both plans return identical rows
- A lock allows only one harvest at a time (DR-0020), built on mkdir because flock(1) is absent on macOS, and clearing a lock whose owning process is gone
- created and updated are harvested as full ISO timestamps so a day's activity can be ordered, and are displayed trimmed to the minute in the review queue table and in both CSV exports. The twelve named queries now order by RDM's own timestamps rather than the collection's harvest-time columns
- Cancelled, declined, never-submitted and wholly deleted records are excluded by both harvest scripts, so the queue no longer shows them
- Retired remote_harvest_rdm_review_queue.bash, remote_harvest_rdm_review_submissions.bash and harvest_rdm_review_queue.bash
- crontab-example documents the RDM harvest cadence, which it has never carried -- the schedule previously existed only in the production crontab
- Repository repair: an earlier merge committed the output of a conflicted git stash pop, leaving conflict markers in version.ts and four report programs, so deno task cold and deno task cold_reports could not start from a clean checkout. Resolved in favour of the DR-0006 and DR-0007 work, which restores fetchAllRecords pagination and removes the undocumented all=1 parameter that cleanly-merged hunks had reintroduced in three files
- The repository is reformatted with deno fmt, moving from two-space to four-space indentation per ~/.editorconfig. Whitespace and line wrapping only, with no behaviour change, but merges from older branches will conflict widely

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


