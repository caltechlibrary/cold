---
id: "0003"
title: "Real bug: `Runnable.run()` decoded report stdout as UTF-8, silently corrupting binary output"
date: "2026-08-12"
status: accepted
kind: correction
trigger: implementation
project: cold
phase: "0.0.50"
supersedes: []
superseded_by: []
relates_to: ["0004"]
initiative: ""
session: ""
decisions: []
tags: [reports, xlsx, encoding]
uuid: "1c92b445-4601-419c-8b66-cc43cd7d4c83"
origin_host: "MACMINI-RD.local"
---

**Context.** Adding `--format=xlsx` output to the NSF Collaborator Report
(Issue #106) meant a report's standard output could be binary for the first
time. Every report until then had produced text.

`Runnable.run()` in `cold_reports.ts` decoded the command's stdout as UTF-8
text and re-encoded it before writing to disk. For text that round trip is
lossless and the bug was invisible. For a zip-based xlsx payload it silently
corrupts the file — no error, no warning, just an unopenable report.

**Decision.** Write the raw stdout bytes straight to disk. Do not decode and
re-encode.

**Rationale.** The decode/re-encode round trip is only lossless for input that
happens to be valid UTF-8. Nothing in the reports contract ever promised that —
[DR-0001](0001-cold-reports-are-stdout-producing-programs-the.md) says a report
writes *its results* to standard output, and says nothing about them being
text. The runner was imposing a constraint the design never stated.

**Rejected alternatives.** None. The previous behaviour was a defect, not a
chosen design — this corrects the code to match the decision, so nothing is
superseded.

**Consequences.**
- Verified with a reproducing test first, then the fix, then a plain-text/CSV
  regression test so text reports are confirmed still correct.
- The bug had been latent for as long as the reports system had existed. It
  became reachable only when a report first produced binary output, which is a
  reminder that "every report is text" was an unwritten assumption rather than
  a documented one.
