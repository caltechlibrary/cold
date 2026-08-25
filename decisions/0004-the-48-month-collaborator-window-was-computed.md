---
id: "0004"
title: "Issue #106: the 48-month collaborator window was computed but never applied to the query"
date: "2026-08-12"
status: accepted
kind: correction
trigger: request
project: cold
phase: "0.0.50"
supersedes: []
superseded_by: []
relates_to: ["0003"]
initiative: ""
session: ""
decisions: ["Apply the missing metadata.publication_date range clause, verified against the live CaltechAUTHORS API", "Rename the report label to 'NSF Collaborator Report' to distinguish it from future collaborator reports", "Add xlsx output via a hand-rolled xlsx_writer.ts on the existing @zip-js/zip-js dependency rather than adopting an xlsx library"]
tags: [reports, caltechauthors, nsf]
uuid: "592ea207-2a92-4199-8387-08af17944930"
origin_host: "MACMINI-RD.local"
---

**Context.** Issue #106, against the collaborator reports. Both
`generate_collaborator_rpt.ts` and `generate_collaborator_affiliations_rpt.ts`
computed a 48-month start date and then never used it: no
`metadata.publication_date` range clause ever reached the CaltechAUTHORS API
query. The reports were unfiltered by date while appearing — in the code — to
be filtered. NSF's requirement is the last 48 months, so the output was wrong
in a way no reader could detect from the report itself.

**Decision.** Add the missing Lucene-style range clause to the query, and
verify it against the live API directly rather than trusting the code path.
Two further changes were made in the same sitting: rename the report's label to
"NSF Collaborator Report" (in `views/report_list.hbs` and the `htdocs` docs) to
distinguish it from future collaborator reports, and add `--format=xlsx`
output through a new hand-rolled `xlsx_writer.ts`.

**Rationale.**
- Dead code that looks live is worse than absent code: the computed-but-unused
  start date is exactly what made the bug survive review.
- Verifying the range query against the live API was necessary because the
  failure mode is silent — a syntactically valid query that filters nothing
  looks identical to one that filters correctly, from the caller's side.
- `xlsx_writer.ts` is built on `@zip-js/zip-js`, which was already an approved
  dependency. An xlsx file is a zip of XML parts, and the report needs a small
  fraction of the format.

**Rejected alternatives.**
- *Adopt an xlsx library* — no xlsx library existed in the project before, and
  pulling one in for a single report's output format is a larger dependency
  commitment than the requirement justifies. Hand-rolling on an
  already-approved zip dependency keeps the dependency surface flat.

**Consequences.**
- Shipped in v0.0.50.
- Producing binary output for the first time immediately exposed a latent
  encoding bug in the runner — see
  [DR-0003](0003-real-bug-runnablerun-decoded-report-stdout-as.md).
- The `content_type` for the renamed report was left inconsistent with the new
  format, which surfaced the next day — see
  [DR-0005](0005-derive-the-reports-output-format-from-cold.md).
