select json_object(
    'family_name', src->'family_name',
    'given_name', src->'given_name',
    'clpid', ifnull(src->'clpid', ''),
    'orcid', ifnull(src->'orcid', ''),
    'thesis_id', ifnull(src->'thesis_id', ''),
    'advisor_id', ifnull(src->'advisors_id', ''),
    'authors_id', ifnull(src->'authors_id', '')
  ) as src
from people
where 
  (
   (src->>'thesis_id' <> '' and src->>'clpid' <> src->>'thesis_id') or
   (src->>'advisors_id' <> '' and src->>'clpid' <> src->>'advisors_id') or
   (src->>'authors_id' <> '' and src->>'clpid' <> src->>'authors_id')
  )
order by src->'family_name', src->'given_name';
