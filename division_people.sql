select
    json_object(
        'division', src->'division', 
        'clpid', src->'cl_people_id',
        'orcid', src->'orcid',
        'family_name', src->'family_name',
        'given_name', src->'given_name'
    ) as src 
from people
where src->>'division' != ''
order by src->>'division', src->>'family_name', src->>'given_name';
