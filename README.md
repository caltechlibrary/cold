

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

- version: 0.0.32
- status: wip
- released: 2025-05-16

Improved Funder metadata schema. Start integration of ROR data for Funder metadata. Added &#x27;ror_import&#x27; to import a ROR data dump zipfile
into &#x27;ror.ds&#x27; dataset collection.


### Authors

- Doiel, R. S.


### Contributors

- Johnson, Kathy
- Morrell, Thomas E


### Maintainers

- Doiel, R. S.

## Software Requirements

- Deno >= 2.3.6
- Dataset >= 2.2.7
- CMTools >= 0.0.33

### Software Suggestions

- GNU Make
- Pandoc 3.1

#### Runtime platform

**- Deno 2.2**

## Related resources


- [Download](https://github.com/caltechlibrary/cold/release/latest)
- [Getting Help, Reporting bugs](https://github.com/caltechlibrary/cold/issues)
- [LICENSE](https://caltechlibrary.github.io/cold/LICENSE)
- [Installation](INSTALL.md)
- [About](about.md)

