# cold_reports.yaml Deep Dive

`cold_reports.yaml` is the configuration file for the `cold_reports` service (compiled from `cold_reports.ts`). It defines the catalogue of reports that COLD can generate: what shell command to run, how to name the output file, what MIME type to declare, and what user-supplied parameters (if any) the command requires.

This file is read in two contexts:

1. **At startup** by the `cold_reports` service, which builds an in-memory map of `Runnable` objects — one per report entry.
2. **At request time** by the middleware's `handleReportRequest` function, which reads `cold_reports.yaml` directly to retrieve input definitions for the named report before creating the queue entry in `reports.ds`.

---

## Top-level fields

```yaml
report_directory: ./htdocs/rpt
reports:
  <report_name>:
    ...
```

| Field | Type | Purpose |
|---|---|---|
| `report_directory` | string | Directory where report output files are written. Currently `./htdocs/rpt`. The middleware also serves this path as static files, so a file at `htdocs/rpt/people.csv` is reachable at `/rpt/people.csv` in the browser. |
| `reports` | map | Each key is a report name. The value is a report definition block. |

**Note:** The `report_directory` value in `cold_reports.yaml` is not yet consumed by the `Runnable.run()` method — the output path `./htdocs/rpt` and the URL prefix `rpt` are currently hardcoded in `cold_reports.ts` at lines 520–522. The YAML field exists as a declaration of intent for a future fix.

---

## Report definition block

```yaml
<report_name>:
  cmd: ./run_something.bash
  basename: something
  append_datestamp: true|false
  content_type: text/csv
  inputs:            # optional
    - id: clpid
      type: text
      required: true
```

| Field | Type | Required | Purpose |
|---|---|---|---|
| `cmd` | string | yes | Path to the executable or script to run. Relative to the directory where `cold_reports` is started. |
| `basename` | string | yes | Base name for the output file, without extension. May contain `{{input_id}}` placeholders when `inputs` is defined. |
| `append_datestamp` | boolean | yes | If `true`, appends `_YYYY-MM-DD` to the output filename before the extension. Useful for archiving snapshots. |
| `content_type` | string | yes | MIME type of the output. Controls the file extension applied to the output. |
| `inputs` | list | no | Ordered list of user-supplied parameters. Each input is passed as a positional command-line argument to `cmd`. |

### content_type to file extension mapping

The `Runnable.run()` method in `cold_reports.ts` maps MIME types to extensions:

| content_type | Extension |
|---|---|
| `text/plain` | `.txt` |
| `text/csv` | `.csv` |
| `application/json` | `.json` |
| `text/markdown` | `.md` |
| `application/yaml` | `.yaml` |
| `application/vnd.ms-excel` | `.xlsx` |
| (anything else) | `` (no extension) |

### Input definition fields

| Field | Type | Purpose |
|---|---|---|
| `id` | string | The form field name and the command-line positional argument identifier. Also used as the `{{id}}` placeholder in `basename` templates. |
| `type` | string | HTML input type (e.g., `"text"`). Used by the browser form to render the input widget. |
| `required` | boolean | If `true`, the form enforces this field before submission. |

---

## Reports catalogue

### run_people_csv

```yaml
cmd: ./run_people_csv.bash
basename: people
append_datestamp: false
content_type: text/csv
```

Runs `run_people_csv.bash`, which calls `dsquery` with a SQL statement against `people.ds` and outputs a full CSV export of all people records. Output: `htdocs/rpt/people.csv`.

The SQL query used by `dsquery` in the bash script is a superset of the `people_csv` named query in `cold_api.yaml` — it includes additional fields like `snac`. When debugging column differences between the live API and the CSV export, compare the SQL in `run_people_csv.bash` against the `people_csv` query in `cold_api.yaml`.

---

### run_groups_csv

```yaml
cmd: ./run_groups_csv.bash
basename: groups
append_datestamp: false
content_type: text/csv
```

Exports all group records from `groups.ds` as CSV. Output: `htdocs/rpt/groups.csv`.

---

### run_division_people_csv

```yaml
cmd: ./run_division_people.bash
basename: division_people
append_datestamp: false
content_type: text/csv
```

Produces a CSV with columns `division`, `clpid`, `orcid`, `family_name`, `given_name`, plus one column per additional group membership. This uses the `division_people` named query in `cold_api.yaml`. Output: `htdocs/rpt/division_people.csv`.

---

### run_people_membership_csv

```yaml
cmd: ./run_people_membership.bash
basename: people_membership
append_datestamp: false
content_type: text/csv
```

Produces a flattened CSV with one row per person-per-group membership, using the `people_membership` named query. Output: `htdocs/rpt/people_membership.csv`.

---

### run_group_people_crosswalk_csv

