#!/bin/bash

# rdm_requests_harvest_sql.bash
#
# The shared SQL body and load discipline for the RDM requests harvest. This
# file is *sourced* by remote_harvest_rdm_requests_full.bash and
# remote_harvest_rdm_requests_incremental.bash so that one definition of the
# selection, one definition of the field list, and one definition of "did the
# load actually complete" serve both. See DR-0014 decision 8 for why this
# diverges from the CaltechTHESIS harvest pair, which duplicates its query body
# between the full and incremental scripts. (The name says sql; it also carries
# the load helper, which belongs with the query it loads.)
#
# WHY THE QUERY LOOKS LIKE THIS -- read before editing (DR-0018).
#
# rdm_records_metadata is 93 MB of heap and 1,622 MB with TOAST. Scanning the
# heap is cheap: a count(*) over the whole table measures 17 ms. Selecting the
# json column is not: it detoasts up to a gigabyte and a half. Every
# performance property of this query follows from that one fact.
#
#   * A record id string is resolved through pidstore_pid, which has a UNIQUE
#     index on (pid_type, pid_value), and then by PRIMARY KEY into
#     rdm_records_metadata or rdm_drafts_metadata. Joining on json->>'id'
#     instead -- which is what this query used to do -- has no index and forces
#     a detoasting scan.
#
#   * The target version is PICKED from heap columns only (parent_id, id,
#     index) and its json is FETCHED afterwards by primary key. Selecting json
#     inside the pick detoasts every candidate version to return one.
#
#   * The pick is restricted to the parents in the driving set, so an
#     incremental pass touches thousands of parents rather than all 110,000.
#
#   * A pass's predicate goes INSIDE filtered_requests, never appended to the
#     outer WHERE. Appended, it drops the planner's row estimate without
#     narrowing anything, and the planner answers by switching to nested loops
#     that rescan a 147,000-row table per driving row. That is how pass 1 came
#     to run for 32 minutes to return 918 rows.
#
#   * @mentions are aggregated in one pass over request_events, not fetched by
#     a correlated subquery. request_events has no index on request_id, so a
#     correlated subquery scans a 280 MB table once per output row.
#
#   * The CTEs are AS MATERIALIZED. An ordinary CTE is inlinable in PostgreSQL
#     12 and later, so the planner is free to re-plan it per row -- exactly
#     what the previous version of this file meant to forbid and did not.
#
# Exported:
#
#   emit_request_scope_predicate
#     Which requests are ours: community-submission to the CaltechAUTHORS
#     community. Shared so the prune pass cannot drift from the harvest.
#
#   emit_harvest_sql RDM_URL [EXTRA_CTES] [PASS_PREDICATE] [MODE]
#     The harvest query. EXTRA_CTES is inserted before filtered_requests and
#     must end with a comma; PASS_PREDICATE is added inside filtered_requests
#     and must start with AND. MODE is keyed (default, for the incremental) or
#     bulk (for the full harvest) -- see the case statement for why the two
#     need different plans. Both emit identical rows.
#
#   emit_changed_since_ctes WATERMARK
#   emit_changed_since_predicate
#     Together, the incremental's pass 2: the CTEs find every record id whose
#     record, draft or sibling version moved since the watermark, and the
#     predicate restricts the selection to them.
#
#   emit_prune_keys_sql WATERMARK
#     Bare record ids to delete: requests that have left the states of
#     interest, and records whose parent has lost its last present version.
#
#   load_jsonl_verified C_NAME C_TABLE JSONL_FILE
#     Load with an 8 MB buffer and refuse to call it a success unless the rows
#     touched equal the distinct keys in the file (DR-0017). Sets LOAD_MARK,
#     LOAD_EXPECTED and LOAD_TOUCHED for the caller; the full harvest sweeps on
#     LOAD_MARK.
#
# For review without a database:
#
#   bash rdm_requests_harvest_sql.bash --dump https://authors.library.caltech.edu
#
# RDM_COMMUNITY_ID overrides the community, for a dev instance whose community
# uuid differs.

RDM_COMMUNITY_ID="${RDM_COMMUNITY_ID:-aedd135f-227e-4fdf-9476-5b3fd011bac6}"

# How far back of the saved watermark each incremental pass reaches, so a row
# committed while the previous harvest was running is not missed (DR-0014
# decision 5). The arithmetic is done by Postgres rather than by date(1),
# which keeps this portable between the Linux host that runs cron and a
# developer's macOS.
RDM_WATERMARK_OVERLAP="${RDM_WATERMARK_OVERLAP:-5 minutes}"

