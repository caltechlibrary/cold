

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

- version: 0.0.42
- status: active
- released: 2026-05-11

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

- Deno >= 2.7.12
- Dataset >= 2.4.0
- CMTools >= 0.0.43

### Software Suggestions

- GNU Make
- Pandoc >= 3.9



## Related resources


- [Download](https://github.com/caltechlibrary/cold/releases/latest)
- [Getting Help, Reporting bugs](https://github.com/caltechlibrary/cold/issues)
- [LICENSE](https://caltechlibrary.github.io/cold/LICENSE)
- [Installation](INSTALL.md)
- [About](about.md)