```yaml
cmd: ./run_group_people_crosswalk.bash
basename: group_people_crosswalk
append_datestamp: false
content_type: text/csv
```

Produces a crosswalk CSV mapping groups to people. Output: `htdocs/rpt/group_people_crosswalk.csv`.

---

### run_division_people_crosswalk_csv

```yaml
cmd: ./run_division_people_crosswalk.bash
basename: division_people_crosswalk
append_datestamp: false
content_type: text/csv
```

Produces a crosswalk CSV mapping divisions to people. Output: `htdocs/rpt/division_people_crosswalk.csv`.

---

### run_people_identifier_csv

```yaml
cmd: ./run_people_identifier_csv.bash
basename: people_identifier
append_datestamp: true
content_type: text/csv
```

Exports people records focused on external identifiers (ORCID, ISNI, VIAF, etc.). `append_datestamp: true` means each run produces a dated file such as `htdocs/rpt/people_identifier_2026-04-09.csv`, preserving historical snapshots rather than overwriting.

---

### journal_vocabulary

```yaml
cmd: ./run_journal_vocabulary.bash
basename: journal_vocabulary
append_datestamp: false
content_type: application/yaml
```

Generates a YAML vocabulary file for journals by running `bin/journal_vocabulary`, which calls the `journal_names` query on `journals.ds`. Output: `htdocs/rpt/journal_vocabulary.yaml`.

---

### group_vocabulary

```yaml
cmd: ./run_group_vocabulary.bash
basename: group_vocabulary
append_datestamp: false
content_type: application/yaml
```

Generates a YAML vocabulary file for groups by running `bin/group_vocabulary`. The bash script can also be called with the argument `push_to_cold` to enqueue itself via `POST /reports` instead of running directly — a useful pattern for automated vocabulary refreshes. Output: `htdocs/rpt/group_vocabulary.yaml`.

---

### people_vocabulary

```yaml
cmd: ./run_people_vocabulary.bash
basename: people_vocabulary
append_datestamp: false
content_type: application/yaml
```

Generates a YAML vocabulary file for people, using the `people_vocabulary` named query in `cold_api.yaml`. That query shapes each record for use in the authors vocabulary (identifiers, affiliations). Output: `htdocs/rpt/people_vocabulary.yaml`.

---

### thesis_option_vocabulary

```yaml
cmd: ./run_thesis_option_vocabulary.bash
basename: thesis_option_vocabulary
append_datestamp: false
content_type: application/yaml
```

Generates a YAML vocabulary file for thesis options. Output: `htdocs/rpt/thesis_option_vocabulary.yaml`.

---

### run_authors_records_csv

```yaml
cmd: ./run_authors_records_csv.bash
basename: authors_records
append_datestamp: false
content_type: text/csv
```

Exports author records for integration with other Caltech Library systems. Output: `htdocs/rpt/authors_records.csv`.

---

### run_authors_review_queue_csv

```yaml
cmd: ./run_authors_review_queue_csv.bash
basename: authors_review_queue
append_datestamp: false
content_type: text/csv
```

Exports a CSV view of the RDM review queue for author reconciliation work. Output: `htdocs/rpt/authors_review_queue.csv`.

---

### run_collaborator_report

```yaml
cmd: ./run_collaborator_report.bash
inputs:
  - id: clpid
    type: text
    required: true
basename: "{{clpid}}_nsf_collaborator_report"
append_datestamp: false
content_type: text/csv
```

This is the only parameterized report. It generates an NSF collaborator table for a specific person, identified by their `clpid`.

**`inputs`:** A single required text field with `id: clpid`. The user supplies a `clpid` value in the browser form. That value is:

1. Stored in the `Report` object's `inputs` list in `reports.ds`
2. Passed as a positional command-line argument (`$1`) to `run_collaborator_report.bash`
3. Substituted into the `basename` template via `{{clpid}}`, producing filenames like `Briney-Kristin-A_nsf_collaborator_report.csv`

**How `run_collaborator_report.bash` works:**
The script validates that the `clpid` exists in `people.ds` via `dataset read people.ds "$1"`, then calls `bin/generate_collaborator_rpt "$1" --record_ids`. That binary (compiled from `generate_collaborator_rpt.ts`) fetches the person's publication records from the CaltechAUTHORS API and formats them as an NSF collaborator table.

**Debugging this report:** If the output file is not generated:
1. Check that `$1` (the clpid) exists in `people.ds`: `dataset read people.ds <clpid>`
2. Check that `bin/generate_collaborator_rpt` exists and is executable
3. Run `run_collaborator_report.bash <clpid>` directly from the COLD working directory to see stderr

---

## The runner: how cold_reports.ts processes the queue

### Startup

