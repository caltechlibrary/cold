
Action items
============

bug
---

- [ ] Tracked down the group list problem in people_edit.ts, the list is getting returned now from the API but the object I am returning from getList isn't what is expected further down in the code now that types must match. I need to look through and see how getList is used to determine the right way to format the return value. Basically some functions expect aresponse looking object and are getting an array of results.
- [X] Description field is not needed in the harvested content from RDM review queue
- [X] funders field is not needed in the harvested content from RDM review queue
- [X] The pulldown list needs to indicate if you're looking at all records or review queue
- [X] Wild Card wording for all records by name needs clearer English (a search for all records with "*" has too many results, try adding some letters for the name and use the wild card).
- [X] Downloaded CSV files for by name (all records and review queue) display wild card as SQL '%' instead of '*'
- [X] A report that writes directly to htdocs/rpt (collaborator report) should not standard out overwrite the generated file.

next
----

- [ ] Revisit the prototype collaborator report page, see if I can folder it back into the main reports page's web form
  - [ ] Figure out how to fold that report directly into COLD's source code base rather than rely on relative directories to run it
    - [ ] Look at reports page and decide if there is an easy way to swith form elements based on the selected reports, example I could at clpid, clgid and hide the ones not used
- [ ] COLD needs a ROADMAP document to guide development as cold's needs seem ambigious
- [X] Revisit Tom's Python collaborator report to confirm to the COLD reports expectation OR allow reports to skip standard output
  - [X] Decided if it makes sense render to CSV instead of Excel
- [X] Figure a useful way to snapshot the RDM Review queue tables and load into a dataset collection
  - [X] harvest submitted status requests
  - [X] harvest accepted status requests
- [X] Create a Web UI to search the review queue collection
  - [X] Figure out how to make searches bookmark-able
  - [X] Figure out how to map search to various queries of rdm_review_queue.ds
  - [X] Implemented retrieve JSON array results
  - [X] Format output for HTMLL display
  - [X] Figure out CSV download option for search results
- [X] Create a set of status reports for the review queue, historical reports should include "accepted" status as well as "submitted" status requests
- [X] Need to produce the Groups YAML vocabulary for CaltechAUTHORS
- [X] Add directoryLookup() call on submit of people_edit
- [X] Make sure `author_id` and `thesis_id` continue to be mapped on reloading data from CSV file, if a person has an "clpid" and only are alumni then that should go into the `thesis_id` field.
- [X] Display name should always be taken from Caltech Directory
- [X] If the name fields family_name, given_name should be taken from the Caltech Directory if empty
- [ ] When Caltech is checked active the ROR should populate with https://ror.org/05dxps055 (client side code)
- [X] Add "internal_notes" property to people object, group object and issn (journals) object
- [ ] Write reports
  - [ ] Funders
  - [X] Prototype a reports request system in COLD
    - [X] Report request and availability UI
    - [X] Report runner (run on data processing system not apps)
  - [X] need a report that finds Caltech People ID that do not math CaltechAUTHORS author_id
  - [X] need a report that identifies what advisor_id and committee_ids from thesis have no matching clpid
  - [X] People (should be written to feeds)
  - [X] Group  (should be written to feeds)
  - [X] RDM vocabulary files report (should be written to feeds)
- [X] Write push of CSV files to datawork for inclusion in feeds (implemented but commented out in feeds fetch db script)
- [X] Add button to pull in current directory data
- [X] Write data flow document for cold people and group data indicating we're using public data from the directory as authorative and where publish the group and people data to in feeds
- [ ] Implement client/server validation for objects and attributes in dataset
 - [ ] Implement validation in datasetd based on models, coming in dataset v3 or late minor release v2
 - [X] People
 - [X] Groups
 - [X] Funder
 - [x] Vocabularies


Someday, maybe
--------------

- [ ] UI Widgets to manage objects in list
  - [ ] Person and Organization widget
  - [ ] Group widget
  - [ ] Funder widget
  - [ ] Vocabulary widgets
- [ ] Implement a CL-v2.js with support for feeds, cold and RDM dataset sources

## Completed

