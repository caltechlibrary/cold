---
id: "0002"
title: "Parameterized reports: `basename` becomes a name template, and every layer re-validates"
date: "2026-04-07"
status: accepted
kind: decision
trigger: request
project: cold
phase: "0.0.40"
supersedes: []
superseded_by: []
relates_to: ["0001"]
initiative: ""
session: ""
decisions: ["cold_reports.yaml's basename is a curly-bracket name template resolved from validated inputs, not a fixed filename", "Expected parameters are declared in an inputs list carrying type information", "Any parameter used in a filename must be marked required, so it is guaranteed non-empty", "Validation happens at four layers: browser, middleware, runner, and the report itself", "Parameters not declared in the report definition are rejected in the middleware and discarded in the runner", "Parameterized reports never accept free text"]
tags: [reports, validation, security]
uuid: "82c0aa2f-80ea-4cae-ae9d-7c8614846562"
origin_host: "MACMINI-RD.local"
---

**Context.** In April 2026 the collaborator reports were migrated from a
GitHub Actions process into COLD. That migration requires the reports system
to support parameters: a `clpid` is needed to know which collaborators to
report on.

Through release v0.0.39 every report had a preset name. The `basename`
attribute in the report definition mapped directly to a filename and the
`content_type` determined the extension. That worked remarkably well — and it
breaks as soon as reports are parameterized, because every collaborator report
would overwrite the previous one.

Separately, passing parameters through to a program the runner launches raises
the stakes on input validation considerably.

**Decision.** Treat `basename` in `cold_reports.yaml` as a curly-bracket name
template rather than a fixed filename, resolved by substituting the
**validated** inputs. Declare expected parameters in an `inputs` list carrying
type information. Validate at four layers — browser, middleware, runner, and
the report executable itself — and never assume an upstream layer has already
done it. A parameter that appears in a filename must be `required`, so it is
guaranteed non-empty. Parameters with no matching definition are rejected in
the middleware and discarded in the runner: only defined parameters are
processed. Parameterized reports never accept free text.

**Rationale.**
- Templating the basename gives a flexible but *predictable* name, which is
  what the three name-sensitive points need: computing the output path,
  computing the link to display or email, and knowing where to write stdout.
- Requiring any filename-bearing parameter is what makes the substitution safe
  — a validated parameter is a string, and `required` is what guarantees it is
  not the empty string.
- The runner can read the file system and launch programs at service
  privilege. It is only the next-to-last check before a process starts, so the
  report itself has to take responsibility too.
- Validation at the browser prevents a requester wasting their time; at the
  middleware it prevents queueing work that cannot succeed; at the runner and
  in the report it is a security boundary.

**Rejected alternatives.**
- *Custom validation methods* — the third of three approaches considered. More
  refined, and it would let validation target specific library data needs, but
  rejected: it makes the reports system brittle and erodes the clean
  separation between the report scripts, the runner, and the middleware. There
  was also limited developer time. Approaches one and two — validation based
  on HTML5 input element types, extended with the identifier types from
  metadatatools — were adopted instead.
- *Letting the report script take over writing to `htdocs/rpt`* — considered,
  and it "would not require a significant change" to the reports module.
  Rejected to keep the interaction between report executable and runner
  minimal, which is what preserves flexibility in how reports are
  implemented. This upholds [DR-0001](0001-cold-reports-are-stdout-producing-programs-the.md).

**Consequences.**
- Implemented in v0.0.40: `browser_api.ts` gained parameter handling and
  validation, `cold_reports.ts`'s `Runnable` gained the `inputs` attribute and
  the template behaviour for `basename`, and `reports.ds` remains the
  communication mechanism between middleware and runner.
- The burden shifts partly onto whoever writes a parameterized report: vet
  inputs, never let a parameter change control flow (only supply values), derive
  any output filename independently of raw input, and sanity-check pathing.
- The technique is expected to be reused in the Thesis Management System,
  which shares COLD's architecture.
