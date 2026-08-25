# CaltechAUTHORS API pagination for COLD reports

## Problem Summary

`publications_by_person_identifiers.ts` (`run_report()`, lines 246-264) queries
the CaltechAUTHORS RDM API for a person's records with `size=1000` and no
pagination. Confirmed live against the API: Goddard-W-A-III currently matches
1542 records (`hits.total`), so the report silently drops roughly 542 records
(35%) with no error, warning, or indication of truncation. This is the bug
reported as "missing publications" compared to the Feeds combined.html list.

The same pattern -- one `fetch()`, `size=1000`, no page-following -- exists in
three other report scripts that hit the same API:

| Script | Query shape | Existing extras |
|---|---|---|
| `publications_by_person_identifiers.ts:246-264` | single clpid/orcid | -- |
| `generate_collaborator_rpt.ts:41-79` | clpid + 48-month date range | -- |
| `generate_collaborator_affiliations_rpt.ts:138-169` | clpid + 48-month date range | ROR country lookups |
| `generate_country_collaboration_rpt.ts:158-217` | batched OR-clause over many ROR IDs | 429 rate-limit retry/backoff, inter-batch delay |

All four are subject to the same silent-truncation bug (the country report
per-batch, not just overall).

## Design

**Problem statement:** any CaltechAUTHORS RDM API query with more than `size`
matching records is silently truncated at the requested page size, with no
way for a caller or end user to detect it happened.

**Constraints** (from `CLAUDE.md`): standard-library-first, minimal
third-party deps (none needed -- `fetch` is native), keep it simple and
maintainable, and reuse existing project conventions (`deps.ts` re-export
pattern already used for `Dataset`/`DatasetApiClient`).

**Proposed approach:** the InvenioRDM API already makes pagination trivial --
confirmed live that `data.hits.total` is a plain integer and `data.links.next`
hands back a ready-made next-page URL. So the fix is a loop that follows
`links.next` until it's absent, accumulating `hits.hits` into one array, with
a page-count safety ceiling and a stderr warning if it's hit.

**Should this be shared code?** Yes. Setting the truncation bug aside, these
four scripts already duplicate roughly 20-30 lines of near-identical
fetch/error-handling/JSON-shape code (and duplicate `PersonOrOrg`/
`Identifier`-style interfaces almost verbatim). Fixing pagination in four
places means four copies of retry/backoff/paging logic to maintain and test.
`generate_country_collaboration_rpt.ts` already has 429 retry/backoff logic
(lines 171-196) that only benefits that one report today -- after adding
pagination, every report will issue more requests per run and so all of them
become more exposed to rate limiting, not just the country report.

Recommendation: extract a small shared module, `caltechauthors_api.ts`,
re-exported from `deps.ts` alongside the other shared modules, exposing one
function:

```ts
export async function fetchAllRecords(
  apiUrl: string,          // fully-built URL including q= and size=
  opts?: { maxPages?: number },
): Promise<unknown[]>
```

It owns: the fetch, the 429 retry/backoff (migrated from the country report
and generalized), the `links.next` page-following loop, and the safety-ceiling
warning. It deliberately does not own query-building or record typing -- each
report keeps its own `Record`/`Creator`/etc. interfaces and casts the returned
array, since the four reports' query shapes and needed fields differ enough
that forcing one shared domain type would add coupling without real benefit.
This keeps the shared surface to the one thing that's actually identical
(HTTP + pagination + retry), not to things that only look similar.

## Decision

- **Chosen:** shared `fetchAllRecords()` helper in a new
  `caltechauthors_api.ts`, used by all four scripts; retry/backoff
  generalized from the country report into the helper.
- **Rejected -- fix each script independently:** faster short-term, smaller
  individual diffs, but leaves four copies of paging/retry logic; the next
  API quirk (rate limits, a schema change) needs four fixes instead of one.
  Given three of the four already had identical single-page code before this
  bug even existed, duplication is already a maintenance smell independent of
  this fix.
- **Rejected -- force a shared record/type model:** would reduce some
  interface duplication too, but the four reports genuinely need different
  fields (`funding`, `custom_fields["journal:journal"]`,
  `additional_descriptions`, contributors vs. creators-only) -- unifying that
  would make the shared module a leaky abstraction for a small typing win.
  Leaving per-report interfaces as-is.
- **Open question, since resolved:** whether to also drop the undocumented
  `all=1` param (present in all four scripts) while touching this code, since
  it appears to be a no-op (not a documented InvenioRDM search parameter).
  Left out of scope for the pagination fix unless explicitly requested as a
  follow-up cleanup. *Resolved 2026-08-25: removed from all four scripts after
  confirming against the live API that it is unrecognized and silently ignored.
  See `decisions/0007-drop-the-undocumented-all-1-query-parameter-from.md`.*

## Implementation Plan

1. `caltechauthors_api.ts` (new) -- `fetchAllRecords(apiUrl, opts)`:
   page-follow loop via `links.next`, 429 retry/backoff (generalized from
   `generate_country_collaboration_rpt.ts:171-196`), page-count ceiling with a
   stderr warning if hit, returns `unknown[]` of accumulated `hits.hits`.
2. `deps.ts` -- add the re-export line for the new module, matching the
   existing pattern.
3. `publications_by_person_identifiers.ts:246-264` -- replace the single
   fetch with `fetchAllRecords()`; no changes needed to the three
   output-format branches since they already just iterate over `records`.
4. `generate_collaborator_rpt.ts:69-79` and
   `generate_collaborator_affiliations_rpt.ts:160-169` -- same swap.
5. `generate_country_collaboration_rpt.ts:158-217` -- replace
   `fetchRecordsForBatch`'s inline fetch+retry with a call into the shared
   helper per batch (still batched by ROR ID, just each batch call now pages
   fully); the existing per-record match-against-batch logic (lines 201-214)
   is unaffected.
6. Version/changelog/`TODO.md` entry once implemented (this project tracks
   fixes as numbered issues in `TODO.md`, per the Issue #106 precedent).

**Test-ability note:** none of these `run_report()` functions have a seam to
mock the HTTP layer. Plan for TDD: give `fetchAllRecords()` an optional
injectable `fetchFn` (defaulting to global `fetch`) so tests can supply a mock
that returns a small multi-page fixture (e.g. 3 pages of 2 records with
`links.next` chained, then no `links.next`) and assert the helper:

- follows all pages,
- stops correctly,
- respects the page ceiling,
- retries once on a mocked 429.

That's the natural first failing test, before writing `fetchAllRecords`
itself.
