#!/bin/bash

dsquery -csv "family_name,given_name,cl_people_id,thesis_id,advisor_id,authors_id,archivesspace_id,directory_id,viaf_id,lcnaf,isni,wikidata,orcid,image,educated_at,caltech,jpl,faculty,alumn,status,directory_person_type,title,bio,division,authors_count,thesis_count,data_count,advisor_count,editor_count,updated,is_in_feeds" people.ds "select json_object( 'family_name', src->'family_name', 'given_name', src->'given_name', 'cl_people_id', src->'clpid', 'thesis_id', src->'thesis_id', 'advisor_id', src->'advisor_id', 'authors_id', src->'authors_id', 'archivesspace_id', src->'archivesspace_id', 'directory_id', src->'directory_user_id', 'viaf_id', src->'viaf', 'lcnaf', src->'lcnaf', 'isni', src->'isni', 'wikidata', src->'wikidata', 'orcid', src->'orcid', 'image', '', 'educated_at', src->'educated_at', 'caltech', src->'caltech', 'jpl', src->'jpl', 'faculty', src->'faculty', 'alumn', src->'alumn', 'status', src->'status', 'directory_person_type', src->'directory_person_type', 'title', src->'title', 'bio', src->'bio', 'division', src->'division', 'authors_count', '', 'thesis_count', '', 'data_count', '', 'advisor_count', '', 'editor_count', '', 'updated', '', 'include_in_feeds', src->'include_in_feeds') as src from people order by src->'family_name', src->'given_name'" >people.csv