emit_request_scope_predicate() {
    cat <<SQL
json->'receiver'->>'community' = '${RDM_COMMUNITY_ID}'
    AND json->>'type' = 'community-submission'
SQL
}

emit_harvest_sql() {
    local rdm_url="$1"
    local extra_ctes="${2:-}"
    local pass_predicate="${3:-}"
    local mode="${4:-keyed}"
    local target_cte join_block mat

    if [ -z "${rdm_url}" ]; then
        echo "emit_harvest_sql: RDM_URL is required" >&2
        return 2
    fi

    # The two harvests want opposite plans, measured 2026-09-09 (DR-0019).
    #
    #   keyed -- pick the winning version from heap columns, then fetch its
    #   json by primary key. Detoasting tracks rows RETURNED. Pass 1 of the
    #   incremental runs in 0.96 s this way.
    #
    #   bulk -- one sequential pass that picks and carries json together.
    #   Detoasting tracks rows CONSIDERED, which is the whole table, but it is
    #   sequential. The full harvest returns 99% of the corpus, so keyed turns
    #   one sequential scan into 110,000 random TOAST fetches: it ran over 27
    #   minutes before being killed, against roughly 2 minutes for bulk.
    #
    # Both shapes expose the same alias, rec, so the field list below does not
    # branch.
    case "${mode}" in
    keyed)
        # AS MATERIALIZED stops the planner inlining a CTE and re-planning it
        # per driving row, which is what a selective predicate provokes.
        mat="MATERIALIZED"
        target_cte='-- Pick from HEAP COLUMNS ONLY, restricted to the parents in play. The
-- winner'"'"'s json is fetched below by primary key.
target_pick AS MATERIALIZED (
  SELECT DISTINCT ON (m.parent_id)
    m.parent_id,
    m.id,
    m."index"
  FROM rdm_records_metadata m
  WHERE m.deletion_status = '"'"'P'"'"'
    AND m.parent_id IN (SELECT parent_id FROM submitted_version)
  ORDER BY m.parent_id, m."index" DESC NULLS LAST
),'
        join_block='LEFT JOIN target_pick tp ON (tp.parent_id = sv.parent_id)
-- The winner'"'"'s json, by primary key: the only place records-side json is
-- detoasted, once per output row.
LEFT JOIN rdm_records_metadata rec ON (rec.id = tp.id)'
        ;;
    bulk)
        # NOT materialised, deliberately. Materialising the bulk pick forces
        # ~110,000 rows and 1.5 GB of json into a tuplestore before a single
        # row is emitted; a run that way passed 19 minutes and was killed. An
        # unselective query needs no protection from the planner -- its row
        # estimates are honest, so it hash-joins and streams.
        mat=""
        target_cte='-- One sequential pass that picks the winning version AND carries its json.
-- Detoasts more than it returns, but sequentially, which is the right trade
-- when the query returns almost every row. No parent restriction either: when
-- the driving set is everything the semi-join buys nothing, and it would force
-- submitted_version to be computed first.
target_pick AS (
  SELECT DISTINCT ON (m.parent_id)
    m.parent_id,
    m.id,
    m."index",
    m.json,
    m.updated,
    m.deletion_status
  FROM rdm_records_metadata m
  WHERE m.deletion_status = '"'"'P'"'"'
  ORDER BY m.parent_id, m."index" DESC NULLS LAST
),'
        join_block='LEFT JOIN target_pick rec ON (rec.parent_id = sv.parent_id)'
        ;;
    *)
        echo "emit_harvest_sql: mode must be keyed or bulk, got ${mode}" >&2
        return 2
        ;;
    esac

    cat <<SQL
WITH ${extra_ctes}

-- The selection. A pass narrows it HERE, before any join is planned.
filtered_requests AS ${mat} (
  SELECT
    id,
    json->'topic'->>'record'    AS record_id,
    json->>'status'             AS status,
    json->'title'               AS title,
    json->'created_by'->>'user' AS created_by_user,
    created,
    updated
  FROM request_metadata
  WHERE $(emit_request_scope_predicate)
    AND json->>'status' NOT IN ('created','cancelled','declined')
    ${pass_predicate}
),

-- Record id string to record uuid, through pidstore_pid's unique index on
-- (pid_type, pid_value). Both published records and drafts resolve here: all
-- 918 submitted requests resolve to a drafts row, published ones to a records
-- row.
resolved AS ${mat} (
  SELECT
    fr.record_id,
    p.object_uuid
  FROM filtered_requests fr
  JOIN pidstore_pid p
    ON (p.pid_type = 'recid' AND p.object_type = 'rec' AND p.pid_value = fr.record_id)
),

