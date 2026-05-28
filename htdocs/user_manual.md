---
title: Help with COLD
pubDate: 2026-05-28
---

# Help with COLD

COLD
: Controlled Object Lists and Datum

COLD is the Caltech Library application for managing controlled vocabularies and objects — primarily the people, groups, and funders used across library systems such as CaltechAUTHORS and CaltechTHESIS.

## Reports

The Reports page lets staff request data exports and analysis reports. Navigate there from the dashboard by clicking **Reports**.

The page has two parts: the **request form** at the top, and the **report list** below showing recent requests and their status.

### Requesting a report

1. Select a report from the **Report** dropdown.
2. Fill in any additional fields that appear (see sections below).
3. Optionally enter one or more email addresses in **Email notification(s)** to be notified when the report is ready.
4. Click **Request Report**.

The report list updates automatically while the report is running. When status changes to **completed** a download link appears. Reports expire after seven days.

---

### CSV reports

These reports require no additional input. Select the report name and click **Request Report**.

| Report | File | Description |
|--------|------|-------------|
| Generate People CSV File | people.csv | Full export of the CaltechPEOPLE collection |
| Generate Groups CSV File | groups.csv | Full export of the CaltechGROUPS collection |
| Generate People Identifier CSV | people_identifier_[DATE].csv | All identifiers per person (clpid, ORCID, thesis advisor/committee ids) |
| Generate a Division People CSV | division_people.csv | People list using campus directory division affiliation |
| Generate a People Membership CSV | people_membership.csv | People with their CaltechGROUPS memberships, one row per affiliation |
| Generate Division People Crosswalk CSV | division_people_crosswalk.csv | Crosswalk of people and Division-* group affiliations |
| Generate Group People Crosswalk CSV | group_people_crosswalk.csv | Crosswalk of people and all group affiliations |
| Generate Thesis Options CSV | thesis_options.csv | Thesis option names and identifiers |
| Generate Authors' Records CSV File | authors_records.csv | All records from the CaltechAUTHORS request, drafts, and records metadata tables |
| Generate Authors' Review Queue CSV File | authors_review_queue.csv | Records currently in the CaltechAUTHORS review queue |

---

### RDM vocabulary reports

These reports produce YAML files consumed by InvenioRDM as controlled vocabularies. No additional input is required.

| Report | File | Description |
|--------|------|-------------|
| Generate Journals Vocabulary | journal_vocabulary.yaml | Preferred journal names used in CaltechAUTHORS |
| Generate Groups Vocabulary | group_vocabulary.yaml | CaltechGROUPS list for RDM |
| Generate People Vocabulary | people_vocabulary.yaml | CaltechPEOPLE list for RDM |
| Generate Thesis Option Vocabulary | thesis_option_vocabulary.yaml | Thesis options for RDM |

---

### Mediated reports

These reports require one or more input parameters. Additional fields appear in the form when you select one of these reports.

#### Collaborator Report

Generates an NSF-style collaborator list for a Caltech researcher.

- **Person (clpid)** — required. Start typing a name or clpid (e.g. `Doiel-R-S`) and select from the autocomplete list.

Output file: `[CLPID]_nsf_collaborator_report.csv`

#### Collaborator Affiliations Report

Similar to the Collaborator Report but includes ROR-based affiliation details for each collaborator, making it suitable for NSF submissions that require institutional affiliations.

- **Person (clpid)** — required. Start typing a name or clpid and select from the autocomplete list.

Output file: `[CLPID]_collaborator_affiliations_report.csv`

#### Publications by Person Identifier

Retrieves publication records from CaltechAUTHORS for a specific person. Includes title, publication year, DOI, authors with affiliations, and acknowledgements text.

- **Person (clpid)** — optional if ORCID is provided.
- **ORCID** — optional if clpid is provided. Format: `NNNN-NNNN-NNNN-NNNN`.

At least one of clpid or ORCID must be filled in.

Output file: `[CLPID]_[ORCID]_publications.csv`

#### Country Collaboration Report

Lists all CaltechAUTHORS records where a creator, contributor, or funder is affiliated with an organization in a given country, matched via ROR. Rows are sorted by publication year (descending), then journal, then title.

- **Country** — required. Start typing the country's common English name (e.g. `South Korea`, `Germany`, `Australia`) and select from the autocomplete list. The two-letter ISO country code is looked up automatically.

Output file: `[COUNTRY]_country_collaboration_report.csv` (e.g. `South_Korea_country_collaboration_report.csv`)

---

For a full description of every report see [Report Descriptions](report_descriptions.html).



