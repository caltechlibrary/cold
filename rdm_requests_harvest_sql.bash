#!/bin/bash

# rdm_requests_harvest_sql.bash
#
# The shared SQL body for the RDM requests harvest. This file is *sourced* by
# remote_harvest_rdm_requests_full.bash and
# remote_harvest_rdm_requests_incremental.bash so that
# one definition of the selection and one definition of the field list serve
# both. See DR-0014 decision 8 for why this diverges from the CaltechTHESIS
# harvest pair, which duplicates its query body between the full and
# incremental scripts.
#
# Two functions are exported:
#
#   emit_filtered_requests_cte
#     The selection: community-submission requests to the CaltechAUTHORS
#     community, excluding 'created', 'cancelled' and 'declined'
#     (DR-0014 decision 1). Emitted as a bare CTE body so the prune pass can
#     reuse the same predicate.
#
#   emit_harvest_sql RDM_URL [EXTRA_PREDICATE]
#     The whole harvest query. EXTRA_PREDICATE is appended to the final WHERE
#     clause and must start with AND. The full harvest passes none; the
#     incremental's pass 1 passes the submitted filter and pass 2 the
#     watermark comparison.
#
# The records-side metadata is reached through the record's *parent*, not
# through the version the request names -- see DR-0015. A community-submission
# request points at one version and publishing a new version does not create a
# second request, so joining on the request's topic record id returns whichever
# version was submitted, which on CaltechAUTHORS is a superseded one for 34% of
# rows.
#
# For review without a database:
#
#   bash rdm_requests_harvest_sql.bash --dump https://authors.library.caltech.edu
#
# RDM_COMMUNITY_ID overrides the community, for a dev instance whose community
# uuid differs.

RDM_COMMUNITY_ID="${RDM_COMMUNITY_ID:-aedd135f-227e-4fdf-9476-5b3fd011bac6}"

emit_filtered_requests_cte() {
    cat <<SQL
filtered_requests AS (
  SELECT
    id,
    json->'topic'->>'record'    AS record_id,
    json->>'status'             AS status,
    json->'title'               AS title,
    json->'created_by'->>'user' AS created_by_user,
    created,
    updated
  FROM request_metadata
  WHERE json->'receiver'->>'community' = '${RDM_COMMUNITY_ID}'
    AND json->>'type' = 'community-submission'
    AND json->>'status' NOT IN ('created','cancelled','declined')
)
SQL
}

emit_harvest_sql() {
    local rdm_url="$1"
    local extra_predicate="${2:-}"

    if [ -z "${rdm_url}" ]; then
        echo "emit_harvest_sql: RDM_URL is required" >&2
        return 2
    fi

    cat <<SQL
WITH $(emit_filtered_requests_cte),

-- The version the request actually names, kept only for its parent_id and so
-- is_latest can say whether that version is still the current one.
submitted_version AS (
  SELECT
    fr.record_id,
    m.id        AS submitted_id,
    m.parent_id AS parent_id
  FROM filtered_requests fr
  JOIN rdm_records_metadata m ON (fr.record_id = m.json->>'id')
),

-- One row per parent: the newest version that is still present. Materialised
-- rather than resolved in a correlated lateral because parent_id is very
-- likely unindexed -- a lateral would scan the whole table once per output
-- row. "index" is quoted for safety and ordered NULLS LAST because 15 rows
-- carry a null index in production.
target_version AS (
  SELECT DISTINCT ON (parent_id)
    parent_id,
    id,
    "index",
    json,
    updated,
    deletion_status
  FROM rdm_records_metadata
  WHERE deletion_status = 'P'
  ORDER BY parent_id, "index" DESC NULLS LAST
)

SELECT json_build_object(
  'key', fr.record_id,
  'object', json_build_object(
    'rdmid', COALESCE(rec.json->>'id', dft.json->>'id'),
    'submitted_rdmid', fr.record_id,
    'uuid', fr.id,
    'link', CASE
      WHEN fr.status = 'submitted'
        THEN concat('${rdm_url}/me/requests/', fr.id)
      ELSE concat('${rdm_url}/records/', COALESCE(rec.json->>'id', dft.json->>'id'))
      END,
    'status', fr.status,
    'record_state', CASE
      WHEN rec.id IS NOT NULL THEN 'published'
      ELSE 'draft'
      END,
    'has_draft', (dft.id IS NOT NULL AND rec.id IS NOT NULL),
    'deletion_status', rec.deletion_status,
    'title', fr.title,
    'resource_type', COALESCE(
      rec.json->'metadata'->'resource_type',
      dft.json->'metadata'->'resource_type'),
    'publisher', COALESCE(
      rec.json->'metadata'->>'publisher',
      dft.json->'metadata'->>'publisher'),
    'publication_date', COALESCE(
      rec.json->'metadata'->>'publication_date',
      dft.json->'metadata'->>'publication_date'),
    'custom_fields', COALESCE(rec.json->'custom_fields', dft.json->'custom_fields'),
    'creators', COALESCE(
      rec.json->'metadata'->'creators',
      dft.json->'metadata'->'creators'),
    'access', COALESCE(rec.json->'access', dft.json->'access'),
    'parent_id', COALESCE(sv.parent_id::text, dft.json->'parent'->>'id'),
    'is_latest', CASE
      WHEN rec.id IS NULL THEN true
      ELSE (rec.id = sv.submitted_id)
      END,
    'version_index', rec."index",
    'submitted_by', au.username,
    'created', fr.created,
    'updated', GREATEST(fr.updated, COALESCE(rec.updated, dft.updated)),
    'comments_with_mentions', CASE
      WHEN fr.status = 'submitted' THEN (
        SELECT json_agg(json_build_object(
          'content', re.json->'payload'->>'content',
          'created', re.created
        ))
        FROM request_events re
        WHERE re.request_id = fr.id
          AND re.json->'payload'->>'content' ~ '@[a-zA-Z0-9_-]+'
      )
      ELSE NULL
      END
  )
) AS obj
FROM filtered_requests fr
LEFT JOIN submitted_version sv ON (fr.record_id = sv.record_id)
LEFT JOIN target_version rec ON (sv.parent_id = rec.parent_id)
LEFT JOIN rdm_drafts_metadata dft
       ON (dft.json->>'id' = COALESCE(rec.json->>'id', fr.record_id))
LEFT JOIN accounts_user au ON (fr.created_by_user = au.id::text)
-- Drop a request whose record exists but whose parent has no present version
-- left: the whole record is tombstoned. A record tombstoned at version 1 but
-- still present at version 2 is kept, and harvested at version 2.
WHERE NOT (sv.parent_id IS NOT NULL AND rec.id IS NULL)
${extra_predicate}
ORDER BY GREATEST(fr.updated, COALESCE(rec.updated, dft.updated)) DESC;
SQL
}

# Executed rather than sourced: --dump prints the SQL for review, anything else
# is a usage error.
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    case "$1" in
    --dump)
        if [ -z "$2" ]; then
            echo "usage: $(basename "$0") --dump RDM_URL [EXTRA_PREDICATE]" >&2
            exit 2
        fi
        emit_harvest_sql "$2" "$3"
        ;;
    -h | --help | help)
        cat <<TXT
$(basename "$0") is sourced by the RDM harvest scripts, not run directly.

    --dump RDM_URL [EXTRA_PREDICATE]   print the harvest SQL for review

See the comments at the top of this file, and DR-0014 decision 8 and DR-0015
in the DLD workspace.
TXT
        ;;
    *)
        echo "$(basename "$0") is meant to be sourced; try --help" >&2
        exit 2
        ;;
    esac
fi