`cold_reports` reads `cold_reports.yaml` at startup and builds a `Runner` object with a `report_map` dictionary. Each key is a report name; each value is a `Runnable` instance holding the command, basename, inputs schema, datestamp flag, and content type. The YAML file is not re-read while the service is running — restart `cold_reports` after any changes to `cold_reports.yaml`.

### Poll loop

`cold_reports` calls `servicing_requests()` on a 10-second interval:

```typescript
setInterval(async () => { await report_runner(config_yaml); }, 10000);
```

`servicing_requests()` calls the `next_request` query on `reports.ds` (defined in `cold_api.yaml`). That query returns the oldest request with `status = "requested"`, ordered by `updated` ascending — a strict FIFO. Only one request is dequeued and processed per poll cycle.

### Request processing (`process_request`)

1. Set `status = "processing"` and write to `reports.ds`.
2. Resolve the command's input schema against the values stored in the request's `inputs` field using `resolveCommandInputs()`. This aligns inputs by position and type, substituting an empty value for any mismatch.
3. Call `runnable.run([])`. This executes the shell command (with validated inputs as positional args if inputs exist, or with `$`-shell execution otherwise).
4. The command's stdout is captured and written to `htdocs/rpt/<basename><ext>`. The URL path `rpt/<filename>` is returned as the `link`.
5. If stdout contains `error://`, the status is set to `"error"` and the link holds the error string.
6. If `emails` is non-empty, `send_email()` is called with the report name, status, and link.
7. Write the final `status` and `link` to `reports.ds`.

### Command execution details

For parameterized reports (those with `inputs`), `Runnable.run()` uses `Deno.Command` with `args` set to the ordered list of input values. This avoids shell injection — inputs are passed as discrete arguments, not interpolated into a shell string.

For non-parameterized reports, `run()` uses the `dax` `$` shell helper, which allows the command string to include shell features.

---

## Filename templating

When `basename` contains `{{id}}` placeholders, `Runnable.filenameTemplate()` replaces each `{{id}}` with the corresponding input value. If no input with that `id` is found, the placeholder is replaced with `_id_`. This is used only by `run_collaborator_report`, which produces `<clpid>_nsf_collaborator_report.csv`.

---

## Adding a new report

### 1. Write the report command

Create a shell script (e.g., `run_my_report.bash`) in the COLD working directory. The script should:

- Write its output to stdout
- Exit 0 on success, non-zero on failure
- Print a short error description to stderr on failure (the runner captures stderr and sets status to `"error"` if it is non-empty)

For parameterized reports, accept inputs as positional arguments (`$1`, `$2`, ...).

### 2. Add an entry to cold_reports.yaml

```yaml
my_new_report:
  cmd: ./run_my_report.bash
  basename: my_report_output
  append_datestamp: false
  content_type: text/csv
```

For a parameterized report:

```yaml
my_parameterized_report:
  cmd: ./run_my_parameterized_report.bash
  inputs:
    - id: some_id
      type: text
      required: true
  basename: "{{some_id}}_my_report"
  append_datestamp: false
  content_type: text/csv
```

### 3. Expose the report in the browser form

The browser report request form reads the list of available reports from the UI, not from `cold_reports.yaml` directly. Add the new report name and any input fields to the report request page in `htdocs/` so users can request it. The `report_name` submitted in the form POST must exactly match the key in `cold_reports.yaml`.

### 4. Restart cold_reports

```bash
bin/cold_reports cold_reports.yaml
```

The runner builds its `report_map` at startup. Changes to `cold_reports.yaml` are not picked up at runtime.

---

## Debugging the report runner

**Report stays in "requested" status:**
- Confirm `cold_reports` is running and its poll interval is firing. Check the service log for `INFO: entered servicing_requests` (if enabled) or `INFO: Processing requests for <name>`.
- Confirm the `report_name` in the queue object exactly matches a key in `cold_reports.yaml`.

**Report status is "aborting, unknown report":**
- The `report_name` in `reports.ds` does not match any key in `cold_reports.yaml`. Either the report was mis-named in the request, or the entry is missing from `cold_reports.yaml`. Check with: `dataset read reports.ds <uuid>` and compare `report_name` against the YAML.

**Report status is "error":**
- The `link` field on the report object contains the error string (prefixed with `error://`). Read it: `dataset read reports.ds <uuid>` and inspect `link`.
- Run the command script manually: `./run_my_report.bash [args]` and check exit code and stderr.

**Output file is empty or malformed:**
- The command ran but wrote nothing meaningful to stdout. Run the command directly and inspect its output.
- Check that the script is executable: `ls -l run_my_report.bash`.

**Input values not passed correctly:**
- For parameterized reports, add `console.log` debug output in `cold_reports.ts` or check the existing `DEBUG resolved command inputs` log line. Confirm `resolveCommandInputs` is matching by `id` and `type`.
