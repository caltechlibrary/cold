---
page_title: Development Notes
---

# Development Notes

## Reports

Reports can be assumed to be CSV generated files. Dataset's dsquery can produce csv as an output option.  If datasetd integration of the dsquery functionality included a format option then it could produce the reports as CSV with minimal modification to existing API code.  COLD Admin would just have to define a new route for each type of CSV report run from dsquery. The COLD Admin TypeScript code would only need to proxy to the datasetd end point and then properly hand back the CSV file. This should work for most cases where a simple SQL select statement can be constructed to produce the data needed.

Regular complex SQL causing clow queries should be done through a cronjob (e.g. think Recent Grad Report, Creator's report on CaltechAUTHORS) and could be provided as links in the UI if the file exists. This would require a predictable path and name. The TypeScript could have a handler that lists what reports are available at this time.

- Evaluate the effort in enhancing datasetd/dsquery to provide results in CSV and YAML, this would let me easily generate the vocabularies from dsquery results

## Data enhancements needed

- Various "counts" for people or groups
  - [ ] Need to identify an effecient mains of getting counts per field, per repository
  - [ ] Figure out the best approach to updating this either via cron or on demand
- Caltech Directory data enhancement, this should be done on a cronjob AND have an option of being initiated interactively from the edit screens
  - [ ] Figure out how to scrape the HTML to pull the fields without cause problems for the directory
  - [ ] See if I can can isolate the TypeScript and generate JavaScript to provide on demand refresh from the directory
- ORCID integration for people
  - [ ] Look at the current JSON API and see if it makes sense to do on demand or via a harvest process

