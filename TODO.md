
Action items
============

Start here — after v0.0.55
--------------------------

**Issue #104's reviewer column ships in v0.0.55. The issue stays open** —
title/publisher search, the URL-path split and matching `irdm-queue-portal`'s
sort/order UI are a follow-up design cycle, in progress; see below.
v0.0.54 shipped the harvest half (`reviewers`/`reviewer_names` on every
request, DR-0025). This release ships the UI half: `cold_api.yaml` gains
`review_queue_by_reviewer`, a paired `by_reviewer` (all-records), and
`get_all_reviewer_usernames` for autocomplete; `rdm_review_queue.ts` gains a
`Reviewer` column (table + CSV) and matching search-dropdown options. Key
record is **DR-0026** — three scoping decisions: pair `by_reviewer` with
`review_queue_by_reviewer` for consistency even though only the review-queue
case was originally asked for, place the column after `Submitted By`, and
back autocomplete with a new `reviewer_usernames` harvest field (a JSON
array alongside the existing `reviewer_names` string) rather than parsing
`reviewer_names` client-side. That field required a second full re-harvest
to backfill, already run in production. Two real bugs were found and fixed
building `get_all_reviewer_usernames` — both in how SQLite's `json_each`
interacts with `datasetd`'s response encoding, neither in the query logic —
see `cold` observations 424–425 for the detail, worth reading before writing
any future `cold_api.yaml` query that sources from `json_each`. Manual
testing before release also caught a gap the design brief didn't cover:
`run_authors_review_queue_csv.bash` and its all-records sibling
`run_authors_records_csv.bash` are separate report scripts, each with their
own hand-picked column list read straight from `rdm_requests.ds` via
`dsquery` — the UI-half work didn't touch them automatically, so both
needed `reviewer_names` added by hand. Also caught: `deno task build` does
not rebuild `htdocs/modules/*.js` (that's `deno task htdocs`, or the
Makefile's own `make build` target, which is a different thing despite the
name) — see `docs/release_process.md`'s Traps section and observation 426.
**Remaining asks from later comments on #104** — title/publisher search (or a
client-side sortable-table rearchitecture, tmorrell offered both as
alternatives), splitting the live queue into its own URL path, matching
`irdm-queue-portal`'s sort/order UI — are being taken through their own
design/decide/plan cycle before this issue closes, per RSDOIEL's explicit
call that the release waits on all of #104's comments being addressed, not
just the reviewer column.

**Issue #112 (A11y: wrong `<title>` on every htdocs page) fixed in v0.0.55.**
`build.ts` hard-coded `page_title: "COLD Public API"` for all seven
generated pages, discarding each page's own front-matter `title:` — a WCAG
2.4.2 Page Titled defect. Now reads `attrs.title`. Found while triaging open
issues for this release, not part of #104.

**Issue #113 (`codemeta.json` still listing CMTools as a requirement)
already fixed, closed via v0.0.55's release comment.** Commit `a815d41`
(2026-09-24, predates this cycle) had already moved it to
`softwareSuggestions`; the issue was just never closed. No code change
needed — found while triaging open issues for this release.

**Issue #105 shipped in v0.0.53 and is deployed.** The technical reports
report is live in production, registered and verified end to end through the
reports UI. Key record is **DR-0022** — never filter `is_latest`.

**Issue #109 shipped in v0.0.52 and is deployed.** Production has run the
harvest pair against `rdm_requests.ds` since that release.

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
      same crontab. Now tracked as **issue #111**, scoped wider than a cron
      check: a general alerting facility surfaced in COLD itself, displayed in
      the UI and possibly emailed. See `cold` observations 370 and 371.
- [x] ~~Deploy v0.0.53~~ — released and deployed 2026-09-18, technical reports
      report live in production.

### Issue #105 follow-ups

- [x] ~~Settle the definition with Phil~~ — shipped on DR-0011's reading, the
      union of the four custom series fields with the technical report resource
      type, which measures 19,431. Phil's literal "or groups field" wording
      would be 51,450 rows and was **not** adopted; if he wants that, it is a
      change request, not a bug. See observation 300.
- [x] ~~Tony has still never confirmed which groups his variant covers~~ —
      moot. **Issue #110 was cancelled on 2026-09-21**, the day it was
      designed: the technical reports report already answers the need, read
      into a spreadsheet and pivoted by group. No code was written and the one
      `cold_api.yaml` change was reverted. See **DR-0024** (which supersedes
      DR-0023) and `cold` observation 381; the feature request, design brief
      and implementation plan are kept under `agents/projects/cold/` as the
      record of what was designed.
- [ ] **`generate_country_collaboration_rpt.ts:147` conflates a failed query
      with an empty one** (`return results ?? []`), the defect the technical
      reports report deliberately avoids. Filed upstream as `dataset` and
      `ts_dataset` TODO items; the local fix is independent of those.

### Found while designing #110 — outlived it, each wants its own record

- [ ] **The middleware never enforces an input's `required` flag.**
      `Inputs.required` is declared in `cold_reports.ts` and read from
      `cold_reports.yaml`, but nothing checks it before the command runs, so
      the runner's shell guard is load-bearing rather than belt-and-braces.
      That contradicts DR-0002's "every layer re-validates". Affects all four
      existing mediated reports.
- [ ] **`generate_collaborator_rpt` and `publications_by_person_identifiers`
      ship in no release tarball.** Both are built into `bin/` by
      `deno task build` but appear in none of the six `release_*` tasks in
      `deno.json` (verified 2026-09-21). Registering a report in `build` is
      not the same as shipping it. Note also that the `Makefile`'s `PROGRAMS`
      variable is declared and never referenced anywhere in the file.
- [ ] **The report queue table shows only `report_name`**, so two runs of the
      same parameterized report for different inputs are indistinguishable in
      the list — only the link filename tells them apart. Gets worse with a
      fifth mediated report people will run repeatedly.

### Carried over

- [ ] **No measured baseline for the pre-restructure full harvest.** 26m27s may
      or may not be a regression; timing `38ba5b9`'s version once settles it
      (DR-0019).
- [x] ~~`deno.lock` oscillates between three sizes~~ — **fixed 2026-09-25.**
      All 16 `deno bundle --config tsconfig.json` tasks in `deno.json` now
      also pass `--lock=htdocs.lock`, so they read/write a separate lock
      file instead of rewriting the main `deno.lock` down to just their own
      (all locally-only, no external-dependency) graph. Verified: running
      every bundle task individually and via `deno task htdocs` (all 16 at
      once) leaves the main `deno.lock` with zero diff. `htdocs.lock` itself
      never actually materializes under normal operation, since none of the
      16 browser-side entry points currently import anything external
      (jsr:/npm:) — harmless; it'll appear the day one of them does. No more
      "check `git diff deno.lock` before committing a release" step needed
      in `docs/release_process.md`'s Traps section, though that note stays
      as history of why the discipline existed.
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

