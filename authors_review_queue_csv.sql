
SELECT
    json_object(
       'rdmid', _key,
       'link', src->>'link',
       'status', src->>'status',
       'created', src->>'created',
       'title', src->>'title',
       'publisher', src->>'publisher',
       'publication_date', src->>'publication_date',
       'journal_title', COALESCE(src->'custom_fields'->'journal:journal'->'title', ''),
       'groups', COALESCE((
           SELECT GROUP_CONCAT(value->>'id', ';')
           FROM json_each(COALESCE(src->'custom_fields'->'caltech:groups', '[]'))
       ), '')
   ) AS obj
FROM rdm_review_queue
WHERE src->>'status' = 'submitted'
ORDER BY src->>'created' DESC;

