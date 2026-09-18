
Action items
============

Start here — after v0.0.53
--------------------------

**Issue #105 is DONE and goes out in v0.0.53.** The technical reports report is
built, registered and verified end to end through the reports UI: 19,431 rows,
16 resource types, zero column shifts. Key record is **DR-0022** — never filter
`is_latest`. Also in this release: the docs site moved to CI from `docs/`
(DR-0021), `make`/`make test` are CMTools-free, every import resolves through
the import map with a lint gate enforcing it, and `bundle.ts` is gone.

**Issue #109 shipped in v0.0.52 and is deployed.** An earlier version of this
file said production "still runs the retired harvest scripts" — that was wrong.
Production has run the new pair against `rdm_requests.ds` since the release.

### Not done, and it is the first thing

- [ ] **Nothing watches whether a harvest succeeded.** Both RDM cron lines end
      `>/dev/null 2>&1`, and on 2026-09-18 that hid an **8-day total outage**:
      the caltechauthors-v13 cutover changed the load balancer's SSH host keys,
      every 15-minute harvest died at `REMOTE HOST IDENTIFICATION HAS CHANGED`,
      and the review queue UI plus every RDM-derived report served 2026-09-10
      data for eight days. Fixed, but only because someone happened to look at
      a timestamp. `rdm_requests_lastmod.txt` holds a UTC timestamp written
      only on success, so "older than an hour during working hours" is a
      cheap alarm. The same shape applies to the CaltechTHESIS pair on the
      same crontab. Wants a decision record — see `cold` observations 370 and
      371.
- [ ] **Deploy v0.0.53** once cut, so the technical reports report reaches
      production.

### Issue #105 follow-ups

- [x] ~~Settle the definition with Phil~~ — shipped on DR-0011's reading, the
      union of the four custom series fields with the technical report resource
      type, which measures 19,431. Phil's literal "or groups field" wording
      would be 51,450 rows and was **not** adopted; if he wants that, it is a
      change request, not a bug. See observation 300.
- [ ] Tony has still never confirmed which groups his variant covers.
- [ ] **`generate_country_collaboration_rpt.ts:147` conflates a failed query
      with an empty one** (`return results ?? []`), the defect the technical
      reports report deliberately avoids. Filed upstream as `dataset` and
      `ts_dataset` TODO items; the local fix is independent of those.

### Carried over

- [ ] **No measured baseline for the pre-restructure full harvest.** 26m27s may
      or may not be a regression; timing `38ba5b9`'s version once settles it
      (DR-0019).
- [ ] **`deno.lock` oscillates between three sizes** because 16 `deno bundle`
      tasks pass `--config tsconfig.json`, which rewrites the project lock to
      that config's graph. `make` prunes it, a test run restores it. Options:
      `--no-lock` on those tasks, a separate `--lock=htdocs.lock`, or moving
      `tsconfig.json` out of the project root.
- [ ] 82 unused local variables reported by `deno lint`, and 50 of 62 root
      modules are absent from the `check` task — most are covered transitively,
      but an entrypoint nothing imports is invisible, which is how `bundle.ts`
      stayed broken.

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

