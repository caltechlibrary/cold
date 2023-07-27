% issn_voc2sql(1) issn_voc2sql
% R. S. Doiel
% 2023-07-24

# NAME

issn_voc2sql

# SYNOPIS

issn_voc2sql < issn_journal_publisher.tsv >issn_journal_publisher.sql

# DESCRIPTION

issn_voc2sql translates a tsv vocabulary file into Postgres SQL.

# OPTIONS

-help
: display help

-i
: read from filename

-o
: write to filename

# EXAMPLES

~~~
issn_voc2sql < issn_journal_publisher.tsv >issn_journal_publisher.sql
~~~


