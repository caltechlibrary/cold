
SELECT
    json_object(
       'rdmid', src->>'rdmid',
       'link', src->>'link',
       'status', src->>'status',
       'created', replace(substr(src->>'created', 1, 16), 'T', ' '),
       'title', src->>'title',
       'publisher', src->>'publisher',
       'publication_date', src->>'publication_date',
       'journal_title', COALESCE(src->'custom_fields'->'journal:journal'->'title', ''),
       'groups', COALESCE((
           SELECT GROUP_CONCAT(value->>'id', ';')
           FROM json_each(COALESCE(src->'custom_fields'->'caltech:groups', '[]'))
       ), '')
   ) AS obj
FROM rdm_requests
WHERE src->>'status' = 'submitted'
ORDER BY src->>'created' DESC;

