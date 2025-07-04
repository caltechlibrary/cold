%division_people(1) user manual | 0.0.32 d3ae5b1
% R. S.Doiel
% 2025-05-16

# NAME

division_people

# SYNOPSIS

division_people load|dump CSV_FILENAME

# DESCRIPTION

division_people can be use to dump a list of people, their division and group
as a CSV file or load to a similar CSV and have it update the people.ds
dataset collection.

Loading will not create new people in the people.ds collection. It will only
update existing people's group affilication. All people to be updated need
to have a "clpid" (Caltech Library People Identifier).  The "division" and
"other group" columns will update the groups lists for the person identified
with the "clpid".

When loading a CSV file it must have at least three columns.

~~~csv
division,clpid,orcid
~~~

The "division" column can be a division name or a clgid.

# OPTIONS

-h, --help
: display help

-l, --license
: display license

-v, --version
: display version

# EXAMPLE

Updating our people data from file called "division_people.csv".

~~~
division_people load division_people.csv
~~~

Reporting the people with division and groups to a file
called "division_people_2025-03-03.csv".

~~~
division_people dump division_people_2025-03-03.csv
~~~

