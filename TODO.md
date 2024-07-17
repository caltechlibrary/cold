
Action items
============

next
----

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
- [ ] Implement client/server validation for objects and attributes
 - [ ] People
   - [ ] Need to implement validators for each identifier type supported (look at convert idutils to WASM module and integrating that way)
 - [ ] Groups
   - [ ] Need to implement validators for each identifier type supported (look at convert idutils to WASM module and integrating that way)
 - [ ] Funder
   - [ ] Need to implement validators for each identifier type supported (look at convert idutils to WASM module and integrating that way)
 - [ ] Vocabularies
   - [ ] Need to implement validators for each identifier type supported (look at convert idutils to WASM module and integrating that way)
- [ ] Document setup, configuration and database requirements
- [ ] Add Makefile


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
