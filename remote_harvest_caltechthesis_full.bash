#!/bin/bash

# remote_harvest_caltechthesis_full.bash
#
# Full harvest of all CaltechTHESIS records from EPrints MySQL into
# caltechthesis.ds. Intended for nightly cron and initial setup.
#
# Usage: remote_harvest_caltechthesis_full.bash [path_to_env_file]
#
# Env file variables:
#   THESIS_HOST   - SSH hostname of EPrints server
#   THESIS_DBNAME - MySQL database name (caltechthesis)
#
# After a successful run the current UTC timestamp is written to
# caltechthesis_lastmod.txt for use by the incremental harvest script.
#
# Security notes (FERPA):
#   - contact_email (eprint table) is not selected
#   - user table: only username, name_family, name_given selected;
#     email, password, newpassword, pin, pinsettime are omitted
#   - eprint_creators_email, eprint_thesis_advisor_email,
#     eprint_thesis_committee_email tables are not joined
#
# Data quality notes:
#   --raw is passed to mysql so batch mode does not add a second layer of
#   backslash-escaping on top of JSON_OBJECT's own JSON encoding.  Without
#   --raw, JSON_OBJECT correctly encodes " as \" but batch mode then escapes
#   that \ to \\, producing \\" which terminates the JSON string early.
#
#   Free-text longtext fields (title, abstract, keywords, note, alt_title)
#   are cleaned of PHP magic_quotes backslash-escaping (\" -> ", \' -> ')
#   so the bare character reaches JSON_OBJECT cleanly.

WORK_DIR=$(dirname "$0")
if [ "${WORK_DIR}" != "" ]; then
    cd "${WORK_DIR}" || exit 1
fi

C_NAME="caltechthesis.ds"
C_TABLE="caltechthesis"
LASTMOD_FILE="caltechthesis_lastmod.txt"
SQL_FILE="caltechthesis_full.sql"
JSONL_FILE="caltechthesis_full.jsonl"

usage() {
    APP_NAME="$(basename "$0")"
    cat <<TXT

# NAME

${APP_NAME}

# SYNOPSIS

${APP_NAME} [OPTIONS] <path_to_env_file>

# DESCRIPTION

Full harvest of CaltechTHESIS records from EPrints MySQL.
SSHes to THESIS_HOST, runs a MySQL query, retrieves JSONL,
clears caltechthesis.ds, and reloads all records.

Run nightly via cron and for initial setup.

Env file variables:
  THESIS_HOST   hostname for SSH and MySQL access
  THESIS_DBNAME MySQL database name

# OPTIONS

-h, --help, help
: Display this help message

# EXAMPLE

~~~
${APP_NAME} caltechthesis.env
~~~

TXT
    exit 0
}

if [[ "$1" == "-h" || "$1" == "--help" || "$1" == "help" ]]; then
    usage
fi

