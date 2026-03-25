---
title: Report Descriptions
pubDate: 2026-03-24
---

# Report Description

> We're beginning to get many reports and the names start to be confusing. This list described the reports in more details grouped by functionality.

## General Collection CSV reports

- __Generate People CSV File__
  - (people.csv) This reports renders our CaltechPEOPLE collection as a CSV file suitable for import into LibreOffice, Excel or for use with Jupyter Notebooks
- __Generate Groups CSV File__
 - (groups.csv) This report renders out CaltechGROUPS collection as a CSV file suitable for import into LibreOffice, Excel or for use with Jupyter Notebooks
- __Generate a Division People CSV__
  - (division_people.csv) This generates a people list using the Caltech directory reported division affiliation
- __Generate People Membership CSV__
  - (people_membership.csv) This generates a report of people with membership in CaltechGROUPS. Each affiliation gets its own row in the CSV file.
- __Gernerate Division People Crosswalk CSV__
  - (division_people_crosswalk.csv) this report is a crosswalk of people affiliation restricted to clgid starting with "Division-*"
- __Generate Group People Crosswalk__
  - (group_people_crosswalk.csv) this report is a crosswalk of people and their group affiliation. It is similar to "Generate People Membership CSV", slightly different columns
- __Generate People Identifier CSV__
  - (people_identifier_[DATE_STAMP].csv) This report lists all identifiers from CaltechPEOPLE collection by person (example clpid, orcid plus, thesis committee id, thesis advisor id)


## RDM Review Queue and Records

- __Generate Authors' Review Queue CSV file__
  - (authors_review_queue.csv) This is a report of things currently in the review queue based on metadata in the request metadata table and drafts metadata table
- __Generate Author's Records CSV file__
  - (authors_records.csv) This is a report on all records from the request metadata, drafts metadata and records metadata tables.

## RDM Vocabularies

> These reports produce YAML files. These are used by RDM for controlled vocabularies.

- __Generate Journals Vocabulary__
  - (journal_vocabulary.yaml) The preferred journal names we used in our IR
- __Generate Groups Vocabulary__
  - (group_vocabulary.yaml) This is the controlled of Groups defined in COLD used by RDM
- __Generate People Vocabulary__
  - (people_vocabulary.yaml) This is the controlled list of People defined in COLD used by RDM
- __Generate Thesis Options Vocabulary__
  - (thesis_option_vocabulary.yaml) This generates a Thesis option vocabulary. Currently used to implement EPrints' list of Thesis options but will be used with RDM eventually
