
# CaltechTHESIS Search Integration into COLD

## Background

CaltechTHESIS (https://thesis.library.caltech.edu) is Caltech Library's thesis
repository, built on EPrints 3.3.16 with MySQL 8 as the backend database. The
EPrints native search implementation has long-standing indexing bugs that cause
records to be silently omitted from search results. All metadata is intact in
MySQL; the problem is confined to EPrints' own search index tables
(`eprint__index`, `eprint__index_grep`, `eprint__rindex`).

Library staff need a reliable search interface covering all ~12K records,
including records in non-archive states (inbox, buffer) that staff must be
able to locate for workflow purposes. The reference form is the EPrints staff
search at `/cgi/search/eprint/staff`. This integration follows the same
layered architecture as the RDM review queue tool already in COLD.

## FERPA Considerations

Some thesis records are subject to FERPA (Family Educational Privacy Rights
Act) as student education records. Library staff authorized to use COLD are
authorized to see all thesis records, including non-public ones, as part of
their role administering library deposit services. The following design
decisions minimize the attack surface in case a staff account is compromised:

- **Email and password fields are never harvested.** The tables
  `eprint_creators_email`, `eprint_creators_show_email`,
  `eprint_thesis_advisor_email`, and `eprint_thesis_committee_email` are not
  joined. The `eprint.contact_email` column is not selected. From the `user`
  table JOIN only `username`, `name_family`, and `name_given` are selected;
  `email`, `password`, `newpassword`, `pin`, and `pinsettime` are omitted.
- **Data in transit is encrypted.** Harvest uses SSH to `eprints.library.caltech.edu`;
  the COLD production interface uses HTTPS.
- **Access control** is the existing Apache2 + Shibboleth SSO that governs all
  of COLD. No additional role gating is required.
- **Status and visibility are always displayed** in search results so staff
  immediately know which records are not yet public.

## Architecture

```
CaltechTHESIS MySQL (eprints.library.caltech.edu)
    |
    | SSH + mysql client (encrypted)
    v
remote_harvest_caltechthesis_full.bash        (nightly, full refresh)
remote_harvest_caltechthesis_incremental.bash (every 15 min, working hours)
    |
    | dataset load -overwrite
    v
caltechthesis.ds  (SQLite3-backed dataset collection)
    |
    | cold_api.yaml SQL queries
    v
cold_api  (datasetd JSON API, proxied by COLD middleware)
    |
    | fetch() from browser
    v
thesis_search.ts → htdocs/modules/thesis_search.js  (browser UI)
    |
    v
htdocs/thesis_search.md → htdocs/thesis_search.html  (staff-facing page)
```

## Staff Search Form Fields

The target form is `/cgi/search/eprint/staff`. Fields are organised by input
type because that determines query strategy.

### Text inputs (LIKE search, `*` wildcard → `%`)

| Form field | Label | Notes |
|---|---|---|
| `title` | Title | |
| `alt_title` | Alternate Title | |
| `creators_name` | Authors | family or "family, given" |
| `creators_orcid` | ORCID | exact or partial |
| `abstract` | Abstract | |
| `eprintid` | Item ID | exact integer |
| `doi` | DOI | |
| `userid.username` | Username | depositor's EPrints/Caltech username |
| `userid.name` | Name | depositor's name |
| `reviewer` | Reviewer | library staff name |
| `date` | Degree Date (Year) | year range |
| `funders_agency` | Funding Agency | |
| `funders_grant_number` | Grant Number | |
| `local_group` | Group | |
| `other_numbering_system_name` | Other ID Scheme | e.g. ProQuest |
| `other_numbering_system_id` | Other ID Value | |

`dir` (file system path) and `datestamp` (Date Deposited) are omitted from
the search form — not used by staff. `datestamp` is still present in the
harvested JSON for status display and incremental harvest logic.

### Checkbox groups (multi-value, ANY-of semantics default)

**Item Status** (`eprint_status`):
- `inbox` — User Workarea
- `buffer` — Under Review
- `archive` — Live Archive
- `deletion` — Retired

**Review Status** (`review_status`):
- `review` — Being reviewed
- `correction` — Waiting for corrections
- `gradoffice` — Sent to Grad Office
- `go-pending` — Pending in GO — see notes
- `notapproved` — Not Approved — see notes
- `approved` — Approved
- `withheld` — Approved — WITHHELD
- `other` — Other — see Internal Notes

**Thesis Availability** (`full_text_status`):
- `public` — Public (worldwide access)
- `restricted` — Restricted to Caltech community only
- `mixed` — Mixed availability, specified at file level
- `withheld` — Withheld

**Publication Status** (`ispublished`):
- `pub` — Published
- `inpress` — In Press
- `submitted` — Submitted
- `unpub` — Unpublished

**Date Type** (`date_type`):
- `published` — Publication
- `submitted` — Submission for publication
- `completed` — Completion
- `degree` — Degree Awarded

**Thesis Type** (`thesis_type`):
- `phd` — Dissertation (Ph.D.)
- `masters` — Master's thesis
- `engd` — Engineer's thesis
- `bachelors` — Bachelor's thesis
- `senior_minor` — Senior thesis (Minor)
- `senior_major` — Senior thesis (Major)
- `other` — Other

### Multi-select `<select multiple>` (drawn from corpus)

**Division** (`divisions`) — 8 values, fixed vocabulary:

| Code | Label |
|---|---|
| `div_biol` | Biology |
| `div_bbe` | Biology and Biological Engineering |
| `div_chem` | Chemistry and Chemical Engineering |
| `div_eng` | Engineering and Applied Science |
| `div_gps` | Geological and Planetary Sciences |
| `div_hss` | Humanities and Social Sciences |
| `div_int` | Interdisciplinary Programs |
| `div_pma` | Physics, Mathematics and Astronomy |

**Major Option** (`option_major`) and **Minor Option** (`option_minor`) — large
vocabulary (~60+ codes). Both lists are drawn from distinct values in the
`caltechthesis.ds` corpus at page load, covering active and historical options.
Display labels come from a hardcoded code→label map in TypeScript; any
unrecognised legacy code falls back to showing the code itself.

### Global controls

- **Satisfyall** — "all of these conditions" (AND) / "any of these conditions" (OR) across all active fields
- **Order** — by title / by year oldest / by year most recent (default) / by author name

## MySQL Schema (confirmed tables)

| Table | Harvested | Notes |
|---|---|---|
| `eprint` | Yes | Main record; see field list below |
| `eprint_creators_name` | Yes | Student/author names |
| `eprint_creators_id` | Yes | Author EPrints IDs |
| `eprint_creators_orcid` | Yes | Author ORCIDs |
| `eprint_creators_email` | **No — FERPA** | |
| `eprint_creators_show_email` | **No — FERPA** | |
| `eprint_thesis_advisor_name` | Yes | |
| `eprint_thesis_advisor_id` | Yes | |
| `eprint_thesis_advisor_orcid` | Yes | |
| `eprint_thesis_advisor_role` | Yes | |
| `eprint_thesis_advisor_email` | **No — FERPA** | |
| `eprint_thesis_committee_name` | Yes | |
| `eprint_thesis_committee_id` | Yes | |
| `eprint_thesis_committee_orcid` | Yes | |
| `eprint_thesis_committee_role` | Yes | |
| `eprint_thesis_committee_email` | **No — FERPA** | |
| `eprint_divisions` | Yes | |
| `eprint_option_major` | Yes | |
| `eprint_option_minor` | Yes | |
| `eprint_subjects` | Yes | |
| `eprint_local_group` | Yes | |
| `eprint_alt_title` | Yes | |
| `eprint_funders_agency` | Yes | |
| `eprint_funders_grant_number` | Yes | |
| `eprint_other_numbering_system_id` | Yes | |
| `eprint_other_numbering_system_name` | Yes | |
| `eprint__index` / `_grep` / `_rindex` | **No** | Broken EPrints FTS index |
| `user` | Yes (partial) | JOIN for depositor username + name only; `user.email` excluded |

Fields harvested from the `eprint` table: `eprintid`, `title`, `abstract`,
`date`, `datestamp`, `date_type`, `thesis_degree`, `thesis_type`,
`thesis_defense_date`, `eprint_status`, `metadata_visibility`,
`full_text_status`, `review_status`, `ispublished`, `keywords`, `official_url`,
`id_number`, `doi`, `reviewer`, `lastmod`.

## MySQL Harvest Query

MySQL 8 JSON functions aggregate multi-valued fields via subquery
`JSON_ARRAYAGG`. Six pre-computed index fields (all FERPA-safe, no email)
enable single-`?`-parameter SQLite3 LIKE searches without middleware changes.

```sql
SELECT JSON_OBJECT(
  'key', CONCAT('caltechthesis-', e.eprintid),
  'object', JSON_OBJECT(
    -- Core fields from eprint table
    'eprintid',            e.eprintid,
    'title',               COALESCE(e.title, ''),
    'abstract',            COALESCE(e.abstract, ''),
    'date',                e.date,
    'datestamp',           DATE(e.datestamp),
    'date_type',           COALESCE(e.date_type, ''),
    'thesis_degree',       COALESCE(e.thesis_degree, ''),
    'thesis_type',         COALESCE(e.thesis_type, ''),
    'thesis_defense_date', COALESCE(e.thesis_defense_date, ''),
    'eprint_status',       e.eprint_status,
    'metadata_visibility', e.metadata_visibility,
    'full_text_status',    COALESCE(e.full_text_status, ''),
    'review_status',       COALESCE(e.review_status, ''),
    'ispublished',         COALESCE(e.ispublished, ''),
    'keywords',            COALESCE(e.keywords, ''),
    'official_url',        COALESCE(e.official_url, ''),
    'id_number',           COALESCE(e.id_number, ''),
    'doi',                 COALESCE(e.doi, ''),
    'reviewer',            COALESCE(e.reviewer, ''),
    'lastmod',             e.lastmod,
    'link',                CONCAT('https://thesis.library.caltech.edu/', e.eprintid),

    -- Depositor (staff-facing; no email; FERPA-safe for staff use)
    'depositor_username',  COALESCE(u.username, ''),
    'depositor_name',      COALESCE(CONCAT(u.name_family, ', ', u.name_given), ''),

    -- Creators (no email)
    'creators', (
      SELECT JSON_ARRAYAGG(JSON_OBJECT(
        'family', cn.family,
        'given',  cn.given,
        'id',     COALESCE(ci.id, ''),
        'orcid',  COALESCE(co.orcid, '')
      ) ORDER BY cn.pos)
      FROM eprint_creators_name cn
      LEFT JOIN eprint_creators_id    ci ON cn.eprintid = ci.eprintid AND cn.pos = ci.pos
      LEFT JOIN eprint_creators_orcid co ON cn.eprintid = co.eprintid AND cn.pos = co.pos
      WHERE cn.eprintid = e.eprintid
    ),

    -- Advisors (no email)
    'thesis_advisor', (
      SELECT JSON_ARRAYAGG(JSON_OBJECT(
        'family', an.family,
        'given',  an.given,
        'id',     COALESCE(ai.id, ''),
        'orcid',  COALESCE(ao.orcid, ''),
        'role',   COALESCE(ar.role, '')
      ) ORDER BY an.pos)
      FROM eprint_thesis_advisor_name an
      LEFT JOIN eprint_thesis_advisor_id    ai ON an.eprintid = ai.eprintid AND an.pos = ai.pos
      LEFT JOIN eprint_thesis_advisor_orcid ao ON an.eprintid = ao.eprintid AND an.pos = ao.pos
      LEFT JOIN eprint_thesis_advisor_role  ar ON an.eprintid = ar.eprintid AND an.pos = ar.pos
      WHERE an.eprintid = e.eprintid
    ),

    -- Committee (no email)
    'thesis_committee', (
      SELECT JSON_ARRAYAGG(JSON_OBJECT(
        'family', tc.family,
        'given',  tc.given,
        'id',     COALESCE(ti.id, ''),
        'orcid',  COALESCE(to2.orcid, ''),
        'role',   COALESCE(tr.role, '')
      ) ORDER BY tc.pos)
      FROM eprint_thesis_committee_name tc
      LEFT JOIN eprint_thesis_committee_id    ti  ON tc.eprintid = ti.eprintid  AND tc.pos = ti.pos
      LEFT JOIN eprint_thesis_committee_orcid to2 ON tc.eprintid = to2.eprintid AND tc.pos = to2.pos
      LEFT JOIN eprint_thesis_committee_role  tr  ON tc.eprintid = tr.eprintid  AND tc.pos = tr.pos
      WHERE tc.eprintid = e.eprintid
    ),

    -- Multi-valued classification fields
    'divisions', (
      SELECT JSON_ARRAYAGG(d.divisions ORDER BY d.pos)
      FROM eprint_divisions d WHERE d.eprintid = e.eprintid
    ),
    'option_major', (
      SELECT JSON_ARRAYAGG(om.option_major ORDER BY om.pos)
      FROM eprint_option_major om WHERE om.eprintid = e.eprintid
    ),
    'option_minor', (
      SELECT JSON_ARRAYAGG(omi.option_minor ORDER BY omi.pos)
      FROM eprint_option_minor omi WHERE omi.eprintid = e.eprintid
    ),
    'subjects', (
      SELECT JSON_ARRAYAGG(s.subjects ORDER BY s.pos)
      FROM eprint_subjects s WHERE s.eprintid = e.eprintid
    ),
    'local_group', (
      SELECT JSON_ARRAYAGG(lg.local_group ORDER BY lg.pos)
      FROM eprint_local_group lg WHERE lg.eprintid = e.eprintid
    ),
    'alt_title', (
      SELECT JSON_ARRAYAGG(at2.alt_title ORDER BY at2.pos)
      FROM eprint_alt_title at2 WHERE at2.eprintid = e.eprintid
    ),

    -- Funders as structured array
    'funders', (
      SELECT JSON_ARRAYAGG(JSON_OBJECT(
        'agency',        COALESCE(fa.agency, ''),
        'grant_number',  COALESCE(fg.grant_number, '')
      ) ORDER BY fa.pos)
      FROM eprint_funders_agency fa
      LEFT JOIN eprint_funders_grant_number fg ON fa.eprintid = fg.eprintid AND fa.pos = fg.pos
      WHERE fa.eprintid = e.eprintid
    ),

    -- Other numbering systems (ProQuest ID, etc.)
    'other_ids', (
      SELECT JSON_ARRAYAGG(JSON_OBJECT(
        'name', COALESCE(osn.name, ''),
        'id',   COALESCE(osi.id, '')
      ) ORDER BY osn.pos)
      FROM eprint_other_numbering_system_name osn
      LEFT JOIN eprint_other_numbering_system_id osi ON osn.eprintid = osi.eprintid AND osn.pos = osi.pos
      WHERE osn.eprintid = e.eprintid
    ),

    -- Pre-computed search index fields (single-param LIKE; no email; FERPA-safe)
    'fulltext_idx', TRIM(CONCAT_WS(' ',
      COALESCE(e.title, ''),
      COALESCE(e.abstract, ''),
      COALESCE(e.keywords, ''),
      COALESCE((SELECT GROUP_CONCAT(at2.alt_title SEPARATOR ' ')
                FROM eprint_alt_title at2 WHERE at2.eprintid = e.eprintid), '')
    )),
    'creator_names_idx', COALESCE((
      SELECT GROUP_CONCAT(CONCAT(cn.family, ', ', cn.given) SEPARATOR '; ')
      FROM eprint_creators_name cn WHERE cn.eprintid = e.eprintid
    ), ''),
    'creator_orcid_idx', COALESCE((
      SELECT GROUP_CONCAT(co.orcid SEPARATOR '; ')
      FROM eprint_creators_orcid co WHERE co.eprintid = e.eprintid
    ), ''),
    'advisor_names_idx', COALESCE((
      SELECT GROUP_CONCAT(CONCAT(an.family, ', ', an.given) SEPARATOR '; ')
      FROM eprint_thesis_advisor_name an WHERE an.eprintid = e.eprintid
    ), ''),
    'committee_names_idx', COALESCE((
      SELECT GROUP_CONCAT(CONCAT(tc.family, ', ', tc.given) SEPARATOR '; ')
      FROM eprint_thesis_committee_name tc WHERE tc.eprintid = e.eprintid
    ), ''),
    'funders_idx', COALESCE((
      SELECT GROUP_CONCAT(CONCAT_WS(' ',
        COALESCE(fa.agency, ''), COALESCE(fg.grant_number, '')) SEPARATOR '; ')
      FROM eprint_funders_agency fa
      LEFT JOIN eprint_funders_grant_number fg ON fa.eprintid = fg.eprintid AND fa.pos = fg.pos
      WHERE fa.eprintid = e.eprintid
    ), '')
  )
) AS obj
FROM eprint e
LEFT JOIN user u ON e.userid = u.userid
-- No eprint_status filter: staff see all records including inbox, buffer, deletion
-- Incremental variant appends: AND e.lastmod > '{saved_timestamp}'
ORDER BY e.eprintid;
```

Output is piped through `mysql --batch --raw --silent`. The `--raw` flag
is essential: without it, MySQL batch mode applies its own backslash-escaping
on top of JSON_OBJECT's JSON encoding. JSON_OBJECT correctly encodes `"` as
`\"`, but batch mode then escapes that `\` to `\\`, producing `\\"` which
terminates the JSON string prematurely. `--raw` prevents this double-escaping.

## Harvest Scripts

### `remote_harvest_caltechthesis_full.bash`

Full harvest — nightly cron and initial setup.

1. Read `THESIS_HOST`, `THESIS_DBNAME`, `THESIS_DBUSER` from env file
2. Write MySQL query (no date filter) to a temp file, scp to remote host
3. SSH: `mysql --batch --silent ${THESIS_DBNAME} < query.sql > harvest.jsonl`
4. scp `harvest.jsonl` back to COLD host
5. `dsquery caltechthesis.ds "DELETE FROM caltechthesis"`
6. `dataset load -overwrite caltechthesis.ds < harvest.jsonl`
7. Write current UTC timestamp to `caltechthesis_lastmod.txt`

### `remote_harvest_caltechthesis_incremental.bash`

Incremental harvest — every 15 minutes during working hours.

1. Read env file; read saved timestamp from `caltechthesis_lastmod.txt`
   (falls back to full harvest script if state file is missing)
2. Append `AND e.lastmod > '{saved_timestamp}'` to the WHERE clause
3. SSH + mysql, scp JSONL back
4. If JSONL is non-empty: `dataset load -overwrite caltechthesis.ds < harvest.jsonl`
   (upsert — does not delete unchanged records)
5. Write new timestamp to `caltechthesis_lastmod.txt`

### Env file (`caltechthesis.env`)

```
THESIS_HOST=eprints.library.caltech.edu
THESIS_DBNAME=caltechthesis
THESIS_DBUSER=<read-only MySQL user>
```

## `cold_api.yaml` Additions

### Multi-select ANY-of trick

Several search fields accept multiple values (divisions, options, status
checkboxes). The datasetd prepared-statement API takes a single `?` parameter.
The TypeScript UI joins selected values as a comma-separated string and the SQL
uses SQLite3's `instr()` to test membership:

```sql
WHERE instr(',' || ? || ',', ',' || value || ',') > 0
```

This works because wrapping both sides with commas makes partial matches
impossible (e.g. `div_eng` cannot match inside `div_engineering`).

For checkbox fields stored as scalar strings on the main record (not arrays),
the same trick applies against a synthetic comma-wrapped value:

```sql
WHERE instr(',' || ? || ',', ',' || src->>'eprint_status' || ',') > 0
```

### Vocabulary fetch queries

These populate the `<select multiple>` dropdowns from the actual corpus. They
return a column of distinct strings consumed by `clientAPI.getStringList`.

```sql
-- get_distinct_divisions
SELECT DISTINCT value
FROM caltechthesis JOIN json_each(caltechthesis.src, '$.divisions')
WHERE value IS NOT NULL AND value != ''
ORDER BY value

-- get_distinct_option_major
SELECT DISTINCT value
FROM caltechthesis JOIN json_each(caltechthesis.src, '$.option_major')
WHERE value IS NOT NULL AND value != ''
ORDER BY value

-- get_distinct_option_minor
SELECT DISTINCT value
FROM caltechthesis JOIN json_each(caltechthesis.src, '$.option_minor')
WHERE value IS NOT NULL AND value != ''
ORDER BY value
```

### Full query block for `cold_api.yaml`

```yaml
  - dataset: caltechthesis.ds
    query:

      # --- Vocabulary fetch (populate select dropdowns) ---

      get_distinct_divisions: |
        SELECT DISTINCT value
        FROM caltechthesis JOIN json_each(caltechthesis.src, '$.divisions')
        WHERE value IS NOT NULL AND value != ''
        ORDER BY value

      get_distinct_option_major: |
        SELECT DISTINCT value
        FROM caltechthesis JOIN json_each(caltechthesis.src, '$.option_major')
        WHERE value IS NOT NULL AND value != ''
        ORDER BY value

      get_distinct_option_minor: |
        SELECT DISTINCT value
        FROM caltechthesis JOIN json_each(caltechthesis.src, '$.option_minor')
        WHERE value IS NOT NULL AND value != ''
        ORDER BY value

      # --- Text LIKE searches (wildcard * → %) ---

      by_text: |
        SELECT src FROM caltechthesis
        WHERE src->>'fulltext_idx' LIKE ?
        ORDER BY src->>'date' DESC

      by_title: |
        SELECT src FROM caltechthesis
        WHERE src->>'title' LIKE ?
        ORDER BY src->>'date' DESC

      by_alt_title: |
        SELECT src FROM caltechthesis
        WHERE EXISTS (
          SELECT 1 FROM json_each(src, '$.alt_title') WHERE value LIKE ?
        )
        ORDER BY src->>'date' DESC

      by_abstract: |
        SELECT src FROM caltechthesis
        WHERE src->>'abstract' LIKE ?
        ORDER BY src->>'date' DESC

      by_author: |
        SELECT src FROM caltechthesis
        WHERE src->>'creator_names_idx' LIKE ?
        ORDER BY src->>'date' DESC

      by_orcid: |
        SELECT src FROM caltechthesis
        WHERE src->>'creator_orcid_idx' LIKE ?
        ORDER BY src->>'date' DESC

      by_advisor: |
        SELECT src FROM caltechthesis
        WHERE src->>'advisor_names_idx' LIKE ?
        ORDER BY src->>'date' DESC

      by_committee: |
        SELECT src FROM caltechthesis
        WHERE src->>'committee_names_idx' LIKE ?
        ORDER BY src->>'date' DESC

      by_eprintid: |
        SELECT src FROM caltechthesis
        WHERE src->>'eprintid' = ?

      by_doi: |
        SELECT src FROM caltechthesis
        WHERE src->>'doi' LIKE ?
        ORDER BY src->>'date' DESC

      by_reviewer: |
        SELECT src FROM caltechthesis
        WHERE src->>'reviewer' LIKE ?
        ORDER BY src->>'lastmod' DESC

      by_depositor: |
        SELECT src FROM caltechthesis
        WHERE src->>'depositor_username' LIKE ?
           OR src->>'depositor_name' LIKE ?
        ORDER BY src->>'date' DESC

      by_funder: |
        SELECT src FROM caltechthesis
        WHERE src->>'funders_idx' LIKE ?
        ORDER BY src->>'date' DESC

      by_local_group: |
        SELECT src FROM caltechthesis
        WHERE EXISTS (
          SELECT 1 FROM json_each(src, '$.local_group') WHERE value LIKE ?
        )
        ORDER BY src->>'date' DESC

      by_other_id: |
        SELECT src FROM caltechthesis
        WHERE EXISTS (
          SELECT 1 FROM json_each(src, '$.other_ids')
          WHERE json_extract(value, '$.id') LIKE ?
             OR json_extract(value, '$.name') LIKE ?
        )
        ORDER BY src->>'date' DESC

      # --- Year / date searches ---

      by_year: |
        SELECT src FROM caltechthesis
        WHERE CAST(src->>'date' AS INTEGER) = CAST(? AS INTEGER)
        ORDER BY src->>'creator_names_idx'

      by_year_from: |
        SELECT src FROM caltechthesis
        WHERE CAST(src->>'date' AS INTEGER) >= CAST(? AS INTEGER)
        ORDER BY src->>'date' DESC

      by_year_to: |
        SELECT src FROM caltechthesis
        WHERE CAST(src->>'date' AS INTEGER) <= CAST(? AS INTEGER)
        ORDER BY src->>'date' DESC

      by_year_range: |
        SELECT src FROM caltechthesis
        WHERE CAST(src->>'date' AS INTEGER) >= CAST(? AS INTEGER)
          AND CAST(src->>'date' AS INTEGER) <= CAST(? AS INTEGER)
        ORDER BY src->>'date' DESC

      # --- Multi-value ANY-of searches (comma-separated param, instr trick) ---

      by_eprint_status: |
        SELECT src FROM caltechthesis
        WHERE instr(',' || ? || ',', ',' || src->>'eprint_status' || ',') > 0
        ORDER BY src->>'lastmod' DESC

      by_review_status: |
        SELECT src FROM caltechthesis
        WHERE instr(',' || ? || ',', ',' || src->>'review_status' || ',') > 0
        ORDER BY src->>'lastmod' DESC

      by_full_text_status: |
        SELECT src FROM caltechthesis
        WHERE instr(',' || ? || ',', ',' || src->>'full_text_status' || ',') > 0
        ORDER BY src->>'date' DESC

      by_ispublished: |
        SELECT src FROM caltechthesis
        WHERE instr(',' || ? || ',', ',' || src->>'ispublished' || ',') > 0
        ORDER BY src->>'date' DESC

      by_date_type: |
        SELECT src FROM caltechthesis
        WHERE instr(',' || ? || ',', ',' || src->>'date_type' || ',') > 0
        ORDER BY src->>'date' DESC

      by_thesis_type: |
        SELECT src FROM caltechthesis
        WHERE instr(',' || ? || ',', ',' || src->>'thesis_type' || ',') > 0
        ORDER BY src->>'date' DESC

      by_division: |
        SELECT src FROM caltechthesis
        WHERE EXISTS (
          SELECT 1 FROM json_each(src, '$.divisions')
          WHERE instr(',' || ? || ',', ',' || value || ',') > 0
        )
        ORDER BY src->>'date' DESC

      by_option_major: |
        SELECT src FROM caltechthesis
        WHERE EXISTS (
          SELECT 1 FROM json_each(src, '$.option_major')
          WHERE instr(',' || ? || ',', ',' || value || ',') > 0
        )
        ORDER BY src->>'date' DESC

      by_option_minor: |
        SELECT src FROM caltechthesis
        WHERE EXISTS (
          SELECT 1 FROM json_each(src, '$.option_minor')
          WHERE instr(',' || ? || ',', ',' || value || ',') > 0
        )
        ORDER BY src->>'date' DESC

    keys: true
    read: true
    create: true
    update: true
```

Note: `by_depositor` and `by_other_id` require two `?` parameters each. The
TypeScript UI passes the same value twice as `q[]=value&q[]=value` in the
request, or the middleware can be extended to pass `q` twice when the query
name is in a known two-param list. Alternatively, add two pre-computed index
fields (`depositor_idx`, `other_id_idx`) to the harvest and use single-param
queries — simpler and consistent with the rest.

## Browser UI (`thesis_search.ts`)

Class `ThesisSearchUI` follows the same pattern as `RdmReviewQueueUI` but
uses a different form layout to reflect the richer field set.

### Form layout

```
[ Search ] [ Reset ]

── Text search ─────────────────────────────────────────────
Full text (title/abstract/keywords):  [___________] [*]
Title:                                [___________]
Alternate title:                      [___________]
Authors:                              [___________]
ORCID:                                [___________]
Abstract:                             [___________]
Advisor name:                         [___________]
Committee member name:                [___________]
Item ID:                              [_______]
DOI:                                  [___________]
Reviewer:                             [___________]
Depositor username:                   [___________]
Depositor name:                       [___________]
Funding agency:                       [___________]
Grant number:                         [___________]
Group:                                [___________]
Other ID (scheme or value):           [___________]

── Date / year ─────────────────────────────────────────────
Degree year from: [____]  to: [____]

── Classification ──────────────────────────────────────────
Division:      [<select multiple, drawn from corpus>]
               ○ Any of these  ○ All of these

Major option:  [<select multiple, drawn from corpus>]
               ○ Any of these  ○ All of these

Minor option:  [<select multiple, drawn from corpus>]
               ○ Any of these  ○ All of these

── Status checkboxes ───────────────────────────────────────
Item status:   □ User Workarea  □ Under Review  ☑ Live Archive  □ Retired
Review status: □ Being reviewed  □ Waiting for corrections  □ Sent to Grad Office
               □ Pending in GO  □ Not Approved  □ Approved  □ WITHHELD  □ Other
Availability:  □ Public  □ Caltech only  □ Mixed  □ Withheld
Pub status:    □ Published  □ In Press  □ Submitted  □ Unpublished
Thesis type:   □ Ph.D.  □ Master's  □ Engineer's  □ Bachelor's
               □ Senior (Minor)  □ Senior (Major)  □ Other

── Combine results ─────────────────────────────────────────
Retrieved records must fulfil: ○ All of these conditions  ○ Any of these conditions

Order: [by year (most recent first) ▼]

[ Search ] [ Reset ]
```

### Multi-select population

On load, `ThesisSearchUI` fetches three vocabulary lists in parallel:

```typescript
const [divisions, optionsMajor, optionsMinor] = await Promise.all([
  clientAPI.getStringList("caltechthesis.ds", "get_distinct_divisions"),
  clientAPI.getStringList("caltechthesis.ds", "get_distinct_option_major"),
  clientAPI.getStringList("caltechthesis.ds", "get_distinct_option_minor"),
]);
```

Each list of codes is rendered into the corresponding `<select multiple>`
with display labels from a hardcoded code→label map in TypeScript. Codes not
in the map render as the code itself (handles legacy options).

### Query execution strategy

Because users can fill in multiple fields simultaneously, the UI runs one
query per non-empty field, then combines results:

1. Collect all active field values after the user submits
2. Run each active query in parallel via `Promise.all`
3. Combine result sets:
   - **AND mode** (default): intersect by `eprintid`
   - **OR mode**: union by `eprintid` (deduplicated)
4. Apply client-side sort per the Order dropdown
5. Render the results table

For multi-select fields, the selected values are joined as a comma-separated
string and passed as `q`. The instr()-based SQL handles the ANY-of matching.
An "All of these" radio on divisions/options is handled client-side by
filtering the ANY results to records that contain every selected value.

### Results table columns

Thesis ID (link to thesis.library.caltech.edu/{id}), Title, Author(s),
Advisor(s), Degree, Year, Division(s), Major Option(s), Thesis Type,
Item Status, Review Status, Availability, Deposited, Reviewer

Records where `eprint_status != 'archive'` or `metadata_visibility != 'show'`
display a bracketed label (`[inbox]`, `[restricted]`, etc.) in the status
column as a visual reminder that the record is not public.

### CSV download

Same `csvToDownloadElements` pattern as the RDM tool. All result columns
are included.

## HTML Page (`htdocs/thesis_search.md`)

```markdown
---
title: Search CaltechTHESIS
---

# Search CaltechTHESIS

<div id="search">Loading search form...</div>

<noscript>JavaScript required for search to be available</noscript>

<script type="module">
  import { ThesisSearchUI } from "./modules/thesis_search.js";
  const baseUrl = URL.parse(window.location.href);
  baseUrl.pathname = baseUrl.pathname.replace(/thesis_search.html$/g, '');
  baseUrl.search = "";
  window.addEventListener('DOMContentLoaded', () => {
    new ThesisSearchUI({
      baseUrl: baseUrl,
      searchElement: document.getElementById("search")
    });
  });
</script>
```

Rendered via `pandoc thesis_search.md -o htdocs/thesis_search.html`.

## Build Wiring

Add to `deno.json` task list:
```json
"build:thesis_search": "deno bundle thesis_search.ts htdocs/modules/thesis_search.js"
```
Include in the main `build` task.

## Cron Schedule

On the COLD host:
```cron
# Incremental: every 15 min, Mon–Fri, 7am–7pm
*/15 7-19 * * 1-5  /path/to/cold/remote_harvest_caltechthesis_incremental.bash caltechthesis.env

# Full refresh: nightly at 2am (catches deletions, status changes, schema drift)
0 2 * * *           /path/to/cold/remote_harvest_caltechthesis_full.bash caltechthesis.env
```

## Implementation Order

1. **Verify column names on `eprint` table** — `DESCRIBE eprint` on the server
   to confirm `doi`, `reviewer`, `review_status`, `ispublished`, `date_type`,
   `thesis_defense_date` exist before writing scripts
2. **Confirm `user` table JOIN** — verify `user.username`, `user.name_family`,
   `user.name_given` column names; confirm no email is selected
3. **Test the MySQL query** — run against `caltechthesis` on the server, check
   JSON shape and `lastmod` ordering
4. **Write and test both harvest scripts** — test full, then incremental
5. **Add `cold_api.yaml` block** — restart `cold_api`, verify each query with
   `curl`, including the three vocabulary-fetch queries
6. **Implement `thesis_search.ts`** — start with vocabulary population and the
   single-field text searches; add multi-select and combination logic second
7. **Transpile, test in browser** — verify vocabulary selects populate, text
   searches return results, status flags display correctly
8. **Render HTML page** — add to COLD navigation
9. **Set up cron** — monitor first few incremental runs

## Open Items

- Confirm MySQL read-only user credentials
- Confirm exact column names on `eprint` table (step 1 above)
- Decide how to handle the two-param queries (`by_depositor`, `by_other_id`):
  either add pre-computed index fields (`depositor_idx`, `other_id_idx`) to
  the harvest (recommended — keeps all queries single-param) or extend the
  middleware to pass `q` twice for named queries
- Decide whether to add this tool to the COLD main navigation alongside the
  RDM review queue link
