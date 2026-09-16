
Action items
============

Start here — v0.0.53
--------------------

**Issue #109 is DONE and released as v0.0.52 (2026-09-09).** The RDM harvest
redesign shipped: `rdm_requests.ds`, a full/incremental pair, version-following,
upsert-and-sweep, a harvest lock, and the cut-over of `cold_api.yaml`. Eight
decision records, DR-0013 through DR-0020, all accepted. Hand-off:
`agents/hand-off/2026-09-09T190000Z-cold-rdm-harvest-phases-0-through-2-and-the-incremental-redesign.spmd`.

### Not done, and it is the first thing

- [ ] **Deploy v0.0.52 to production.** It still runs the retired harvest
      scripts against `rdm_review_queue.ds`. The first full harvest takes about
      26 minutes; the queue then shows 918 rows rather than 917.
- [ ] **Warn Tom and Phil before that run, not after.** 28,223 rows have
      corrected creator lists and the ROR set grew from 5,853 to 6,805, so the
      collaborator, affiliation and country-collaboration reports will produce
      different numbers. The change is a correction — those rows described 2023
      versions — but it will look like a regression if it arrives unannounced.

### Issue #105, the technical reports report — v0.0.53

- [ ] **Settle the definition with Phil first; this is not a coding task.** His
      wording is "at least one of the 4 custom series fields **or groups
      field**". Taken literally that is **51,450** rows, because
      `caltech:groups` is populated on 41,983 records. DR-0011 read it as
      series-only, which measures **19,548** — within 0.6% of the 19,429 it
      derived from the API. Tom estimated ~5,000. See observation 300.
- [ ] Tony has still never confirmed which groups his variant covers.
- [ ] Rewrite `agents/projects/cold/plans/technical_reports_report_plan.md`. It
      describes the CaltechAUTHORS API approach DR-0012 superseded, and DR-0015
      and DR-0018 then changed the field shape underneath it.
- [ ] `generate_technical_reports_rpt.ts` and its 23 tests are **untracked** in
      the working tree. v0.0.52 removed the `deno.json` and `Makefile`
      references to them, since committed build config pointed at a file no
      clean checkout has. Both come back together.
- [ ] `recordToRow` reads a different object now: `rdmid` is the current
      version, `submitted_rdmid` is the submitted one, `is_latest` matters, and
      timestamps are full ISO.

### Carried over

- [ ] **No measured baseline for the pre-restructure full harvest.** 26m27s may
      or may not be a regression; timing `38ba5b9`'s version once settles it
      (DR-0019).
- [ ] `htdocs/modules/mdt.js` is uncommitted — a rebuild carrying a different
      metadatatools version, which changes what the app ships.
- [ ] Twelve `.1.md` man pages are generated; `generate_technical_reports_rpt.1.md`
      was removed in v0.0.52 and returns with its program.

### Duplicate record report — new, requested 2026-09-16

- [ ] **Add a duplicate record report for CaltechAUTHORS**, so the RDM-side
      de-duplication campaign has a progress measure. Asked for after
      diagnosing feeds issue #146, where deleted-but-still-harvested duplicates
      were surfacing on people pages
      (`feeds.library.caltech.edu/people/Katz-J-N`). Full diagnosis:
      `agents/projects/feeds_v1.6/design/duplicate-citations-from-deleted-rdm-records.md`.

      **Do not key this on DOI.** Measured against the 2026-09-16 production
      snapshot: among 110,324 live latest-version records there are **zero**
      duplicate `pids.doi` values — RDM enforces DOI uniqueness, so DOI can
      never find a duplicate pair. Worse, a DOI-based report run against
      *feeds* data is actively misleading: `rdm2eprint` flattens
      `metadata.related_identifiers` into the record's own `doi` field, so
      nine distinct Gradinaru-V conference abstracts all carry the containing
      supplement's DOI `10.1016/j.ymthe.2020.04.019` and read as a 9-way
      duplicate. Title plus a shared creator is the workable signal.

      Measured baseline to track against, from
      `rdm_records_metadata` joined to `rdm_versions_state` on
      `latest_id`, `deletion_status = 'P'`, title normalised to
      `[^a-z0-9]+ -> ' '` and restricted to titles over three words (which
      drops "Editorial", "Preface", "Introduction"):

      | measure | groups | surplus records |
      |---|---|---|
      | shared normalised title | 2,485 | 2,668 |
      | shared title **and** shared first creator | 2,140 | 2,273 |

      A falling surplus count is the progress signal. For reference, 50
      records currently carry `deletion_status <> 'P'`, up from 11 on
      2026-07-24 — the campaign so far.

- [ ] Decide the report's source. The RDM Postgres snapshot is already
      restored nightly on `datawork.library.caltech.edu`, which makes this one
      query rather than ~110k API calls; but COLD's existing reports go through
      `caltechauthors_api.ts`. Snapshot access is a new dependency shape for
      COLD and wants a decision, not a default.
- [ ] Expect false positives and design for triage rather than a bare count:
      errata, multi-part papers with a shared stem title, and conference
      abstracts reusing a title all collide. The report should be a worklist
      Tom and Tommy can act on — record ids, titles, creators, resource types,
      created dates, and whether either member already has a DOI — not a
      single number.

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

