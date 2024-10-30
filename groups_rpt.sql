select json_object(
    'key', src->'clgid',
    'name', src->'name',
    'alternative', replace(replace(replace(replace(json_quote(src->'alternative'), '","', '; '), '["', ''), '"]', ''), '[]', ''),
    'email', src->'email',
    'date', src->'date',
    'description', src->'description', 
    'start', src->'start_date',
    'approx_start', src->'is_approx_start',
    'activity', src->'activity',
    'end', src->'end_date',
    'appox_end', src->'is_approx_end',
    'website', src->'website',
    'pi', src->'pi',
    'parent', src->'parent',
    'prefix', src->'prefix',
    'grid', src->'grid',
    'isni', src->'isni',
    'ringold', src->'ringold',
    'viaf', src->'viaf',
    'ror', src->'ror',
    'updated', src->'updated',
    'Scope', src->'Scope'
) 
from groups
order by src->'name'
