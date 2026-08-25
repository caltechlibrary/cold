---
id: "0007"
title: "Drop the undocumented `all=1` query parameter from the CaltechAUTHORS report scripts"
date: "2026-08-25"
status: accepted
kind: decision
trigger: implementation
project: cold
phase: ""
supersedes: []
superseded_by: []
relates_to: ["0006"]
initiative: ""
session: ""
decisions: []
tags: [reports, caltechauthors, open-question]
uuid: "ef0edd60-4b7d-4dea-a9f6-154edcf93f1b"
origin_host: "MACMINI-RD.local"
---

**Context.** All four CaltechAUTHORS RDM API report scripts pass an
undocumented `all=1` query parameter. InvenioRDM's documented search
parameters are `q`, `size`, `page`, `sort` and `allversions`; `all` is not among
them, and it appears to be a no-op.

This surfaced while implementing the pagination fix
([DR-0006](0006-caltechauthors-api-pagination-one-shared.md)), which touched
`buildRecordsQueryUrl` in three of the scripts and `fetchRecordsForBatch` in
the fourth — the exact call sites that carry the parameter.

**Decision.** Remove `all=1` from all four call sites. It is an unrecognised
parameter that the API silently ignores.

This record was opened on 2026-08-24 with the decision deliberately *not*
made: the pagination fix was already touching all four scripts, "appears to be
a no-op" was an inference from InvenioRDM's documented parameter list rather
than an observation, and removing a parameter from a report that had just been
confirmed correct against a real problem report deserved its own verification
rather than riding along on an unrelated fix.

**Verification (2026-08-25).** Measured against the live API rather than
reasoned about. Same query, `size=5`, comparing both the reported total and the
returned record ids:

| Probe | total | first five ids |
|---|---|---|
| baseline | 1542 | `15fex-ewb28,e1qx9-jsy07,w4sp9-ryv31,jw54y-1c997,xssr3-qq771` |
| `&all=1` | 1542 | identical |
| `&unknownxyz=1` — control | 1542 | identical |
| `&allversions=1` — positive control | **1565** | — |

The two controls are what make this conclusive rather than merely suggestive.
`all=1` behaves exactly like an invented parameter, *and* a genuine parameter
demonstrably changes the result — so the null result is a real finding and not
an API that ignores everything it is sent. Confirmed on a second query shape,
the affiliation/funder form `generate_country_collaboration_rpt.ts` builds:
61,739 records both ways, identical ids.

The 1542 also matches the figure recorded live in
[DR-0006](0006-caltechauthors-api-pagination-one-shared.md), so the corpus had
not shifted between the two measurements.

**Rejected alternatives.**
- *Leave it in place.* Harmless at runtime, and that is the whole argument for
  it. Rejected because an unexplained parameter in four files is a standing
  question for every future reader of that code, and the cost of answering it
  once is four deletions.
- *Keep it and add a comment explaining it is a no-op.* Documents the
  confusion rather than removing it, and the comment would have to be repeated
  four times.

**Consequences.**
- Four call sites change: `params.set("all", "1")` in
  `publications_by_person_identifiers.ts`, `generate_collaborator_rpt.ts` and
  `generate_collaborator_affiliations_rpt.ts`, and the `URLSearchParams({ q,
  all: "1", size: "1000" })` literal in `generate_country_collaboration_rpt.ts`.
- No behaviour change is expected, which is precisely why regression tests
  assert the parameter's *absence* — a silent no-op removal has no observable
  effect to confirm, so the test is the only durable evidence it stayed gone.
- `generate_country_collaboration_rpt.ts` builds its URL inline in a
  network-calling function and had no test coverage for it. The URL
  construction is extracted to an exported function so the assertion can be
  made, matching the shape the other three files already have.
- Closes the `next` item in `cold/TODO.md`.
