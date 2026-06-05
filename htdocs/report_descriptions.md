---
title: Report Descriptions
pubDate: 2026-05-28
---

# Report Description

> We're beginning to get many reports and the names start to be confusing. This list described the reports in more details grouped by functionality.

## General Collection CSV reports

- __Generate People CSV File__
  - (people.csv) This report renders our CaltechPEOPLE collection as a CSV file suitable for import into LibreOffice, Excel or for use with Jupyter Notebooks
- __Generate Groups CSV File__
  - (groups.csv) This report renders our CaltechGROUPS collection as a CSV file suitable for import into LibreOffice, Excel or for use with Jupyter Notebooks
- __Generate a Division People CSV__
  - (division_people.csv) This generates a people list using the Caltech directory reported division affiliation
- __Generate People Membership CSV__
  - (people_membership.csv) This generates a report of people with membership in CaltechGROUPS. Each affiliation gets its own row in the CSV file.
- __Generate Division People Crosswalk CSV__
  - (division_people_crosswalk.csv) This report is a crosswalk of people affiliation restricted to clgid starting with "Division-*"
- __Generate Group People Crosswalk__
  - (group_people_crosswalk.csv) This report is a crosswalk of people and their group affiliation. It is similar to "Generate People Membership CSV" but with slightly different columns.
- __Generate People Identifier CSV__
  - (people_identifier_[DATE_STAMP].csv) This report lists all identifiers from CaltechPEOPLE collection by person (e.g. clpid, orcid, thesis committee id, thesis advisor id)
- __Generate Thesis Options CSV__
  - (thesis_options.csv) This report delivers a list of thesis option names and their identifiers.


## RDM Records and Review Queue

- __Generate Authors' Records CSV file__
  - (authors_records.csv) This is a report on all records from the request metadata, drafts metadata and records metadata tables.
- __Generate Authors' Review Queue CSV file__
  - (authors_review_queue.csv) This is a report of things currently in the review queue based on metadata in the request metadata table and drafts metadata table.

## RDM Vocabularies

> These reports produce YAML files. These are used by RDM for controlled vocabularies.

- __Generate Journals Vocabulary__
  - (journal_vocabulary.yaml) The preferred journal names we use in our IR
- __Generate Groups Vocabulary__
  - (group_vocabulary.yaml) This is the controlled list of Groups defined in COLD used by RDM
- __Generate People Vocabulary__
  - (people_vocabulary.yaml) This is the controlled list of People defined in COLD used by RDM
- __Generate Thesis Options Vocabulary__
  - (thesis_option_vocabulary.yaml) This generates a Thesis option vocabulary. Currently used to implement EPrints' list of Thesis options but will be used with RDM eventually.

## Mediated Reports

> These are reports librarians run for the Caltech community. Each requires one or more parameters entered in the request form.

- __Collaborator Report__
  - ([CLPID]_nsf_collaborator_report.csv) Given a clpid, generates a collaborator report as a CSV file suitable for NSF. Lists co-authors and their affiliations from CaltechAUTHORS records.
- __Collaborator Affiliations Report__
  - ([CLPID]_collaborator_affiliations_report.csv) Given a clpid, generates a collaborator affiliations report as a CSV file suitable for NSF. Each row covers one (coauthor, affiliation, publication) combination and includes ROR ID, country, acknowledgements, and additional information sourced from the CaltechAUTHORS record.
- __Publications by Person Identifier__
  - ([CLPID]_[ORCID]_publications.csv) Given a clpid and/or ORCID, retrieves publication records from CaltechAUTHORS. Includes title, publication year, DOI, authors with affiliations, and acknowledgements. At least one of clpid or ORCID must be provided.
- __Country Collaboration Report__
  - ([COUNTRY]_country_collaboration_report.csv) Given a country name, generates a CSV listing all CaltechAUTHORS records where a co-author, contributor, or funder is affiliated with an organization in that country (matched via ROR). Columns include year, journal, title, Caltech authors, ROR, organization, country, acknowledgements, and additional information. Rows are sorted by publication year (descending), journal, then title.