if [ $# -eq 0 ]; then
    read -r -p "No .env file provided. Enter path: " ENV_FILE
    if [ -z "$ENV_FILE" ]; then
        echo "Error: No .env file path provided."
        exit 1
    fi
else
    ENV_FILE="$1"
fi

NEED_SAVE=0

get_env_var() {
    local var_name="$1"
    if [ -f "$ENV_FILE" ]; then
        grep "^${var_name}=" "$ENV_FILE" | cut -d '=' -f 2- | head -n 1
    fi
}

THESIS_HOST="$(get_env_var "THESIS_HOST")"
THESIS_DBNAME="$(get_env_var "THESIS_DBNAME")"

if [ -z "$THESIS_HOST" ]; then
    read -r -p "Enter THESIS_HOST: " THESIS_HOST
    NEED_SAVE=1
fi
if [ -z "$THESIS_DBNAME" ]; then
    read -r -p "Enter THESIS_DBNAME: " THESIS_DBNAME
    NEED_SAVE=1
fi

if [ -z "$THESIS_HOST" ] || [ -z "$THESIS_DBNAME" ]; then
    echo "Error: THESIS_HOST and THESIS_DBNAME must be provided."
    exit 1
fi

if [ "$NEED_SAVE" -eq 1 ]; then
    read -r -p "Save to ${ENV_FILE}.new? (y/n): " save_env
    if [[ "$save_env" =~ ^[Yy]$ ]]; then
        cat <<ENVFILE >"${ENV_FILE}.new"
THESIS_HOST=${THESIS_HOST}
THESIS_DBNAME=${THESIS_DBNAME}
ENVFILE
        echo "Saved to ${ENV_FILE}.new"
    fi
fi

echo "THESIS_HOST:   ${THESIS_HOST}"
echo "THESIS_DBNAME: ${THESIS_DBNAME}"

# Initialise collection if it does not exist
if [ ! -d "${C_NAME}" ]; then
    echo "Initialising ${C_NAME} ..."
    dataset init "${C_NAME}" || exit 1
fi

# Write harvest SQL. Quoted heredoc: no bash variable expansion in SQL body.
cat <<'SQL_QUERY' >"${SQL_FILE}"
SELECT JSON_OBJECT(
  'key', CONCAT('caltechthesis-', e.eprintid),
  'object', JSON_OBJECT(

    'eprintid',            e.eprintid,
    'title',               REPLACE(REPLACE(COALESCE(e.title,    ''), '\\"', '"'), "\\'", "'"),
    'abstract',            REPLACE(REPLACE(COALESCE(e.abstract, ''), '\\"', '"'), "\\'", "'"),
    'date',                e.date_year,
    'datestamp', CASE
      WHEN e.datestamp_year IS NOT NULL THEN
        CONCAT(e.datestamp_year, '-',
               LPAD(COALESCE(e.datestamp_month, 1), 2, '0'), '-',
               LPAD(COALESCE(e.datestamp_day,   1), 2, '0'))
      ELSE '' END,
    'lastmod', CASE
      WHEN e.lastmod_year IS NOT NULL THEN
        CONCAT(e.lastmod_year, '-',
               LPAD(COALESCE(e.lastmod_month,  1), 2, '0'), '-',
               LPAD(COALESCE(e.lastmod_day,    1), 2, '0'), ' ',
               LPAD(COALESCE(e.lastmod_hour,   0), 2, '0'), ':',
               LPAD(COALESCE(e.lastmod_minute, 0), 2, '0'), ':',
               LPAD(COALESCE(e.lastmod_second, 0), 2, '0'))
      ELSE '' END,
    'date_type',           COALESCE(e.date_type, ''),
    'thesis_degree',       COALESCE(e.thesis_degree, ''),
    'thesis_type',         COALESCE(e.thesis_type, ''),
    'thesis_defense_date', CASE
      WHEN e.thesis_defense_date_year IS NOT NULL
       AND e.thesis_defense_date_year > 0 THEN
        CONCAT(e.thesis_defense_date_year, '-',
               LPAD(COALESCE(e.thesis_defense_date_month, 1), 2, '0'), '-',
               LPAD(COALESCE(e.thesis_defense_date_day,   1), 2, '0'))
      ELSE '' END,
    'eprint_status',       e.eprint_status,
    'metadata_visibility', e.metadata_visibility,
    'full_text_status',    COALESCE(e.full_text_status, ''),
    'review_status',       COALESCE(e.review_status, ''),
    'ispublished',         COALESCE(e.ispublished, ''),
    'keywords',            REPLACE(REPLACE(COALESCE(e.keywords, ''), '\\"', '"'), "\\'", "'"),
    'official_url',        COALESCE(e.official_url, ''),
    'id_number',           COALESCE(e.id_number, ''),
    'doi',                 COALESCE(e.doi, ''),
    'reviewer',            COALESCE(e.reviewer, ''),
    'note',                REPLACE(REPLACE(COALESCE(e.note,     ''), '\\"', '"'), "\\'", "'"),
    'link',                CONCAT('https://thesis.library.caltech.edu/', e.eprintid),

    'depositor_username',  COALESCE(u.username, ''),
    'depositor_name',      COALESCE(CONCAT(u.name_family, ', ', u.name_given), ''),

    'creators', (
      SELECT JSON_ARRAYAGG(JSON_OBJECT(
        'family', cn.creators_name_family,
        'given',  cn.creators_name_given,
        'id',     COALESCE(ci.creators_id, ''),
        'orcid',  COALESCE(co.creators_orcid, '')
      ))
      FROM eprint_creators_name cn
      LEFT JOIN eprint_creators_id    ci
        ON cn.eprintid = ci.eprintid AND cn.pos = ci.pos
      LEFT JOIN eprint_creators_orcid co
        ON cn.eprintid = co.eprintid AND cn.pos = co.pos
      WHERE cn.eprintid = e.eprintid
    ),

    'thesis_advisor', (
      SELECT JSON_ARRAYAGG(JSON_OBJECT(
        'family', an.thesis_advisor_name_family,
        'given',  an.thesis_advisor_name_given,
        'id',     COALESCE(ai.thesis_advisor_id, ''),
        'orcid',  COALESCE(ao.thesis_advisor_orcid, ''),
        'role',   COALESCE(ar.thesis_advisor_role, '')
      ))
      FROM eprint_thesis_advisor_name an
      LEFT JOIN eprint_thesis_advisor_id    ai
        ON an.eprintid = ai.eprintid AND an.pos = ai.pos
      LEFT JOIN eprint_thesis_advisor_orcid ao
        ON an.eprintid = ao.eprintid AND an.pos = ao.pos
      LEFT JOIN eprint_thesis_advisor_role  ar
        ON an.eprintid = ar.eprintid AND an.pos = ar.pos
      WHERE an.eprintid = e.eprintid
    ),

    'thesis_committee', (
      SELECT JSON_ARRAYAGG(JSON_OBJECT(
        'family', tc.thesis_committee_name_family,
        'given',  tc.thesis_committee_name_given,
        'id',     COALESCE(ti.thesis_committee_id, ''),
        'orcid',  COALESCE(to2.thesis_committee_orcid, ''),
        'role',   COALESCE(tr.thesis_committee_role, '')
      ))
      FROM eprint_thesis_committee_name tc
      LEFT JOIN eprint_thesis_committee_id    ti
        ON tc.eprintid = ti.eprintid AND tc.pos = ti.pos
      LEFT JOIN eprint_thesis_committee_orcid to2
        ON tc.eprintid = to2.eprintid AND tc.pos = to2.pos
      LEFT JOIN eprint_thesis_committee_role  tr
        ON tc.eprintid = tr.eprintid AND tc.pos = tr.pos
      WHERE tc.eprintid = e.eprintid
    ),

    'divisions', (
      SELECT JSON_ARRAYAGG(d.divisions)
      FROM eprint_divisions d
      WHERE d.eprintid = e.eprintid
    ),

    'option_major', (
      SELECT JSON_ARRAYAGG(om.option_major)
      FROM eprint_option_major om
      WHERE om.eprintid = e.eprintid
    ),

    'option_minor', (
      SELECT JSON_ARRAYAGG(omi.option_minor)
      FROM eprint_option_minor omi
      WHERE omi.eprintid = e.eprintid
    ),

    'subjects', (
      SELECT JSON_ARRAYAGG(s.subjects)
      FROM eprint_subjects s
      WHERE s.eprintid = e.eprintid
    ),

    'local_group', (
      SELECT JSON_ARRAYAGG(lg.local_group)
      FROM eprint_local_group lg
      WHERE lg.eprintid = e.eprintid
    ),

    'alt_title', (
      SELECT JSON_ARRAYAGG(
        REPLACE(REPLACE(at2.alt_title, '\\"', '"'), "\\'", "'")
      )
      FROM eprint_alt_title at2
      WHERE at2.eprintid = e.eprintid
    ),

    'funders', (
      SELECT JSON_ARRAYAGG(JSON_OBJECT(
        'agency',       COALESCE(fa.funders_agency, ''),
        'grant_number', COALESCE(fg.funders_grant_number, '')
      ))
      FROM eprint_funders_agency fa
      LEFT JOIN eprint_funders_grant_number fg
        ON fa.eprintid = fg.eprintid AND fa.pos = fg.pos
      WHERE fa.eprintid = e.eprintid
    ),

    'other_ids', (
      SELECT JSON_ARRAYAGG(JSON_OBJECT(
        'name', COALESCE(osn.other_numbering_system_name, ''),
        'id',   COALESCE(osi.other_numbering_system_id,   '')
      ))
      FROM eprint_other_numbering_system_name osn
      LEFT JOIN eprint_other_numbering_system_id osi
        ON osn.eprintid = osi.eprintid AND osn.pos = osi.pos
      WHERE osn.eprintid = e.eprintid
    ),

    'fulltext_idx', TRIM(CONCAT_WS(' ',
      REPLACE(REPLACE(COALESCE(e.title,    ''), '\\"', '"'), "\\'", "'"),
      REPLACE(REPLACE(COALESCE(e.abstract, ''), '\\"', '"'), "\\'", "'"),
      REPLACE(REPLACE(COALESCE(e.keywords, ''), '\\"', '"'), "\\'", "'"),
      COALESCE((
        SELECT GROUP_CONCAT(
          REPLACE(REPLACE(at2.alt_title, '\\"', '"'), "\\'", "'")
          SEPARATOR ' ')
        FROM eprint_alt_title at2
        WHERE at2.eprintid = e.eprintid
      ), '')
    )),

    'creator_names_idx', COALESCE((
      SELECT GROUP_CONCAT(
        CONCAT(cn.creators_name_family, ', ', cn.creators_name_given)
        ORDER BY cn.pos SEPARATOR '; ')
      FROM eprint_creators_name cn
      WHERE cn.eprintid = e.eprintid
    ), ''),

    'creator_orcid_idx', COALESCE((
      SELECT GROUP_CONCAT(co.creators_orcid ORDER BY co.pos SEPARATOR '; ')
      FROM eprint_creators_orcid co
      WHERE co.eprintid = e.eprintid
    ), ''),

    'advisor_names_idx', COALESCE((
      SELECT GROUP_CONCAT(
        CONCAT(an.thesis_advisor_name_family, ', ', an.thesis_advisor_name_given)
        ORDER BY an.pos SEPARATOR '; ')
      FROM eprint_thesis_advisor_name an
      WHERE an.eprintid = e.eprintid
    ), ''),

    'committee_names_idx', COALESCE((
      SELECT GROUP_CONCAT(
        CONCAT(tc.thesis_committee_name_family, ', ', tc.thesis_committee_name_given)
        ORDER BY tc.pos SEPARATOR '; ')
      FROM eprint_thesis_committee_name tc
      WHERE tc.eprintid = e.eprintid
    ), ''),

    'funders_idx', COALESCE((
      SELECT GROUP_CONCAT(
        CONCAT_WS(' ',
          COALESCE(fa.funders_agency, ''),
          COALESCE(fg.funders_grant_number, ''))
        ORDER BY fa.pos SEPARATOR '; ')
      FROM eprint_funders_agency fa
      LEFT JOIN eprint_funders_grant_number fg
        ON fa.eprintid = fg.eprintid AND fa.pos = fg.pos
      WHERE fa.eprintid = e.eprintid
    ), ''),

    'depositor_idx', COALESCE(
      CONCAT_WS(' ', u.username, u.name_family, u.name_given), ''),

    'other_id_idx', COALESCE((
      SELECT GROUP_CONCAT(
        CONCAT_WS(' ',
          COALESCE(osn.other_numbering_system_name, ''),
          COALESCE(osi.other_numbering_system_id,   ''))
        ORDER BY osn.pos SEPARATOR '; ')
      FROM eprint_other_numbering_system_name osn
      LEFT JOIN eprint_other_numbering_system_id osi
        ON osn.eprintid = osi.eprintid AND osn.pos = osi.pos
      WHERE osn.eprintid = e.eprintid
    ), '')

  )
) AS obj
FROM eprint e
LEFT JOIN user u ON e.userid = u.userid
WHERE e.eprint_status != 'deletion'
ORDER BY e.eprintid;
SQL_QUERY

echo "Running full harvest query on ${THESIS_HOST} ..."
#shellcheck disable=SC2029
ssh "${THESIS_HOST}" "mysql --batch --raw --silent ${THESIS_DBNAME}" \
    < "${SQL_FILE}" \
    > "${JSONL_FILE}"

if [ $? -ne 0 ]; then
    echo "Error: SSH/MySQL command failed."
    exit 1
fi

if [ ! -s "${JSONL_FILE}" ]; then
    echo "Error: harvest produced empty output, aborting."
    exit 1
fi

RECORD_COUNT=$(wc -l < "${JSONL_FILE}" | tr -d ' ')
echo "Harvested ${RECORD_COUNT} records."

echo "Clearing ${C_NAME} ..."
dsquery "${C_NAME}" "DELETE FROM ${C_TABLE}"

echo "Loading into ${C_NAME} ..."
if dataset load -overwrite "${C_NAME}" < "${JSONL_FILE}"; then
    echo "Success! ${RECORD_COUNT} records loaded into ${C_NAME}."
    date -u +"%Y-%m-%d %H:%M:%S" > "${LASTMOD_FILE}"
    echo "Harvest timestamp saved to ${LASTMOD_FILE}."
else
    echo "Error: dataset load failed."
    exit 1
fi
