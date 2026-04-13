# cold_api.yaml Deep Dive

`cold_api.yaml` is the configuration file for `datasetd`, the JSON API backend that COLD builds on. It is not read by any TypeScript code — it is consumed entirely by the `datasetd` binary. Everything the middleware and browser can access about stored objects is ultimately controlled by what this file declares.

Reference documentation for the `datasetd` configuration format:
- <https://caltechlibrary.github.io/dataset/datasetd.1.html>
- <https://caltechlibrary.github.io/dataset/datasetd_api.5.html>

---

## Top-level fields

```yaml
host: localhost:8112
collections:
  - ...
```

| Field | Purpose |
|---|---|
| `host` | The TCP address `datasetd` listens on. The middleware (`cold.ts`) defaults its `--apiUrl` to `http://localhost:8112`. They must match. |
| `collections` | List of dataset collection configurations. Each entry exposes one `.ds` directory as a REST resource. |

---

## Collection block structure

Each item under `collections` has this shape:

```yaml
- dataset: <name>.ds
  query:
    <query_name>: |
      <SQL>
  keys: true|false
  create: true|false
  read: true|false
  update: true|false
  versions: true|false
```

### dataset

The path to the dataset collection directory, relative to the working directory where `datasetd` is started. The collection name (without `.ds`) becomes the first segment of every URL path for that collection: `/api/<name>/...`.

### query

A map of named SQL queries. Each query is a SQLite statement that operates on the collection's internal `src` column, which holds the JSON object for each record. Results are returned as a JSON array.

Named queries are exposed at:

```
GET /api/<collection_name>/_query/<query_name>
```

Parameterized queries use `?` placeholders. Parameters are passed as a JSON body or as query-string key-value pairs, depending on how the caller constructs the request. The middleware's `browser_api.ts` builds query-string calls; internal TypeScript handlers use the `Dataset` client from `deps.ts`.

### CRUD permissions

| Field | HTTP method enabled | datasetd endpoint |
|---|---|---|
| `keys: true` | GET | `/api/<name>/keys` |
| `create: true` | POST | `/api/<name>/` |
| `read: true` | GET | `/api/<name>/<key>` |
| `update: true` | PUT | `/api/<name>/<key>` |

There is no `delete` permission declared in COLD's configuration. Records are never deleted through the API — they are either versioned or left in place.

### versions

When `versions: true`, `datasetd` keeps previous copies of each object whenever it is updated. This is COLD's audit trail. All collections enable versioning.

---

## Collections reference

### people.ds

Stores person objects. Each object is keyed by `clpid` (Caltech Library People ID).

**Named queries:**

| Query | Parameters | Returns | Used by |
|---|---|---|---|
| `people_vocabulary` | none | List of objects shaped for the authors vocabulary: `clpid`, `family_name`, `given_name`, `identifiers` (ORCID if present), `affiliations` (Caltech ROR if present) | `people_vocabulary.ts`, `run_people_vocabulary.bash` |
| `people_names` | none | Compact list: `clpid`, `family_name`, `given_name`, `orcid`, `thesis_id`, `directory_id` | `client_api.ts getPeopleList()` |
| `missing_bios` | none | People with a `directory_user_id` but an empty `bio` field | Administrative/debugging |
| `directory_people` | none | People with a `directory_user_id` (i.e., current Caltech directory members) | `directory_sync.ts` |
| `people_csv` | none | Full people export for the CSV report | `run_people_csv.bash` (via `cold_reports`) |
| `division_people` | none | Per-person `division`, `clpid`, `orcid`, `family_name`, `given_name` | `run_division_people.bash` |
| `people_membership` | none | Flattened list: one row per person-per-group membership | `run_people_membership.bash` |
| `get_all_clpid` | none | Ordered list of all `clpid` strings (for autocomplete) | Browser UI |
| `validate_clpid` | `?` (clpid value) | Single-element list `{clpid}` if found, empty if not | Input validation |
| `lookup_clgid` | `?` (clgid value) | People who belong to the group with that `clgid` | `client_api.ts lookupGroupMembership()`, `browser_api.ts` |

**Notes on `people_vocabulary`:**
The query uses a `CASE` expression to include an ORCID identifier only when `length(src->>'orcid') > 1`, which guards against empty strings. Caltech affiliation is included only when the `ror` field equals the Caltech ROR (`https://ror.org/05dxps055`). These business rules live in the SQL, not in TypeScript.

**Notes on `lookup_clgid`:**
This query uses a correlated subquery against `json_each(src, '$.groups')` to find all people whose `groups` array contains the requested `clgid`. The `?` placeholder is bound by the caller.

---

### groups.ds

Stores group objects. Each object is keyed by `clgid` (Caltech Library Group ID).

**Named queries:**

