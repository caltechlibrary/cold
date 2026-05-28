

# cold

Caltech Library maintains a list of people, groups and funders and their related identifiers. For many years these were managed using a spreadsheets. That has become cumbersome. **COLD** manages data as JSON objects in [dataset](https://github.com/caltechlibrary/dataset) collections.

**COLD** is implemented as three web web services

- cold web UI
- cold JSON API (provided by datasetd)
- cold reports (the report request system)

Reports are implemented as a set of programs or bash scripts.

TypeScript+Deno is used to implement the web UI and report system.
The JSON API is provided by Dataset's datasetd.
Access control is provided by the front end web server integrated with Shibboleth.

## Release Notes

- version: 0.0.48
- status: active
- released: 2026-05-28

- Country Collaboration Report: new mediated report that lists all CaltechAUTHORS records where a creator, contributor, or funder is affiliated with an organization in a given country (matched via ROR). Staff pick the country by common English name from a type-ahead list rather than typing an ISO code.
- Country list auto-generated from ROR data: `ror_import` now writes `htdocs/data/country_list.json` after each ROR dump import, keeping the country picker in sync with the dataset.
- Collaborator Affiliations Report: new mediated report generating a CSV of collaborator affiliations suitable for NSF, including ROR-based affiliation details for each collaborator.
- ROR importer updated to use `dataset load` for significantly faster bulk import.
- Bug fix: the report runner was treating any stderr output as a fatal error. Commands that write progress messages to stderr (such as the country collaboration report) would produce an error string instead of a CSV. The runner now checks exit code only.
- Bug fix: on command failure, the error string was being written to the report file and the report status was incorrectly set to "completed". Errors now set status to "error" and no file is written.
- Report descriptions page (`report_descriptions.html`) updated to document all current reports including the three new mediated reports.

### Previous release

- version: 0.0.46
- status: superseded
- released: 2026-05-18

- Self-service clpid rename: new /rename/people page linked from dashboard and people view; shows full person record for confirmation; validates old key exists and new key is unique
- Fixed some relative path issues discovered in production deployment.
- Linked in new rename people method from dashboard.


### Authors

- Doiel, R. S.


### Contributors

- Johnson, Kathy
- Morrell, Thomas E


### Maintainers

- Doiel, R. S.

## Software Requirements

- Deno >= 2.7.14
- Dataset >= 2.4.0
- CMTools >= 0.0.45b

### Software Suggestions

- GNU Make
- Pandoc >= 3.9



## Related resources


- [Download](https://github.com/caltechlibrary/cold/releases/latest)
- [Getting Help, Reporting bugs](https://github.com/caltechlibrary/cold/issues)
- [LICENSE](https://caltechlibrary.github.io/cold/LICENSE)
- [Installation](INSTALL.md)
- [About](about.md)

