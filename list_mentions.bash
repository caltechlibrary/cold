
select json_object('rdmid', _key, 'tag', json(json_extract(src, '$.comments_with_mentions'))) as obj
from rdm_review_queue
where json(json_extract(src, '$.comments_with_mentions')) is not null

