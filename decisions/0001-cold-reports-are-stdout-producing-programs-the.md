---
id: "0001"
title: "COLD reports are stdout-producing programs; the runner owns validation, placement and notification"
date: "2024-10-25"
status: accepted
kind: decision
trigger: design
project: cold
phase: ""
supersedes: []
superseded_by: []
relates_to: []
initiative: ""
session: ""
decisions: ["Reports are programs or scripts in any language that write their results to standard output", "The runner owns final placement of report output, not the report script", "Reports are stored in COLD's own protected web tree rather than Google Drive", "Deliberate simplicity is a standing constraint on the reports system"]
tags: [reports, architecture]
uuid: "6cfe4a2d-467b-41a7-9bfe-c38e3773c321"
origin_host: "MACMINI-RD.local"
---

**Context.** COLD has a report request service with a web user interface. A
request creates a record in the `reports.ds` collection; a separate report
runner service watches that collection, runs requested reports, and keeps the
records updated as the run proceeds. The division of labour between the report
executable and the runner had to be settled: which side validates, which side
decides where output lands, and which side notifies the requester.

**Decision.** Reports are programs or scripts — Bash, Python, anything — that
write their results to standard output. The runner captures that output,
writes it into the web tree (`htdocs/rpt`), forms the link, updates the
request record with `available` plus the link (or `error` plus a message), and
sends any requested email notification. Report output is stored locally in
COLD's own website directory.

**Rationale.**
- Report systems tend towards complexity, so the initial system must be as
  simple as possible while still accommodating both quick reports and those
  that may take hours.
- Maintainability is the priority: the system has to be easy to understand for
  developers and for the people requesting reports.
- Standard output is the lowest-common-denominator interface, so a report can
  be written in whatever language suits it and can reach any resource it can
  use programmatically (`dsquery`, the compiled vocabulary tools, Python).
- Keeping reports under `htdocs` means their contents stay protected by the
  same Apache2 + Shibboleth mechanisms that protect COLD itself.

**Rejected alternatives.**
- *The report script writes its own output to its final destination* — this was
  the original intent. Rejected because handling Google Drive turned out to be
  complex enough that pushing it into every report script was not worth it; the
  runner should own the final resting place of a report.
- *Google Drive as the default destination* — rejected in favour of local
  storage in COLD's web tree, which inherits COLD's existing access controls
  rather than needing its own.

**Consequences.**
- The report executable stays ignorant of the runner. The only contract is the
  exit code and `error://`-prefixed lines in stdout.
- Reports that must run on a separate machine are handled by having the script
  write the output itself and report a link back into the queue object — the
  exception the minimal contract leaves room for.
- The runner reads the file system and launches programs at service privilege,
  which is what makes later input-validation work load-bearing. See
  [DR-0002](0002-parameterized-reports-basename-becomes-a-name.md).
