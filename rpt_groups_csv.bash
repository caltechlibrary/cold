#!/bin/bash

# {
#     "Scope": "",
#     "activity": "active",
#     "alternative": [
#         "RSI"
#     ],
#     "clgid": "Resnick-Sustainability-Institute",
#     "date": "10/23/18",
#     "description": "",
#     "email": "joy@caltech.edu",
#     "end_date": "",
#     "grid": "",
#     "include_in_feeds": true,
#     "is_approx_end": false,
#     "is_approx_start": false,
#     "isni": "",
#     "name": "Resnick Sustainability Institute",
#     "parent": "Jonas Peters",
#     "pi": "",
#     "prefix": "",
#     "ringold": "",
#     "ror": "",
#     "start_date": "",
#     "updated": "3/26/20",
#     "viaf": "",
#     "website": "https://resnick.caltech.edu/"
# }

cat <<SQL>groups_rpt.sql
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
SQL

dsquery -csv "key,name,alternative,email,date,description,start,approx_start,activity,end,approx_end,website,pi,parent,prefix,grid,isni,ringold,viaf,ror,updated,Scope" -sql groups_rpt.sql groups.ds

#>groups.csv
