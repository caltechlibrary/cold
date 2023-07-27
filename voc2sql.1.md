% voc2sql(1) voc2sql
% R. S. Doiel
% 2023-07-24

# NAME

voc2sql

# SYNOPIS

voc2sql < vocabulary.yaml >vocabulary.sql

# DESCRIPTION

voc2sql translates a vocabulary file into Postgres SQL.

# OPTIONS

-help
: display help

-i
: read from filename

-o
: write to filename

# EXAMPLES

~~~
voc2sql < vocabulary.yaml >vocabulary.sql
~~~


