
Action items
============

bug
---

- CaltechAUTHORS API pagination (see `caltechauthors_api_pagination.md`)
  - [ ] `run_publications_by_person_identifiers` silently truncates at 1000 records (Goddard-W-A-III has 1542 matching records; ~542 missing from report output)
  - [ ] Add shared `caltechauthors_api.ts` with `fetchAllRecords()` (pagination via `links.next` + generalized 429 retry/backoff)
  - [ ] Update `publications_by_person_identifiers.ts` to use `fetchAllRecords()`
  - [ ] Update `generate_collaborator_rpt.ts` to use `fetchAllRecords()`
  - [ ] Update `generate_collaborator_affiliations_rpt.ts` to use `fetchAllRecords()`
  - [ ] Update `generate_country_collaboration_rpt.ts`'s `fetchRecordsForBatch` to use `fetchAllRecords()` per batch

next
----

- Issue #106
  - [x] Issue #106 fixes committed, test fixes and then release
  - [x] Update production cold to include bug fixes and issue #106 improvements in v0.0.50 release
- Search CaltechTHESIS form
  - [x] On Thesis search fix ORCID to search all orcid fields not just authors's orcid
  - [x] Only Item status should have pre-checked boxes (Live Archive, Under Review)
- Re-assign clpid for CaltechPEOPLE form
  - [x] Add an "internal notes" box to the form.
    - The internal notes field's content should be populated by the existing record's internal notes (so we don't loose the cummulative notes)
- In the Search RDM Records tool
  - [ ] Add a "reviewer" column to the exported CSV generated from the Download button

Someday, maybe
--------------

- [ ] Funders Report
- [ ] UI Widgets to manage objects in list
  - [ ] Person and Organization widget
  - [ ] Group widget
  - [ ] Funder widget
  - [ ] Vocabulary widgets
- [ ] Implement a CL-v2.js with support for feeds, cold and RDM dataset sources

