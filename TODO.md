
Action items
============

next
----

1. [ ] Do final load of data from the spreadsheet in GitHub
2. [ ] Write report that generates the spreadsheet
3. [ ] Write report that generates the YAML needed by RDM
4. [ ] Write a cronjob that updates COLD from directory using the old cdh harvester code or public vcard
  - [ ] investigate how much of the vcard is useful, important use case is dual appointments
  - [ ] division associations for people should be additive but require manuall removals on autoupdates
  - [ ] Fields like bio and descriptions can be overwritten by directory data
5. [ ] Add button to pull in current directory data

- [ ] Write data flow document for cold people and group data indicating we're using public data from the directory as authorative and where publish the group and people data to in feeds
- [ ] cold needs a ROADMAP document to guide development as cold's needs seem ambigious
- [ ] Add link to cold and cold admin on apps.library.caltech.edu
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
