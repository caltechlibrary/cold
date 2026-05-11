

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

- version: 0.0.40
- status: active
- released: 2026-05-08

- Bio field is now editable when a person is no longer in the campus directory; directory lookup 404 also unlocks bio with a visible warning
- ROR field auto-populates with Caltech ROR when the Caltech checkbox is checked and ROR is currently empty
- clpid auto-generated from family and given name on people create form; clgid auto-generated from group name on group create form; both check uniqueness before populating
- Fixed Firefox bug where module-level DOM captures produced stale references; switched to document-level focusout delegation
- Self-service clpid rename: new /people/rename page linked from dashboard and people view; shows full person record for confirmation; validates old key exists and new key is unique
- clean up text in the collaborator_report.html page we&#x27;ll use for testing collaborator report integration
- fixed regression, issue #100, in group submission in people form.
- fixed issue #101 in review queue
- fixed issue #102 in people edit
- fixed regressions where the &quot;[email protect]&quot; string wound up in the email field.
- Moved JavaScript for problem code from &#x60;htdocs/js&#x60;, re-coded as TypeScript with new implementations in &#x60;htdocs/modules&#x60;


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