| Query | Parameters | Returns | Used by |
|---|---|---|---|
| `group_vocabulary` | none | List of `{clgid, group_name}` sorted by name | `group_vocabulary.ts`, `run_group_vocabulary.bash` |
| `group_names` | none | Same shape as `group_vocabulary` (duplicate, retained for compatibility) | `client_api.ts getGroupsList()` |
| `lookup_name` | `?` (name pattern) | Groups whose `name` or any `alternative` name matches the LIKE pattern | `client_api.ts lookupGroupName()` |
| `lookup_name_or_clgid` | `?`, `?`, `?` (name, clgid, alternative) | Groups matching any of: name, clgid, alternative names | `utils.ts lookupGroupInfo()` |
| `get_all_clgid` | none | Ordered list of all `clgid` strings (for autocomplete) | Browser UI |

**Notes on `lookup_name` and `lookup_name_or_clgid`:**
Both use `EXISTS(SELECT true FROM json_each(src->'alternative') WHERE ...)` to search inside the JSON array of alternative names. LIKE patterns (e.g., `%LIGO%`) are supplied by callers. `lookup_name_or_clgid` takes three `?` parameters that are all typically set to the same search string.

---

### funders.ds

Stores funder objects. Each object is keyed by `clfid` (Caltech Library Funder ID).

**Named queries:**

| Query | Parameters | Returns | Used by |
|---|---|---|---|
| `funder_names` | none | List of `{clfid, name, ror}` sorted by name | Funder autocomplete |

---

### subjects.ds

Stores subject classification objects. Each object is keyed by `clsid`.

**Named queries:**

| Query | Parameters | Returns | Used by |
|---|---|---|---|
| `subject_names` | none | List of `{clsid, name}` sorted by name | Subject autocomplete |

---

### thesis_options.ds

Stores thesis option objects (degree program options). Each object is keyed by `option_id`.

**Named queries:**

| Query | Parameters | Returns | Used by |
|---|---|---|---|
| `thesis_option_names` | none | List of `{option_id, name, division}` sorted by name | `thesis_option_vocabulary.ts`, thesis autocomplete |

---

### journals.ds

Stores journal metadata. Each object is keyed by ISSN.

**Named queries:**

| Query | Parameters | Returns | Used by |
|---|---|---|---|
| `journal_names` | none | List of `{issn, name}` sorted by name | `journal_vocabulary.ts`, journal autocomplete |

---

### doi_prefix.ds

Stores DOI prefix records. Each object is keyed by DOI prefix string.

**Named queries:**

| Query | Parameters | Returns | Used by |
|---|---|---|---|
| `doi_prefix_names` | none | List of `{doi_prefix, name}` sorted by name | DOI prefix autocomplete |

---

### reports.ds

This collection is the report request queue — the integration point between the middleware and the `cold_reports` service. Objects are keyed by a UUID v5 generated from the report request content plus a timestamp.

**Named queries:**

| Query | Parameters | Returns | Used by |
|---|---|---|---|
| `report_list` | none | All report requests ordered by `updated` descending (stack view) | `cold_reports.ts handleReportsList()` → renders the `/reports` page |
| `next_request` | none | Oldest report request with `status = 'requested'` (FIFO queue) | `cold_reports.ts servicing_requests()` |

**`report_list`** omits the `inputs` field — it is a summary view for display. **`next_request`** includes `inputs` so the runner has the parameter values needed to execute the command.

**Status lifecycle:**

```
"requested"  →  "processing"  →  "completed"
                             →  "error"
                             →  "aborting, unknown report"
```

The transition from `"requested"` to `"processing"` is written by `cold_reports` before executing the command; the final status is written after the command returns.

---

### ror.ds

Stores Research Organization Registry (ROR) records imported from a ROR data dump. Each object is keyed by the ROR identifier suffix (the part after `https://ror.org/`).

**Named queries:**

| Query | Parameters | Returns | Used by |
|---|---|---|---|
| `get_ror` | `?` (ror key) | Full ROR record for the key | `client_api.ts getROR()` |
| `lookup_by_name_or_acronym` | `?`, `?` (name pattern, acronym pattern) | List of `{ror, name, country, acronyms}` | `client_api.ts` |
| `lookup_by_name` | `?` (name pattern) | List of `{ror, name, country, acronyms}` | ROR name lookup |
| `lookup_by_acronym` | `?` (acronym pattern) | List of `{ror, name, country, acronyms}` | ROR acronym lookup |
| `clear_ror_data` | none | Deletes all ROR records (`DELETE FROM ror`) | `ror_import.ts` before re-import |

**Note:** `clear_ror_data` is a `DELETE` statement. In `datasetd` this is exposed as a query endpoint, not a DELETE HTTP method. The `ror_import.ts` tool calls it before loading a fresh ROR data dump.

---

### rdm_review_queue.ds

Stores records from the RDM (Research Data Management) submission review queue. Records are deposited here from the InvenioRDM system for curator review.

**Named queries:**

