%generate_technical_reports_rpt(1) user manual | 0.0.52 6809ef1
% R. S. Doiel
% 2026-09-09

# NAME

generate_technical_reports_rpt

# SYNOPSIS

generate_technical_reports_rpt [OPTIONS]

# DESCRIPTION

generate_technical_reports_rpt generates the technical reports report for CaltechAUTHORS. It takes
no arguments, and writes CSV to standard output.

The report is a metadata triage tool rather than a listing of technical
reports. It is built for three uses:

1. finding technical reports whose metadata is incomplete,
2. finding records misclassified as another type that are really technical
   reports,
3. finding technical reports missing their custom series metadata.

The second use is why the selection is a UNION rather than a resource type.
The report includes every record typed "publication-technicalnote", AND every
record carrying any of the four custom series fields whatever its type. A
record filed under the wrong type can only be spotted if the report is willing
to show records that are not typed as technical reports in the first place.
About 19,400 rows as of September 2026.

So the resource_type column varies, and that is the point. Sixteen distinct
types appear, and the two largest are not technical reports at all —
"publication-section" and "publication-article", each about 7,000 rows. A
series-numbered record sitting in one of those is exactly what use 2 is
looking for, and sorting by series puts it next to its correctly-typed
siblings.

About 1,250 rows carry no series metadata whatsoever, and every one of them is
typed "publication-technicalnote" — they are in the report only because of the
union's first half, and they are what use 1 asks for. Their series columns are
empty by design, not through a fault in the report. They sort to the end.

Report series represented in the data include Computer Science Technical
Reports, EERL Report, the W. M. Keck Laboratory of Hydraulics and Water
Resources Report, the Hypersonic Research Project Memorandum and the
Environmental Quality Laboratory series.

The data comes from the rdm_requests.ds collection through the COLD datasetd
service, not from the CaltechAUTHORS API, so datasetd must be running for the
report to succeed. Two consequences follow. The report is only as fresh as the
last RDM harvest — if the harvest has not run, the report reflects the
collection as it stood then, and will look current while being stale. And
records in a draft state are excluded: the report covers published records
only.

The columns are:

- rdmid: the CaltechAUTHORS InvenioRDM record identifier
- title: record title
- publication_date: the record's publication date, passed through as stored.
  RDM holds this as free-form text, so it may be a year, a year and month, or a
  full date; it is not normalised
- resource_type: the resource type identifier as recorded on the record. This
  varies across the report and is the column that makes a misclassified record
  visible
- series: the series name, from custom field caltech:series
- series_number: the number within that series, from caltech:series_number
- other_num_name: the name of an additional numbering system applied to the
  record, from caltech:other_num_name
- other_num_id: the record's identifier within that numbering system, from
  caltech:other_num_id
- groups: semicolon-separated CaltechGROUPS group identifiers, from
  caltech:groups. Empty when a record has no group

Rows are sorted by series, then series_number, then title, so each report series
appears together. Records with no series name sort after those that have one.
Series numbers are compared as text rather than numerically, so "10" sorts
before "9".

Progress messages are written to standard error, so redirecting standard output
captures only the CSV.

A run that matches nothing is a success, not a failure: the report writes the
header row on its own and exits 0, so an empty result opens in a spreadsheet
and shows its column names. A non-zero exit means the query genuinely failed —
datasetd not running, or the named query missing from cold_api.yaml — and in
that case nothing at all is written to standard output. An empty report and a
failed report are therefore never the same thing.

# OPTIONS

-h, --help
: display help

-l, --license
: display license

-v, --version
: display version

# EXAMPLE

Write the report to a file:

~~~shell
generate_technical_reports_rpt >technical_reports.csv
~~~

Count the records in the report:

~~~shell
generate_technical_reports_rpt | csv2json | jsonrange -length
~~~

Counting lines instead of records gives the wrong answer. Several hundred
titles contain an embedded newline, which RFC 4180 requires be written inside
a quoted field, so one record can span several lines of the file. As of
September 2026 "tail -n +2 | wc -l" over this report reports about 300 more
records than there are. Any tool that reads the file as CSV rather than as
lines — csv2json above, a spreadsheet, or a CSV library — counts correctly.


