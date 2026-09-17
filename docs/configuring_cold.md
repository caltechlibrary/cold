# Configuring COLD, An Overview

COLD is configured through two YAML files that each govern a distinct service:

| File | Service | Purpose |
|---|---|---|
| `cold_api.yaml` | `datasetd` | Declares the JSON API backend: dataset collections, SQL queries, and CRUD permissions |
| `cold_reports.yaml` | `cold_reports` | Declares the report catalogue: what reports exist, how to run them, and where output goes |

Understanding the relationship between these two files is essential for debugging production problems and for extending COLD with new capabilities.

---

## Architecture recap

COLD runs as three cooperating services:

```
Browser / Front-end web server (Apache2 + Shibboleth)
        |
        v
  cold  (Deno, port 8111)          <- cold.ts / bin/cold
        |
        +-- /api/...  ----------->  datasetd  (port 8112)   <- cold_api.yaml
        |
        +-- /reports  ----------->  cold_reports (Deno)      <- cold_reports.yaml
                                      |
                                      v
                               htdocs/rpt/<output files>
```

`cold` (the middleware) receives every browser request. It routes `/api/...` calls directly to `datasetd`, handles object management pages (`/people`, `/groups`, etc.) by talking to `datasetd` on behalf of the browser, and routes `/reports` to its own report-request handler. `cold_reports` is a separate long-running process that polls the report queue and executes report commands.

---

## cold_api.yaml — the data layer

`cold_api.yaml` is read exclusively by `datasetd`, launched as:

```
datasetd cold_api.yaml
```

or via the Deno task:

```
deno task cold_api
```

It tells `datasetd`:

- Which dataset collections to expose (e.g., `people.ds`, `groups.ds`)
- What named SQL queries are available on each collection
- What CRUD operations (create, read, update, keys) are permitted
- Whether object versioning is enabled

Every dataset collection declared here gets a base URL path of `/api/<collection_name>/`. Named queries become reachable at `/api/<collection_name>/_query/<query_name>`. The middleware (`cold.ts`) and the browser-facing API handler (`browser_api.ts`) consume this API.

The `reports.ds` collection is a key bridge between the two YAML files. It is declared in `cold_api.yaml` and carries the report request queue. Its `next_request` and `report_list` named queries are used by both the middleware (to list queued requests) and by `cold_reports` (to dequeue the next job to run).

---

## cold_reports.yaml — the report runner layer

`cold_reports.yaml` is read exclusively by the `cold_reports` service (compiled from `cold_reports.ts`), launched as:

```
bin/cold_reports cold_reports.yaml
```

or via the Deno task:

```
deno task cold_reports
```

It tells `cold_reports`:

- Where to write report output files (`report_directory`)
- What named reports exist in the system
- For each report: which shell command to execute, what to name the output file, what MIME type the output is, and what user-supplied inputs (if any) the command requires

When a user requests a report through the browser, the middleware writes a `Report` object to `reports.ds` (via `cold_api.yaml`'s API) with a `status` of `"requested"`. `cold_reports` polls `reports.ds` every ten seconds using the `next_request` query, finds pending jobs, looks up the matching entry in `cold_reports.yaml`, executes the associated shell command, writes the output to `report_directory`, and updates the `Report` object's `status` and `link` fields.

---

## How they connect: the reports.ds queue

`reports.ds` is the integration point between the two YAML files:

```
cold_api.yaml declares reports.ds
       |
       |  cold middleware writes report request objects to reports.ds
       |  cold middleware reads report_list from reports.ds (for the /reports page)
       |
cold_reports.yaml defines what commands are valid report names
       |
       |  cold_reports reads next_request from reports.ds (dequeue)
       |  cold_reports executes cmd defined in cold_reports.yaml
       |  cold_reports updates the report object in reports.ds with status + link
```

A report request object stored in `reports.ds` includes a `report_name` field. That name is the key used to look up the matching entry in `cold_reports.yaml`. If a `report_name` arrives in the queue that has no entry in `cold_reports.yaml`, the runner marks it `"aborting, unknown report"` and moves on. This means the two files must stay consistent: every report that a user can request from the browser must have a corresponding entry in `cold_reports.yaml`.

---

## Request flow for a report

1. User fills in the report request form in the browser and submits it (`POST /reports`).
2. `cold.ts` calls `handleReports` → `handleReportRequest`.
3. `handleReportRequest` instantiates a `Report` object, reads `cold_reports.yaml` to get the input definitions for the named report, merges any user-supplied input values, and writes the new `Report` object to `reports.ds` via `datasetd` with `status = "requested"`.
4. `cold_reports` polls `reports.ds` every 10 seconds. The `next_request` SQL query (defined in `cold_api.yaml`) returns the oldest pending request.
5. `cold_reports` looks up the `report_name` in its in-memory map built from `cold_reports.yaml`. It finds the `Runnable` (command, basename, inputs schema, content type).
6. The `Runnable.run()` method executes the shell command, writes output to `htdocs/rpt/<basename><ext>`, and returns the URL path.
7. `cold_reports` updates the `Report` object in `reports.ds` with `status = "completed"` and `link = "rpt/<filename>"`. If the report declared `emails`, a notification is sent.
8. The browser can refresh `/reports` to see the updated status and follow the link to download the file.

---

## Starting services in development

```bash
# Terminal 1 — start the JSON API backend
deno task cold_api

# Terminal 2 — start the middleware
deno task cold

# Terminal 3 — start the report runner
deno task cold_reports
```

In production, all three are compiled to native binaries (`deno task build`) and managed by a process supervisor. `datasetd` is controlled by `cold_api.yaml`; `bin/cold_reports` is invoked with the path to `cold_reports.yaml` as its first argument.

---

## Adding a new capability

| Goal | Files to change |
|---|---|
| Add a new SQL query to an existing collection | `cold_api.yaml` — add a named query under the collection |
| Add a new dataset collection | `cold_api.yaml` — add a collection block; run `dataset init <name>.ds` |
| Add a new report | `cold_reports.yaml` — add a report entry with `cmd`, `basename`, `content_type`; write the corresponding shell script |
| Expose a new query to the browser | `cold_api.yaml` (query) + `browser_api.ts` or `client_api.ts` if custom routing is needed |
| Change report output location | `cold_reports.yaml` `report_directory` field + update the hardcoded `basedir` in `cold_reports.ts:520` |

See [cold_api.yaml deep dive](cold_api_deep_dive.md) and [cold_reports.yaml deep dive](cold_reports_deep_dive.md) for field-level detail on each file.
