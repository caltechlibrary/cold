---
title: "COLD: Managing Metadata Across Library Systems"
author: "R. S. Doiel, <rsdoiel@caltech.edu>"
institute: |
  Caltech Library,
  Digital Library Development
description: SoCal Code4Lib Meet up
urlcolor: blue
linkstyle: bold
aspectratio: 169
createDate: 2026-04-13
updateDate: 2026-04-13
draft: true
pubDate: 2026-04-13
place: Caltech
date: April 2026
section-titles: false
toc: true
keywords: [ "code4lib", "microservice", "SQLite3", "Deno", "TypeScript", "Dataset", "RDM", "controlled vocabulary" ]
url: "https://caltechlibrary.github.io/cold/presentation"
---

# Caltech Library's strategy: develop at the edges

Rather than modifying repository software or writing plugins, we enhance capabilities by:

- Building lightweight services that sit alongside existing systems
- Use web APIs to exchange and enrich metadata
- Keeping each service focused on one job it does well

COLD is an example of this approach.

# The problem COLD solves

Caltech Library maintains authoritative lists of:

- **People** — Caltech researchers and staff
- **Groups** — departments, labs, centers, research groups
- **Funders** — funding organizations
- **Journals** — preferred titles used in our IR
- **Subjects** and **Thesis options**

These records need to be consistent across multiple systems.

# What we're tracking

- 9027 people
- 109 groups
- 8 funders
- 4813 journals
- 1 subject
- 99 thesis options

# COLD today

