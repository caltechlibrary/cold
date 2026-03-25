#!/bin/bash

#
# Report all submissions retrieved from rdm_review_queue.ds and with useful top level columns
#
cat <<SQL >authors_submissions_csv.sql

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
ORDER BY src->>'created' DESC;

SQL

dsquery -csv "rdmid,link,status,created,title,publisher,publication_date,journal_title,groups" \
  -sql authors_submissions_csv.sql \
  rdm_review_queue.ds
