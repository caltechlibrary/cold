%generate_technical_reports_rpt(1) user manual | 0.0.51 cc09558
% R. S. Doiel
% 2026-08-24

# NAME

generate_technical_reports_rpt

# SYNOPSIS

generate_technical_reports_rpt [OPTIONS]

# DESCRIPTION

generate_technical_reports_rpt generates the technical reports report for CaltechAUTHORS. It takes
no arguments: it queries CaltechAUTHORS for every record whose resource type is
Technical Report ("publication-technicalnote") and writes the result to standard
output as CSV.

The report lists each record's series and custom numbering metadata together,
which is otherwise only visible by opening records one at a time. Report series
represented in the data include Computer Science Technical Reports, EERL Report,
the W. M. Keck Laboratory of Hydraulics and Water Resources Report, the
Hypersonic Research Project Memorandum and the Environmental Quality Laboratory
series.

Every Technical Report is included, whether or not it carries series metadata.
Roughly three in five records have none of the four custom series fields
populated, so many rows will have those columns empty. This is deliberate — the
report shows the whole population so that gaps in the metadata are visible
rather than silently excluded.

The columns are:

- rdmid: the CaltechAUTHORS InvenioRDM record identifier
- title: record title
- publication_date: the record's publication date, passed through as stored.
  RDM holds this as free-form text, so it may be a year, a year and month, or a
  full date; it is not normalised
- resource_type: the resource type identifier, always
  "publication-technicalnote" in this report. Retained so the file is
  self-describing and can be compared against reports that span several types
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

Count the records in the report, excluding the header row:

~~~shell
generate_technical_reports_rpt | tail -n +2 | wc -l
~~~


