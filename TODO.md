
Action items
============

Start here — 2026-09-09
-----------------------

Two pieces of work, in this order. The harvest redesign is a **prerequisite**
for the reports; do not start the reports first.

### 1. RDM harvest redesign (issue #109) — DR-0013, accepted

Design brief: `agents/projects/cold/design/rdm_requests_harvest.md` (in the DLD
workspace). Decisions: DR-0013 and DR-0014 (nine plan-shaping answers,
2026-09-09), both accepted, plus **DR-0015 (proposed)** — Phase 0 verification
found the harvest is pinned to the version each record was submitted as, 34% of
which are superseded, so it now follows the parent's newest present version.
Plan:
`agents/projects/cold/plans/rdm_requests_harvest_plan.md`, nine phases, each a
stopping point. Phase 0 is done; its counts are the expected values every later
phase is checked against, and Phase 2's done-when now includes confirming
DR-0015 changed the ~28,225 `creators` and ~4,474 `custom_fields` rows it
predicted.

The problem in one line: a librarian works on a record, comes back to it later
in COLD, and it looks like nothing has changed.

- [x] Write the implementation plan into `agents/projects/cold/plans/` --
      `rdm_requests_harvest_plan.md`, 2026-09-09
- [x] Phase 0: production verification COMPLETE 2026-09-09 (run from
      apps.library.caltech.edu; the Mac Mini is outside the RDM ELB's
      `caltech-ssh` source restriction). `deletion_status` is `'P'` present /
      `'D'` deleted, expected full harvest is 111,231 rows, and the unindexed
      scan is 17 ms so no RDM index is needed. KB observations 289-293
- [ ] Accept or amend DR-0015, then start Phase 1. **Phase 2 is blocked on that
      record** — it changes the records-side join and what `rdmid` means
- [ ] `dataset init rdm_requests.ds` — the rename needs no migration, the full
      harvest reproduces everything from RDM
- [x] `remote_harvest_rdm_requests_full.bash` + shared `rdm_requests_harvest_sql.bash`
      — written 2026-09-09, shellcheck clean, semantics verified offline against
      synthetic fixtures in a throwaway Postgres cluster (21 assertions). Not yet
      run against production. Named per DR-0016
- [ ] `remote_harvest_rdm_requests_incremental.bash` — three passes, each its own JSON-L:
      all currently-submitted (~917 rows, unconditional); everything changed
      since `rdm_requests_lastmod.txt`; prune cancelled/declined/tombstoned. Passes 2
      and 3 select by parent, not by row (DR-0015)
- [ ] Retire `remote_harvest_rdm_review_submissions.bash` and
      `remote_harvest_rdm_review_queue.bash` (replaced, not amended)
- [ ] `cold_api.yaml` — dataset name plus **twelve** `FROM rdm_review_queue`
      query bodies (a collection's SQL table name is its basename), restart
      `datasetd`
- [ ] Update the other references to the old collection name:
      `generate_country_collaboration_rpt.ts`, `authors_review_queue_csv.sql`,
      `authors_submissions_csv.sql`, `deno.json`, `list_mentions.bash`, docs
- [ ] Document the new cadence in `crontab-example` — it has CaltechTHESIS
      entries but **no RDM entries at all** today
- [ ] **Verify `deletion_status`'s value domain against production before
      trusting the tombstone exclusion.** `'P'` looks like the present state but
      that is inferred from schema context, not observed. Everything else in the
      design was checked offline; this one could not be.

Do not rename the review-queue *feature* — the browser module, page and UI keep
their names. Only the collection was misnamed.

### 2. Technical reports + group custom numbering reports (issue #105)

Ships the release cycle *after* the harvest work. DR-0008, DR-0011, DR-0012.
Plan: `agents/projects/cold/plans/technical_reports_report_plan.md` — **needs
rewriting**, it still describes the CaltechAUTHORS-API approach that DR-0012
superseded.

- [ ] Rewrite the plan against DR-0012 (source from `rdm_requests.ds` via a
      `cold_api.yaml` named query, not the CaltechAUTHORS API)
- [ ] Revise `generate_technical_reports_rpt_test.ts` — 23 tests exist and pass;
      the 4 URL-builder tests go, and `recordToRow`'s input shape changes from
      API-nested (`metadata.title`) to the flat harvested JSON (`title`)
- [ ] Revise `generate_technical_reports_rpt.ts` — `Dataset.query()` replaces
      `fetchAllRecords()`; `recordToRow`/`compareRows`/`buildCsv` survive
- [ ] Rewrite `generateTechnicalReportsRptHelpText` — it describes the old
      selection, and it is the man-page source
- [ ] Build wiring in `deno.json` and `Makefile` is **already done** and stands
- [ ] Re-measure the expected row count after the re-harvest (DR-0011's 19,429
      was API-derived and will not match)
- [ ] Tony's group-custom-numbering report — still blocked on him confirming
      which groups

Worth raising with Tom independently: the technical reports population is
~19,429 on the agreed selection, not the ~5,000 he estimated.

bug
---

- CaltechAUTHORS API pagination (see `caltechauthors_api_pagination.md`, now in `agents/projects/cold/design/`) -- RESOLVED 2026-08-24, confirmed fixed on a local dev run of the original problem report, released as v0.0.51
  - [x] `run_publications_by_person_identifiers` silently truncates at 1000 records (Goddard-W-A-III has 1542 matching records; ~542 missing from report output)
  - [x] Add shared `caltechauthors_api.ts` with `fetchAllRecords()` (pagination via `links.next` + generalized 429 retry/backoff)
  - [x] Update `publications_by_person_identifiers.ts` to use `fetchAllRecords()`
  - [x] Update `generate_collaborator_rpt.ts` to use `fetchAllRecords()`
  - [x] Update `generate_collaborator_affiliations_rpt.ts` to use `fetchAllRecords()`
  - [x] Update `generate_country_collaboration_rpt.ts`'s `fetchRecordsForBatch` to use `fetchAllRecords()` per batch

next
----

- Drop the undocumented `all=1` query param on CaltechAUTHORS API calls -- RESOLVED 2026-08-25, see `decisions/0007-drop-the-undocumented-all-1-query-parameter-from.md` (DR-0007). Confirmed against the live API rather than inferred: `all=1` returns identical totals and identical record ids to both the baseline and an invented parameter, while `allversions=1` does change the result -- so it is unrecognized and silently ignored. Each site now has a regression test asserting the parameter's absence, since removing a no-op has no observable runtime effect to confirm.
  - [x] `publications_by_person_identifiers.ts` (`buildRecordsQueryUrl`)
  - [x] `generate_collaborator_rpt.ts` (`buildRecordsQueryUrl`)
  - [x] `generate_collaborator_affiliations_rpt.ts` (`buildRecordsQueryUrl`)
  - [x] `generate_country_collaboration_rpt.ts` -- URL construction extracted from `fetchRecordsForBatch` into a new exported `buildBatchQueryUrl()` so it could be tested at all; new `generate_country_collaboration_rpt_test.ts` gives it its first coverage (4 tests)
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

