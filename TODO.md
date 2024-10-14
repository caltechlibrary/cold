
Action items
============

next
----

0. [X] Consolidate `/cold/`, `/cold/admin/` and `github.com/caltechlibrary/cold_directory_sync` into the main cold repository
  - Per 2024-10-08 project meeting, the public API of COLD is feeds
  - COLD is responsible for pushing changes to feeds, RDM can pull changes from feeds
  - Run a report of clpid and related author_id, advisor_id, committee_member_id, etc.
1. [ ] Do final load of data from the spreadsheet in GitHub
2. [ ] Write report that generates the spreadsheet
  - [X] People
  - [ ] Group
  - [ ] Funders
3. [ ] Write push of CSV files to datawork for inclusion in feeds
4. [ ] Write report that generates the YAML needed by RDM
5. [X] Write a cronjob that updates COLD from directory using the old cdh harvester code or public vcard
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
6. [ ] Add button to pull in current directory data

- [ ] Figure out how to refactor Makefile to complete the a release process
- [ ] Write data flow document for cold people and group data indicating we're using public data from the directory as authorative and where publish the group and people data to in feeds
- [ ] cold needs a ROADMAP document to guide development as cold's needs seem ambigious
- [D] Add link to cold and cold admin on apps.library.caltech.edu (cold public API is feeds, cold admin is consolidated fully into the cold repo)
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
- [ ] Implement client/server validation for objects and attributes
 - [ ] Implement validation in datasetd based on models
 - [ ] People
   - [ ] Need to implement validators for each identifier type supported (look at convert idutils to WASM module and integrating that way)
 - [ ] Groups
   - [ ] Need to implement validators for each identifier type supported (look at convert idutils to WASM module and integrating that way)
 - [ ] Funder
   - [ ] Need to implement validators for each identifier type supported (look at convert idutils to WASM module and integrating that way)
 - [ ] Vocabularies
   - [ ] Need to implement validators for each identifier type supported (look at convert idutils to WASM module and integrating that way)


Someday, maybe
--------------

- [ ] UI Widgets to manage objects in list
  - [ ] Person and Organization widget
  - [ ] Group widget
  - [ ] Funder widget
  - [ ] Vocabulary widgets
- [ ] Implement (SQL) tests
  - [ ] People
  - [ ] Organziation
  - [ ] Funders
  - [ ] Vocabularies

# Action Items

## Bugs

## Next

- [ ] Figure out if I need refactor people, groups, funders to tease out the type definitions (i.e. interface and class) into 
  - [ ] Review https://jsr.io/@deno/emit, this is probably the right choice for the project but not certain, need to figure out how clean a "compile to single JS file" I can get
  - Looks like the "bundle" command line compile option in deno maybe helpful here, see `deno --help bundle`
    - Looks like "bundle" is depreciated, see https://docs.deno.com/runtime/manual/tools/bundler/
    - [ ] Review https://esbuild.github.io/
    - [ ] Review https://rollupjs.org/
- [X] Figure out how switching from a read view to an edit view should work (e.g. URL parameter like `view=...` or do I expanded URL end points?). The problem is keeping the URL end points managable while still maintaining a simple implementation. I POST can be used to submit form to the same URL as the edit view is, edit view would use GET to retrieve the populated form. 
- [X] Figure out if Mustache templates are enough to support UI. If not then find an alternative quickly
    - switched to Handlebars
- [X] refactor modules for people and groups so that the web configuration like base\_url can flow through the app. This could be done by making a app\_group and app\_people object that held the various handlers. It could also be done through the config module exposing global values. Not sure right approach.
  - fixed by adopting relative linking throughout templates
- [X] Figure out how to render TypeScript to JavaScript for browser side interactivity if there is time to implement that
    - See https://rsdoiel.github.io/blog/2024/07/03/transpiling_with_deno.html
- [ ] Update UI labeling based on RDM project meeting suggestions, see https://caltechlibrary.atlassian.net/wiki/spaces/InvenioMigration/pages/3282960385/2024-08-13+Project+Team+Meeting+Notes
- [ ] Make sure `author_id` and `thesis_id` continue to be mapped on reloading data from CSV file, if a person has an "clpid" and only are alumni then that should go into the `thesis_id` field.
- [ ] Make sure we auto tag `include_in_feeds` based on current algorithms on importing data
