#!/bin/bash
if [ -d /Sites/cold ]; then cd /Sites/cold || exit 1; fi

cat <<SQL >people_rpt.sql
select 
    json_object(
        'family_name', src->'family_name',
        'given_name', src->'given_name',
        'cl_people_id', ifnull(src->'clpid', ''),
        'thesis_id', ifnull(src->'thesis_id', ''),
        'advisor_id', ifnull(src->'advisor_id', ''),
        'authors_id', ifnull(src->'authors_id', ''),
        'archivesspace_id', ifnull(src->'archivesspace_id', ''),
        'directory_id', ifnull(src->'directory_user_id', ''),
        'viaf_id', src->'viaf',
        'lcnaf', src->'lcnaf',
        'isni', src->'isni',
        'wikidata', src->'wikidata',
        'snac', src->'snac',
        'orcid', src->'orcid',
        'image', '',
        'educated_at', ifnull(src->'educated_at', ''),
        'caltech', ifnull(src->'caltech', ''),
        'jpl', ifnull(src->'jpl', ''),
        'faculty', ifnull(src->'faculty', ''),
        'staff', ifnull(src->'staff', ''),
        'alumn', ifnull(src->'alumn', ''),
        'status', ifnull(src->'status', ''),
        'directory_person_type', ifnull(src->'directory_person_type', ''),
        'title', ifnull(src->'title', ''),
        'bio', ifnull(src->'bio', ''),
        'division', ifnull(src->'division', ''),
        'authors_count', '',
        'thesis_count', '',
        'data_count', '',
        'advisor_count', '',
        'editor_count', '',
        'updated', src->'updated',
        'include_in_feeds', ifnull(src->'include_in_feeds', '')
    ) as src
from people
order by src->'family_name', src->'given_name'
SQL

dsquery \
    -csv "family_name,given_name,cl_people_id,thesis_id,advisor_id,authors_id,archivesspace_id,directory_id,viaf_id,lcnaf,isni,wikidata,snac,orcid,image,educated_at,caltech,jpl,faculty,alumn,status,directory_person_type,title,bio,division,authors_count,thesis_count,data_count,advisor_count,editor_count,updated,include_in_feeds" \
    -sql people_rpt.sql \
    people.ds \
    >people.csv