-- The version the request named, by primary key. Kept for its parent_id and
-- so is_latest can say whether that version is still the current one.
submitted_version AS ${mat} (
  SELECT
    r.record_id,
    m.id        AS submitted_id,
    m.parent_id AS parent_id
  FROM resolved r
  JOIN rdm_records_metadata m ON (m.id = r.object_uuid)
),

${target_cte}

-- @mentions for the submitted requests, aggregated in ONE pass. As a
-- correlated subquery this scanned request_events once per output row --
-- 918 sequential scans of a 280 MB table, which measured 59.5 s of pass 1's
-- runtime on 2026-09-09. request_events has no index on request_id, so the
-- only cheap shape is a single scan aggregated by request. Restricted to
-- submitted requests per DR-0014 decision 3.
mentions AS ${mat} (
  SELECT
    re.request_id,
    json_agg(json_build_object(
      'content', re.json->'payload'->>'content',
      'created', re.created
    )) AS items
  FROM request_events re
  WHERE re.request_id IN (SELECT id FROM filtered_requests WHERE status = 'submitted')
    AND re.json->'payload'->>'content' ~ '@[a-zA-Z0-9_-]+'
  GROUP BY re.request_id
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
    'comments_with_mentions', mn.items
  )
) AS obj
FROM filtered_requests fr
LEFT JOIN resolved r ON (r.record_id = fr.record_id)
LEFT JOIN submitted_version sv ON (sv.record_id = fr.record_id)
${join_block}
-- The draft in flight on the CURRENT version, or the draft that IS the record
-- for a never-published submission. Primary key either way.
LEFT JOIN rdm_drafts_metadata dft ON (dft.id = COALESCE(rec.id, r.object_uuid))
LEFT JOIN accounts_user au ON (fr.created_by_user = au.id::text)
LEFT JOIN mentions mn ON (mn.request_id = fr.id)
-- Drop a request whose record exists but whose parent has no present version
-- left: the whole record is tombstoned. A record tombstoned at version 1 but
-- still present at version 2 is kept, and harvested at version 2.
WHERE NOT (sv.parent_id IS NOT NULL AND rec.id IS NULL)
ORDER BY GREATEST(fr.updated, COALESCE(rec.updated, dft.updated)) DESC;
SQL
}

# Pass 2's CTEs. Every step here reads heap columns or uses an index: the two
# "updated > watermark" scans never touch json, and the pidstore joins use
# idx_object on (object_type, object_uuid).
emit_changed_since_ctes() {
    local watermark="$1"

    if [ -z "${watermark}" ]; then
        echo "emit_changed_since_ctes: WATERMARK is required" >&2
        return 2
    fi

    local since="('${watermark}'::timestamp - interval '${RDM_WATERMARK_OVERLAP}')"

    cat <<SQL
-- Parents with any version touched since the watermark. Parent-level because a
-- new version is a NEW ROW and a deleted version makes the target fall back to
-- a row whose own timestamp is old, so neither is visible row by row.
changed_parents AS MATERIALIZED (
  SELECT DISTINCT parent_id
  FROM rdm_records_metadata
  WHERE updated > ${since}
),

-- The record ids those parents' versions carry, plus drafts touched since the
-- watermark.
changed_record_ids AS MATERIALIZED (
  SELECT p.pid_value AS record_id
  FROM rdm_records_metadata m
  JOIN pidstore_pid p
    ON (p.pid_type = 'recid' AND p.object_type = 'rec' AND p.object_uuid = m.id)
  WHERE m.parent_id IN (SELECT parent_id FROM changed_parents)
  UNION
  SELECT p.pid_value
  FROM rdm_drafts_metadata d
  JOIN pidstore_pid p
    ON (p.pid_type = 'recid' AND p.object_type = 'rec' AND p.object_uuid = d.id)
  WHERE d.updated > ${since}
),
SQL
}

# The predicate that goes with the CTEs above. Applied inside
# filtered_requests, so the selection is narrow before anything is joined.
emit_changed_since_predicate() {
    cat <<SQL
AND ( updated > ('${1}'::timestamp - interval '${RDM_WATERMARK_OVERLAP}')
   OR json->'topic'->>'record' IN (SELECT record_id FROM changed_record_ids) )
SQL
}