| Query | Parameters | Returns |
|---|---|---|
| `browse` | none | All records ordered by `updated` descending |
| `search` | `?` (text pattern) | Records where the JSON source matches the pattern |
| `by_name` | `?` (name pattern) | Records where any creator's `person_or_org.name` matches |
| `review_queue_by_name` | `?` (name pattern) | Same as `by_name` but filtered to `status = 'submitted'` |
| `by_clpid` | `?` (clpid) | Records where any creator has a `clpid` identifier matching the value |
| `review_queue_by_clpid` | `?` (clpid) | Same as `by_clpid` but filtered to `status = 'submitted'` |
| `by_orcid` | `?` (orcid) | Records where any creator has an `orcid` identifier matching the value |
| `review_queue_by_orcid` | `?` (orcid) | Same as `by_orcid` but filtered to `status = 'submitted'` |
| `by_clgid` | `?` (clgid) | Records where `custom_fields."caltech:groups"` contains the clgid |
| `review_queue_by_clgid` | `?` (clgid) | Same as `by_clgid` but filtered to `status = 'submitted'` |
| `review_queue_mentions` | `?` (text pattern) | Submitted records with comments containing the pattern |

These queries make heavy use of `json_each` to search inside nested JSON arrays (creators, identifiers, groups). The `JOIN` between two `json_each` calls in the `by_clpid`/`by_orcid` family is the pattern to follow when adding new identifier-based queries.

---

## How the middleware consumes cold_api.yaml

### browser_api.ts — the read-only browser API

`handleBrowserAPI` (called for `GET /api/...`) parses the URL path using `apiPathParse()`:

```
/api/<c_name>/<query_name>[?key=value&...]
```

It constructs a `DatasetApiClient` for the named collection and calls `.query(query_name, paramList, body)`. The result is returned as JSON to the browser. This is how browser-side TypeScript modules (`client_api.ts`, `validator.ts`, `collaborator_report.ts`) access named queries.

**Important:** `browser_api.ts` only handles `GET`. All browser queries are read-only. Mutation goes through the dedicated collection handlers (`people.ts`, `groups.ts`, etc.) which call `datasetd`'s CRUD endpoints directly, not through named queries.

### Collection handlers (people.ts, groups.ts, etc.)

Each collection has a handler module that uses the `Dataset` class from `deps.ts` to call `datasetd`'s CRUD endpoints:

- `ds.keys()` → `GET /api/<name>/keys`
- `ds.read(key)` → `GET /api/<name>/<key>`
- `ds.create(key, obj)` → `POST /api/<name>/`
- `ds.update(key, obj)` → `PUT /api/<name>/<key>`
- `ds.query(name, params, body)` → `GET /api/<name>/_query/<name>`

These are available only because the corresponding `keys`, `read`, `create`, `update` flags are set to `true` in `cold_api.yaml`.

---

## Debugging tips

**Query returns unexpected results:** Run the SQL directly against the SQLite database inside the `.ds` directory:

```bash
sqlite3 people.ds/collection.db "SELECT json_object(...) FROM people ..."
```

The `src` column holds the raw JSON. The table name is the collection name without `.ds`.

**`datasetd` rejects a request:** Check that the corresponding permission flag (`create`, `read`, `update`, `keys`) is set to `true` in `cold_api.yaml` for that collection.

**A new query is not accessible:** After editing `cold_api.yaml`, restart `datasetd`. It reads the file at startup only.

**Parameter mismatch:** If a query uses `?` placeholders, the caller must supply exactly the right number of parameters in the correct order. Mismatch causes a SQLite error that appears in the `datasetd` log.

**Port conflict:** If the middleware's `--apiUrl` does not match `cold_api.yaml`'s `host`, all API calls will fail with a connection error. Default is `localhost:8112` on both sides.

---

## Adding a new query

1. Edit `cold_api.yaml`. Under the relevant collection's `query:` block, add:

```yaml
my_new_query: |
  SELECT json_object('field', src->'field') AS src
  FROM <collection_name>
  WHERE src->>'some_field' = ?
  ORDER BY src->>'field'
```

2. Restart `datasetd`.

3. Test directly:

```bash
curl "http://localhost:8112/api/<collection_name>/_query/my_new_query" \
  -H "Content-Type: application/json" \
  -d '{"param": "value"}'
```

4. Call it from TypeScript via `browser_api.ts` at `GET /api/<collection_name>/my_new_query?q=value`, or from a server-side handler via `ds.query("my_new_query", ["param"], {param: "value"})`.

---

## Adding a new collection

1. Initialize the dataset collection:

```bash
dataset init newcollection.ds 'sqlite://collection.db'
```

2. Add a block to `cold_api.yaml`:

```yaml
- dataset: newcollection.ds
  query:
    list_all: |
      SELECT src FROM newcollection ORDER BY src->>'name'
  keys: true
  create: true
  read: true
  update: true
  versions: true
```

3. Restart `datasetd`.

4. Add a corresponding handler module (e.g., `newcollection.ts`) following the pattern in `people.ts` or `groups.ts`, and wire it into `cold.ts`'s `ColdReadWriteHandler`.