COLD
: Controlled Object Lists with [Dataset](https://caltechlibrary.github.io/dataset)

A web application for curating metadata objects and sharing them across library systems.

Used for:

- Maintaining a single authoritative source for people, groups, and funders
- Feeding controlled vocabularies into InvenioRDM
- Powering <https://feeds.library.caltech.edu>
- Generating staff reports and institutional datasets

# What library staff can do in COLD

- Create, edit and browse records for people, groups, funders, journals, subjects, and thesis options
- Look up Caltech directory information to pre-populate person records
- Resolve ORCID identifiers to fill in researcher metadata
- Look up funder information from the Research Organization Registry (ROR)
- Search and browse the RDM submission review queue
- Request reports and be notified by email when they are ready

# How COLD connects to other systems

Retrieves data:

```
COLD ←── RDM          review queue snapshots pulled in for staff search
COLD ←── Caltech dir  directory sync keeps people records current
COLD ←── ROR          funder data updated as ROR releases new dumps
```

Provides data:

```
COLD ──→ InvenioRDM   controlled vocabularies (people, groups, journals, thesis options)
COLD ──→ Feeds        people and group metadata for public-facing library pages
COLD ──→ RDM reports  author reconciliation and review queue data
```

No plugins. No modifications to repository software. Just APIs exchanging JSON.

# The three services

COLD runs as three independent web services:

1. **cold** — the web UI and middleware (handles all user interaction)
2. **datasetd** — the JSON API backend (data persistence via SQLite3)
3. **cold_reports** — the async report queue (runs scripts, delivers results)

Access is controlled by Apache + Shibboleth in front — library staff log in with their campus single sign-on.

# What COLD stores: the collections

| Collection | Purpose |
|---|---|
| people.ds | Caltech researchers and staff (ORCID, ISNI, VIAF, group memberships) |
| groups.ds | Departments, labs, centers, research groups |
| funders.ds | Funding organizations with ROR identifiers |
| journals.ds | Preferred journal titles and ISSNs |
| subjects.ds | Subject classifications |
| thesis_options.ds | Degree program options |
| ror.ds | Local copy of Research Organization Registry |
| rdm_review_queue.ds | Snapshot of InvenioRDM submission review queue |

# People records: the richest collection

A person record in COLD holds:

- **Identifiers**: clpid, ORCID, ISNI, VIAF, thesis advisor ID, thesis committee ID, directory ID
- **Names** and biography
- **Group memberships** — links to groups.ds
- **Division affiliation** from the Caltech directory

This single authoritative record drives the people vocabulary in RDM, the author pages in Feeds, NSF collaborator reports, and directory sync.

# ROR integration: keeping funders current

The Research Organization Registry (ROR) is the emerging standard for funder and organization identifiers.

- Caltech Library imports the full ROR data dump locally into `ror.ds`
- ROR releases updates every 4–6 weeks; we can refresh our local copy in step
- Staff curating funder records can search by name or acronym against local ROR data — **fast, no external API dependency**
- Matching ROR record is imported directly into the funder form

# RDM review queue: bringing the queue to staff

InvenioRDM's submission review queue is now searchable inside COLD.

- Snapshots of the RDM request queue are pulled in periodically
- Staff can search by **author name, ORCID, clpid, or group (clgid)**
- Search results display as a table and can be **downloaded as CSV**
- Supports curator workflows without requiring direct database access to RDM

This is the "develop at the edges" approach applied to an existing repository system.

# Reports: CSV exports for library operations

| Report | What it produces |
|---|---|
| People CSV | Full CaltechPEOPLE export — usable in LibreOffice, Excel, or Jupyter |
| Groups CSV | Full CaltechGROUPS export |
| Division People CSV | People listed by Caltech directory division |
| People Membership CSV | One row per person-per-group membership |
| Division People Crosswalk | People crosswalk restricted to Division-level groups |
| Group People Crosswalk | People and all group affiliations |
| People Identifier CSV | All external identifiers per person — datestamped snapshot |

# Reports: RDM author reconciliation

| Report | What it produces |
|---|---|
| Author's Records CSV | All records from RDM request, drafts, and records metadata |
| Authors' Review Queue CSV | Current items in the review queue for author reconciliation |

These reports support the ongoing work of matching RDM submission authors against COLD's authoritative people records.

# Reports: controlled vocabularies for InvenioRDM

| Report | Output | Purpose |
|---|---|---|
| Journals Vocabulary | journal_vocabulary.yaml | Preferred journal names loaded into RDM |
| Groups Vocabulary | group_vocabulary.yaml | Caltech groups list loaded into RDM |
| People Vocabulary | people_vocabulary.yaml | Authors vocabulary (with ORCID and affiliation) |
| Thesis Options Vocabulary | thesis_option_vocabulary.yaml | Degree options for thesis submissions |

Staff run these reports; the resulting YAML files are consumed directly by InvenioRDM as controlled vocabularies. COLD becomes the single place to update a name or identifier — the vocabulary update flows out to RDM automatically on the next report run.

# Reports: the NSF collaborator report

The **NSF Collaborator Report** is a mediated, parameterized report:

1. A staff member enters a researcher's `clpid`
2. COLD fetches that person's publication co-author data from CaltechAUTHORS
3. Formats the result as an NSF-style collaborator table
4. Delivers a CSV file named `<clpid>_nsf_collaborator_report.csv`

A report that used to require manual spreadsheet assembly is now a self-service staff request.

# How the report system works

```
Staff requests report in browser
    → request queued in reports.ds
    → cold_reports picks it up (FIFO, 10-second poll)
    → runs the configured script
    → output saved to the web server
    → staff notified by email with a download link
```

Adding a new report requires writing a script and one YAML configuration entry — no changes to the middleware.

# The benefit: one place, many systems

```
Staff curates a person record in COLD
    → People vocabulary updated → RDM gets the authoritative author list
    → Feeds updated → public-facing researcher pages stay current
    → Collaborator report reflects the latest publication data
    → People CSV available for any downstream analysis
```

Changes made in one place propagate outward. Systems stay in sync without manual reconciliation across spreadsheets.

# Status and what's next

- Version 0.0.39c — active development, production pilot at Caltech Library
- Immediate next: tighter RDM review queue snapshot frequency
- Expanding parameterized reports (monthly and quarterly roll-ups)
- Roll out Collaborator reports to staff

# Reference URLs

- COLD, <https://github.com/caltechlibrary/cold>
- Caltech Library Feeds, <https://feeds.library.caltech.edu>
- Dataset (the JSON object manager underlying COLD), <https://caltechlibrary.github.io/dataset>
- ROR (Research Organization Registry), <https://ror.org>
- InvenioRDM, <https://inveniosoftware.org/products/rdm/>
- Code4Lib, <https://code4lib.org>
