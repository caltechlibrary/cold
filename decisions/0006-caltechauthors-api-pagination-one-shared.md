---
id: "0006"
title: "CaltechAUTHORS API pagination: one shared `fetchAllRecords()` for all four report scripts"
date: "2026-08-24"
status: accepted
kind: correction
trigger: request
project: cold
phase: "0.0.51"
supersedes: []
superseded_by: []
relates_to: ["0007"]
initiative: ""
session: ""
decisions: []
tags: [reports, caltechauthors, pagination]
uuid: "ac58d73f-7c69-441d-aff1-9b6ba7c52eaf"
origin_host: "MACMINI-RD.local"
---

**Context.** `run_publications_by_person_identifiers` silently truncated its
results at 1000 records, with no error and no warning. Confirmed against the
live API: `Goddard-W-A-III` has 1542 matching records, so roughly 542 were
missing from the report output and nothing in the report said so.

The root cause was a single fetch with `size=1000` and no pagination. All four
CaltechAUTHORS RDM API report scripts had it —
`publications_by_person_identifiers.ts`, `generate_collaborator_rpt.ts`,
`generate_collaborator_affiliations_rpt.ts`, and
`generate_country_collaboration_rpt.ts`.

**Decision.** A shared `fetchAllRecords()` helper in a new
`caltechauthors_api.ts`, used by all four scripts. It pages via the API's own
`links.next` until exhausted, carries 429 rate-limit retry/backoff generalized
from the country report, and has a page-count safety ceiling.

**Rationale.** Paging by `links.next` follows the API rather than guessing at
totals or page arithmetic. Putting it in one module means the next API quirk —
a rate-limit change, a schema change — is one fix rather than four.

**Rejected alternatives.**
- *Fix each script independently* — faster short-term and smaller individual
  diffs, but it leaves four copies of paging and retry logic. Three of the four
  already had identical single-page code before this bug existed, so the
  duplication was already a maintenance smell independent of this fix.
- *Force a shared record/type model across the four reports* — would reduce
  some interface duplication too, but the four reports genuinely need different
  fields (`funding`, `custom_fields["journal:journal"]`,
  `additional_descriptions`, contributors vs. creators-only). Unifying that
  would make the shared module a leaky abstraction for a small typing win.
  Per-report interfaces are left as they are.

**Consequences.**
- Built test-first: `caltechauthors_api_test.ts` with mocked `fetch`/`sleep`,
  plus a new `publications_by_person_identifiers_test.ts`.
- Confirmed locally against the original problem report before release.
  Shipped as v0.0.51.
- Design and decision narrative: `caltechauthors_api_pagination.md`.
- Left an open question about the undocumented `all=1` parameter, deliberately
  out of scope — see [DR-0007](0007-drop-the-undocumented-all-1-query-parameter-from.md).
