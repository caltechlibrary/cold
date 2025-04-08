#!/bin/bash
if [ -d /Sites/cold ]; then cd /Sites/cold || exit 1; fi
cat <<SQL >division_people_rpt.sql
select
    json_object(
        'division', src->'division', 
        'clpid', src->'clpid',
        'orcid', src->'orcid',
        'family_name', src->'family_name',
        'given_name', src->'given_name'
    ) as src 
from people
where src->'division' is not null
  and src->>'division' <> ''
order by src->>'division', src->>'family_name', src->>'given_name'
SQL

dsquery \
    -csv "division,clpid,orcid,family_name,given_name" \
    -sql division_people_rpt.sql \
    people.ds \
    >division_people.csv

