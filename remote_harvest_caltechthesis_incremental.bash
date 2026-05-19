#!/bin/bash

# remote_harvest_caltechthesis_incremental.bash
#
# Incremental harvest of CaltechTHESIS records modified since the last
# harvest. Intended to run every 15 minutes during working hours via cron.
#
# Usage: remote_harvest_caltechthesis_incremental.bash [path_to_env_file]
#
# Reads the last harvest timestamp from caltechthesis_lastmod.txt.
# If that file does not exist, exits with an error — run the full
# harvest first (remote_harvest_caltechthesis_full.bash).
#
# Uses dataset load -overwrite (upsert) so unchanged records are not
# disturbed. Only updates or adds records where MySQL lastmod > saved timestamp.
# After a successful load the timestamp file is updated to now.
#
# Security / data quality notes: same as remote_harvest_caltechthesis_full.bash.
# --raw is essential: prevents MySQL batch mode from double-escaping the
# backslashes that JSON_OBJECT uses for its own JSON encoding.

WORK_DIR=$(dirname "$0")
if [ "${WORK_DIR}" != "" ]; then
    cd "${WORK_DIR}" || exit 1
fi

C_NAME="caltechthesis.ds"
LASTMOD_FILE="caltechthesis_lastmod.txt"
SQL_FILE="caltechthesis_incremental.sql"
JSONL_FILE="caltechthesis_incremental.jsonl"

usage() {
    APP_NAME="$(basename "$0")"
    cat <<TXT

# NAME

${APP_NAME}

# SYNOPSIS

${APP_NAME} [OPTIONS] <path_to_env_file>

# DESCRIPTION

Incremental harvest of CaltechTHESIS records changed since the last
harvest. Reads the saved timestamp from caltechthesis_lastmod.txt and
queries MySQL for records where lastmod > that timestamp.

If no records have changed the collection is left untouched and the
timestamp is updated. Run the full harvest script first to initialise
caltechthesis_lastmod.txt.

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

get_env_var() {
    local var_name="$1"
    if [ -f "$ENV_FILE" ]; then
        grep "^${var_name}=" "$ENV_FILE" | cut -d '=' -f 2- | head -n 1
    fi
}

THESIS_HOST="$(get_env_var "THESIS_HOST")"
THESIS_DBNAME="$(get_env_var "THESIS_DBNAME")"

if [ -z "$THESIS_HOST" ] || [ -z "$THESIS_DBNAME" ]; then
    echo "Error: THESIS_HOST and THESIS_DBNAME must be set in ${ENV_FILE}."
    exit 1
fi

if [ ! -f "${LASTMOD_FILE}" ]; then
    echo "Error: ${LASTMOD_FILE} not found."
    echo "Run remote_harvest_caltechthesis_full.bash first."
    exit 1
fi

LAST_HARVEST=$(cat "${LASTMOD_FILE}")
if [ -z "${LAST_HARVEST}" ]; then
    echo "Error: ${LASTMOD_FILE} is empty."
    exit 1
fi

echo "THESIS_HOST:    ${THESIS_HOST}"
echo "THESIS_DBNAME:  ${THESIS_DBNAME}"
echo "Harvesting records modified after: ${LAST_HARVEST}"

# Unquoted heredoc: ${LAST_HARVEST} is expanded; no other $ signs in SQL body.
cat <<SQL_QUERY >"${SQL_FILE}"
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
    'link',                CONCAT('https://thesis.library.caltech.edu/cgi/users/home?screen=Workflow%3A%3AView&dataset=eprint&dataobj=', e.eprintid),

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
  AND CONCAT(
        e.lastmod_year, '-',
        LPAD(COALESCE(e.lastmod_month,  1), 2, '0'), '-',
        LPAD(COALESCE(e.lastmod_day,    1), 2, '0'), ' ',
        LPAD(COALESCE(e.lastmod_hour,   0), 2, '0'), ':',
        LPAD(COALESCE(e.lastmod_minute, 0), 2, '0'), ':',
        LPAD(COALESCE(e.lastmod_second, 0), 2, '0')
      ) > '${LAST_HARVEST}'
ORDER BY e.eprintid;
SQL_QUERY

echo "Running incremental harvest query on ${THESIS_HOST} ..."
#shellcheck disable=SC2029
ssh "${THESIS_HOST}" "mysql --batch --raw --silent ${THESIS_DBNAME}" \
    < "${SQL_FILE}" \
    > "${JSONL_FILE}"

if [ $? -ne 0 ]; then
    echo "Error: SSH/MySQL command failed."
    exit 1
fi

RECORD_COUNT=$(wc -l < "${JSONL_FILE}" | tr -d ' ')

if [ "${RECORD_COUNT}" -eq 0 ]; then
    echo "No records changed since ${LAST_HARVEST}. Collection unchanged."
else
    echo "Loading ${RECORD_COUNT} changed record(s) into ${C_NAME} ..."
    if dataset load -overwrite "${C_NAME}" < "${JSONL_FILE}"; then
        echo "Success! ${RECORD_COUNT} record(s) updated in ${C_NAME}."
    else
        echo "Error: dataset load failed."
        exit 1
    fi
fi

date -u +"%Y-%m-%d %H:%M:%S" > "${LASTMOD_FILE}"
echo "Timestamp updated in ${LASTMOD_FILE}."
