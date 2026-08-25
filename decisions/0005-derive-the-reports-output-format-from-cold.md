---
id: "0005"
title: "Derive a report's output format from `cold_reports.yaml`'s `content_type` instead of hardcoding it in the script"
date: "2026-08-13"
status: accepted
kind: correction
trigger: request
project: cold
phase: "0.0.50"
supersedes: []
superseded_by: []
relates_to: ["0004"]
initiative: ""
session: ""
decisions: []
tags: [reports, configuration, yq]
uuid: "8ee7f6f0-78be-4e94-bdae-811c54edd8c4"
origin_host: "MACMINI-RD.local"
---

**Context.** Follow-up to Issue #106. The NSF Collaborator Report did not
download as CSV from the COLD reports menu. Two places independently declared
the report's format and they had drifted apart: `cold_reports.yaml`'s
`content_type` was still `application/vnd.ms-excel` from the xlsx work, while
every other report uses `text/csv`, and `run_collaborator_report.bash`
hardcoded `--format=xlsx`.

`content_type` is what the runner uses to pick the file extension and what the
browser is told the file is. A script hardcoding a different format is not
detectable by either.

**Decision.** Make `content_type` in `cold_reports.yaml` the single source of
truth. `run_collaborator_report.bash` no longer hardcodes `--format`; it
derives it from the report definition's own `content_type` using `yq`. `yq`
becomes a new dependency, recorded in `codemeta.json` and the README.

**Rationale.** Correcting the `content_type` value alone would have fixed the
symptom and left the cause: two places to change, one of which nothing checks
against the other. Deriving one from the other means they cannot drift again.
The report definition is the right owner because the runner already reads it to
compute the extension and the link.

**Rejected alternatives.**
- *Fix `content_type` and leave the hardcoded flag* — smaller change, works
  immediately, but preserves exactly the two-sources-of-truth arrangement that
  produced the bug.

**Consequences.**
- A new external tool dependency, `yq`, is required on the report host. This is
  a runtime dependency of a report script rather than of COLD itself, but it is
  a real deployment requirement.
- The pattern generalises: any report script that needs to know its own output
  format should read it from the definition rather than restate it.