emit_prune_keys_sql() {
    local watermark="$1"

    if [ -z "${watermark}" ]; then
        echo "emit_prune_keys_sql: WATERMARK is required" >&2
        return 2
    fi

    local since="('${watermark}'::timestamp - interval '${RDM_WATERMARK_OVERLAP}')"

    cat <<SQL
-- Bare record ids to remove from the collection. Two reasons a row goes:
--
--   a) the request has left the states librarians care about, and
--   b) the record's parent has lost its last present version.
--
-- (b) is deliberately parent-level. Deleting on "this record's deletion_status
-- became 'D'" would remove a live record whose FIRST version was tombstoned
-- while a later version is still present -- production has nine parents in the
-- mirror configuration, so the case is real.
--
-- Neither half joins the request selection: a key that was never harvested is
-- harmless to delete, and dataset delete tolerates it. That keeps this off the
-- expression joins.

SELECT json->'topic'->>'record' AS record_id
FROM request_metadata
WHERE $(emit_request_scope_predicate)
  AND updated > ${since}
  AND json->>'status' IN ('created','cancelled','declined')

UNION

SELECT DISTINCT p.pid_value
FROM rdm_records_metadata m
JOIN pidstore_pid p
  ON (p.pid_type = 'recid' AND p.object_type = 'rec' AND p.object_uuid = m.id)
WHERE m.parent_id IN (
        SELECT parent_id FROM rdm_records_metadata WHERE updated > ${since})
  AND NOT EXISTS (
        SELECT 1 FROM rdm_records_metadata q
        WHERE q.parent_id = m.parent_id AND q.deletion_status = 'P');
SQL
}

# Load a JSON-L file and refuse to report success unless every line landed
# (DR-0017). An empty file is a legitimate no-op for the incremental.
#
# Sets LOAD_MARK, LOAD_EXPECTED and LOAD_TOUCHED for the caller.
load_jsonl_verified() {
    local c_name="$1" c_table="$2" jsonl="$3"

    LOAD_EXPECTED=$(awk 'match($0, /"key"[^"]*"[^"]*"/) {
        k = substr($0, RSTART, RLENGTH); sub(/^"key"[^"]*"/, "", k); sub(/"$/, "", k)
        seen[k] = 1
    } END { print length(seen) }' "${jsonl}")

    if [ -z "${LOAD_EXPECTED}" ]; then
        echo "Error: could not read keys from ${jsonl}."
        return 1
    fi

    LOAD_MARK="$(date -u +"%Y-%m-%d %H:%M:%S")"

    if [ "${LOAD_EXPECTED}" -eq 0 ]; then
        if [ -s "${jsonl}" ]; then
            echo "Error: ${jsonl} has content but no parseable keys."
            return 1
        fi
        LOAD_TOUCHED=0
        return 0
    fi

    if ! dataset load -overwrite -m 8 "${c_name}" <"${jsonl}"; then
        echo "Error: dataset load failed for ${jsonl}."
        return 1
    fi

    LOAD_TOUCHED=$(dsquery "${c_name}" \
        "SELECT count(*) FROM ${c_table} WHERE updated >= '${LOAD_MARK}'" |
        tr -dc '0-9')

    if [ "${LOAD_TOUCHED}" != "${LOAD_EXPECTED}" ]; then
        echo "Error: ${jsonl} holds ${LOAD_EXPECTED} keys but the load touched ${LOAD_TOUCHED} rows."
        echo "The load did not complete."
        return 1
    fi

    return 0
}

# Executed rather than sourced: --dump prints the SQL for review, anything else
# is a usage error.
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    case "$1" in
    --dump)
        if [ -z "$2" ]; then
            echo "usage: $(basename "$0") --dump RDM_URL [full|pass1|pass2|prune] [WATERMARK]" >&2
            exit 2
        fi
        case "${3:-full}" in
        full) emit_harvest_sql "$2" "" "" bulk ;;
        pass1) emit_harvest_sql "$2" "" "AND json->>'status' = 'submitted'" keyed ;;
        pass2)
            W="${4:-2026-01-01 00:00:00}"
            emit_harvest_sql "$2" "$(emit_changed_since_ctes "${W}")" \
                "$(emit_changed_since_predicate "${W}")" keyed
            ;;
        prune) emit_prune_keys_sql "${4:-2026-01-01 00:00:00}" ;;
        *)
            echo "unknown variant: ${3}" >&2
            exit 2
            ;;
        esac
        ;;
    -h | --help | help)
        cat <<TXT
$(basename "$0") is sourced by the RDM harvest scripts, not run directly.

    --dump RDM_URL [full|pass1|pass2|prune] [WATERMARK]

Prints the generated SQL for review. See the comment block at the top of this
file, and DR-0014 decision 8, DR-0015, DR-0017 and DR-0018 in the DLD
workspace.
TXT
        ;;
    *)
        echo "$(basename "$0") is meant to be sourced; try --help" >&2
        exit 2
        ;;
    esac
fi