- [x] Remove mkpage dependency, replace with Pandoc 3 templates from github.com/caltechlibrary/codemeta-pandoc-examples
- [X] Setup PostgreSQL user and cold database (replaced with SQLite3 and datasetd)
- [X] Migrate current SQL schema to PostgreSQL schema (replaced with SQLite3 and datasetd)
- [X] Replace MySQL with PostgreSQL
- [X] Configure PostgREST to provide JSON API (replaced with datasetd)
- [X] Configure Pandoc in server mode to provide a template engine (replaced with handlebars via Deno)
- [X] Implement paging views in PostgreSQL view SQL views (replaced with datasetd plus Deno)
- [X] Data Models (convert from RDM and current Go structs then to TypeScript interfaces)
  - [X] People
  - [X] Groups
  - [X] Funder
  - [X] Vocabularies (implemented example vocabularies as individual dataset collections)
- [X] Implement end point tests
  - [X] Funders end points
  - [X] Groups end points
  - [X] People end points
  - [X] Vocabulary end points
- [X] Implement http API end points (using datasetd for API)
  - [X] Funders end points
  - [X] Groups end points
  - [X] People end points
  - [X] Vocabulary end points
- [X] Document setup, configuration and database requirements
  - [X] Add Makefile
- [D] Add link to cold and cold admin on apps.library.caltech.edu (cold public API is feeds, cold admin is consolidated fully into the cold repo)
- [X] Figure out how to refactor Makefile to complete the a release process
- [X] Add "staff" people object
- [X] Consolidate `/cold/`, `/cold/admin/` and `github.com/caltechlibrary/cold_directory_sync` into the main cold repository
  - Per 2024-10-08 project meeting, the public API of COLD is feeds
  - COLD is responsible for pushing changes to feeds, RDM can pull changes from feeds
  - Run a report of clpid and related author_id, advisor_id, committee_member_id, etc.
- [X] Division should only populate in with directory sync if it is empty
- [X] Do final load of data from the spreadsheet in GitHub
- [X] Figure out if I need refactor people, groups, funders to tease out the type definitions (i.e. interface and class) into 
  - [X] Review https://jsr.io/@deno/emit, this is probably the right choice for the project but not certain, need to figure out how clean a "compile to single JS file" I can get
  - Looks like the "bundle" command line compile option in deno maybe helpful here, see `deno --help bundle`
    - Looks like "bundle" is depreciated, see https://docs.deno.com/runtime/manual/tools/bundler/
    - [X] Review https://esbuild.github.io/
    - [X] Review https://rollupjs.org/
- [X] Figure out how switching from a read view to an edit view should work (e.g. URL parameter like `view=...` or do I expanded URL end points?). The problem is keeping the URL end points managable while still maintaining a simple implementation. I POST can be used to submit form to the same URL as the edit view is, edit view would use GET to retrieve the populated form. 
- [X] Figure out if Mustache templates are enough to support UI. If not then find an alternative quickly
    - switched to Handlebars
- [X] refactor modules for people and groups so that the web configuration like base\_url can flow through the app. This could be done by making a app\_group and app\_people object that held the various handlers. It could also be done through the config module exposing global values. Not sure right approach.
  - fixed by adopting relative linking throughout templates
- [X] Figure out how to render TypeScript to JavaScript for browser side interactivity if there is time to implement that
    - See https://rsdoiel.github.io/blog/2024/07/03/transpiling_with_deno.html
- [X] Update UI labeling based on RDM project meeting suggestions, see https://caltechlibrary.atlassian.net/wiki/spaces/InvenioMigration/pages/3282960385/2024-08-13+Project+Team+Meeting+Notes
- [X] Make sure we auto tag `include_in_feeds` based on current algorithms on importing data
- [X] Write a cronjob that updates COLD from directory using the old cdh harvester code or public vcard
  - [X] investigate how much of the vcard is useful, important use case is dual appointments
    - Does not necessarily show division affiliation
    - If "ORG" is shown it maybe a semi-colon delimited list
    - Doesn't show BIO field
    - Can be seen off campus so information provided is public
    - There are a few better Golang packages supporting decoding VCARD data depending on our needs
    - Very easy to retrieve and doesn't require API key, must know IMSS username
    - Only supports the vcf format of data (not XML or JSON)
  - [X] investigate what we get from the current implementation LDAP API provided by IMSS
  - [X] division associations for people should be additive but require manuall removals on autoupdates
  - [X] Fields like bio and descriptions can be overwritten by directory data
