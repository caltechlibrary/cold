---
id: "0007"
title: "Open: drop the undocumented `all=1` query parameter from the CaltechAUTHORS report scripts"
date: "2026-08-24"
status: proposed
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

**Decision.** **Not yet made.** Deliberately left out of scope for the
pagination fix.

**Rationale for deferring.** The pagination change was already modifying all
four scripts, and the parameter's actual effect against the live API is
unverified — "appears to be a no-op" is an inference from the documented
parameter list, not an observation. Removing it is a behaviour change on a
report that had just been confirmed correct against a real problem report, and
it deserves its own verification rather than riding along on an unrelated fix.

**Rejected alternatives.** None yet — this record exists to hold the question
open rather than to close it.

**Consequences.**
- Tracked under `next` in `cold/TODO.md`, listing all four call sites.
- Resolving it needs a live comparison of the same query with and without the
  parameter, on a person with enough records to make a difference visible.
- Until then, four scripts carry a parameter nobody can explain, which is a
  small but real drag on anyone reading that code.
