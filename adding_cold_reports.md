# Adding a New Report to COLD

This guide walks through everything required to add a new report to the COLD reports system. It covers both simple (non-parameterized) reports and parameterized reports that require user input, using the collaborator report as the worked example for the latter case.

For background on the design intent and security model see `report_design_choices.md`. For a deep dive on the configuration files see `cold_api_deep_dive.md` and `cold_reports_deep_dive.md`.

---

## Overview of what is involved

A report in COLD is the combination of:

1. **A shell script or program** that writes its output to stdout.
2. **An entry in `cold_reports.yaml`** that names the script, defines the output file naming, and (for parameterized reports) declares what inputs are expected.
3. **An option in `views/report_list.hbs`** so users can select and request the report in the browser.
4. For parameterized reports: **browser-side validation** via a TypeScript module or inline JavaScript in the template.

You may also need a change to `cold_api.yaml` if your report relies on a new SQL query that does not yet exist.

---

## Step 1 — Decide whether cold_api.yaml needs to change

Most reports call `dsquery` or `dataset` directly from their shell script, using SQL that is either embedded in the script or a companion `.sql` file. In that case `cold_api.yaml` does not need to change.

You **do** need to add to `cold_api.yaml` if either of the following is true:

- Your report script calls the `datasetd` HTTP API (e.g., `curl http://localhost:8112/api/...`) and it needs a named query that does not yet exist.
- Your report needs to read from a dataset collection that is not already declared in `cold_api.yaml`.

If you do need a new named query, add it under the relevant collection in `cold_api.yaml`:

```yaml
- dataset: people.ds
  query:
    # existing queries ...
    my_new_query: |
      SELECT json_object('field', src->'field') AS src
      FROM people
      WHERE src->>'some_field' = ?
      ORDER BY src->>'field'
```

Restart `datasetd` after any change to `cold_api.yaml`:

```bash
# In development
deno task cold_api

# In production — reload via systemd
sudo systemctl restart cold_api
```

Test the new query directly before proceeding:

```bash
curl "http://localhost:8112/api/people.ds/_query/my_new_query" \
  -H "Content-Type: application/json" \
  -d '{"param": "value"}'
```

---

## Step 2 — Write the report script

Create a shell script in the COLD working directory. The convention is `run_<report_name>.bash`.

### Requirements for all report scripts

- **Write output to stdout.** The runner reads stdout and writes it to `htdocs/rpt/<filename>`.
- **Write errors to stderr or prefix the error with `error://` on stdout.** The runner checks for the `error://` prefix and sets the report status to `"error"` if found.
- **Exit 0 on success, non-zero on failure.** A non-zero exit causes the runner to mark the report as failed.
- **Make the script executable:** `chmod +x run_my_report.bash`

### Simple report example

```bash
#!/bin/bash
dsquery \
  -csv "col1,col2,col3" \
  -sql my_report.sql \
  people.ds
```

For SQL embedded in the script:

```bash
#!/bin/bash
dsquery \
  -csv "family_name,given_name,orcid" \
  people.ds <<'SQL'
SELECT json_object(
  'family_name', src->'family_name',
  'given_name',  src->'given_name',
  'orcid',       src->'orcid'
) AS src
FROM people
ORDER BY src->>'family_name', src->>'given_name'
SQL
```

### Parameterized report example

For parameterized reports, inputs are passed as positional command-line arguments (`$1`, `$2`, ...). The script must validate each argument before using it.

```bash
#!/bin/bash

# Validate $1 is a non-empty clpid that exists in people.ds
if [ "$1" = "" ]; then
    echo "error://Missing clpid, aborting"
    exit 1
fi
CLPID="$1"

# Confirm the clpid exists before doing any work
if ! dataset read people.ds "${CLPID}" > /dev/null 2>&1; then
    echo "error://Failed to find '${CLPID}' in people.ds"
    exit 1
fi

# Run the report, writing output to stdout
./bin/my_report_program "${CLPID}"
```

See `run_collaborator_report.bash` for the actual collaborator report implementation. Notice it validates the `clpid` with `dataset read` before calling `bin/generate_collaborator_rpt`. The script is the last line of defence — do not skip the check.

---

## Step 3 — Add an entry to cold_reports.yaml

Open `cold_reports.yaml` and add your report under the `reports:` key. The key name is the `report_name` that users will submit in the request form. It must match exactly what the browser POSTs.

### Non-parameterized report

```yaml
run_my_report:
  cmd: ./run_my_report.bash
  basename: my_report
  append_datestamp: false
  content_type: text/csv
```

| Field | Notes |
|---|---|
| `cmd` | Path to the script, relative to the COLD working directory. |
| `basename` | Base filename without extension. Output goes to `htdocs/rpt/<basename><ext>`. |
| `append_datestamp` | Set to `true` to produce dated snapshots like `my_report_2026-04-13.csv` instead of overwriting the same file each time. |
| `content_type` | Determines the file extension: `text/csv` → `.csv`, `application/yaml` → `.yaml`, `application/vnd.ms-excel` → `.xlsx`, `text/plain` → `.txt`. |

### Parameterized report

```yaml
run_my_parameterized_report:
  cmd: ./run_my_parameterized_report.bash
  inputs:
    - id: clpid
      type: clpid
      required: true
  basename: "{{clpid}}_my_report"
  append_datestamp: false
  content_type: text/csv
```

The `inputs` list must be declared in the order they will be passed as command-line arguments to `cmd`. Each input has:

| Field | Notes |
|---|---|
| `id` | The form field name and the `{{id}}` placeholder in `basename`. |
| `type` | HTML5 input type (`text`, `email`, etc.) or an identifier type from metadatatools (`clpid`, `orcid`). Used for validation in the middleware and runner. |
| `required` | If `true`, the runner rejects the request if this value is absent or empty. |

The `basename` may use `{{id}}` placeholders that are substituted with the validated input values at run time. In the example above, a request with `clpid = Doiel-R-S` produces output at `htdocs/rpt/Doiel-R-S_my_report.csv`.

**Important:** Any input used in `basename` must be `required: true`, otherwise the filename template cannot resolve and the output path will contain `_id_` as a placeholder.

---

## Step 4 — Add the report to views/report_list.hbs

### Non-parameterized report

Add an `<option>` element inside the appropriate `<optgroup>` in the `<select name="report_name">` block. Choose the group that best describes your report, or add a new `<optgroup>` if needed.

```html
<optgroup label="CSV reports">
  <!-- existing options ... -->
  <option value="run_my_report" title="Description of what this report contains">Generate My Report CSV</option>
</optgroup>
```

The `value` attribute must exactly match the key you added in `cold_reports.yaml`.

That is all for a simple report. No other template changes are needed — the form POSTs the selected `report_name` and an optional `emails` field, and the middleware handles the rest.

### Parameterized report — two approaches

Because the main `report_list.hbs` form is a single `<select>` with a submit button, you have two options for introducing report-specific input fields:

**Option A — Inline parameter fields in report_list.hbs (recommended for simple inputs)**

Show extra input fields when the parameterized report is selected, and hide them otherwise. This keeps everything on the existing reports page.

**Option B — Separate standalone page (current collaborator report approach)**

Create a dedicated HTML page and TypeScript module for the report. Link to it from `report_list.hbs`. This is what `collaborator_report.html` and `collaborator_report.ts` do today. It gives more room for a richer UI (autocomplete, validation feedback) but requires maintaining an additional file.

The collaborator report is currently implemented as Option B and has a FIXME to eventually move to Option A. Choose Option A for new reports unless the browser-side interaction is significantly more complex than a single validated text input.

---

### Option A — Inline parameter fields in report_list.hbs

The technique is to add hidden `<div>` elements for each parameterized report's inputs and show/hide them using a `change` event listener on the `<select>`.

**1. Add the option to the select (uncomment the collaborator example or add your own):**

```html
<optgroup label="Mediated reports">
  <option value="run_my_parameterized_report"
          title="Run a parameterized report"
          data-inputs="my-report-inputs">My Parameterized Report</option>
</optgroup>
```

The `data-inputs` attribute names the `id` of the `<div>` holding this report's parameter fields.

**2. Add a hidden `<div>` for the report's parameters, inside the `<form>` block, below the `<select>`:**

```html
<div id="my-report-inputs" class="report-inputs" style="display:none">
  <label for="my_param">My Parameter</label>
  <input type="text"
         id="my_param"
         name="my_param"
         placeholder="Enter value"
         autocomplete="off"
         disabled>
  <small>Description of what this parameter means.</small>
</div>
```

Set the inputs `disabled` by default. The JavaScript below will enable them when the report is selected. A disabled input is not included in the form POST, which prevents unintended parameters from reaching the middleware.

**3. Add a `<script>` block at the bottom of the `<body>` (before `{{>footer}}`) to wire the show/hide logic:**

```html
<script>
(function () {
  const select = document.getElementById('report_name');
  const allInputDivs = document.querySelectorAll('.report-inputs');

  function updateInputVisibility() {
    const chosen = select.options[select.selectedIndex];
    const targetId = chosen.dataset.inputs || '';

    allInputDivs.forEach(function (div) {
      if (div.id === targetId) {
        div.style.display = '';
        div.querySelectorAll('input, select, textarea').forEach(function (el) {
          el.disabled = false;
        });
      } else {
        div.style.display = 'none';
        div.querySelectorAll('input, select, textarea').forEach(function (el) {
          el.disabled = true;
        });
      }
    });
  }

  select.addEventListener('change', updateInputVisibility);
  // Run once on page load in case the browser restores a selection.
  updateInputVisibility();
}());
</script>
```

This is vanilla JavaScript with no dependencies, consistent with COLD's development philosophy.

**4. Add browser-side validation before the form submits (optional but recommended):**

```html
<script>
document.getElementById('report-request-form').addEventListener('submit', function (e) {
  const reportName = document.getElementById('report_name').value;
  if (reportName === 'run_my_parameterized_report') {
    const param = document.getElementById('my_param').value.trim();
    if (param === '') {
      e.preventDefault();
      alert('My Parameter is required for this report.');
      return;
    }
    // Add any identifier-format validation here (e.g. /^[A-Za-z]+-[A-Za-z]-[A-Za-z]$/.test(param))
  }
});
</script>
```

---

### Option B — Separate standalone page (collaborator report pattern)

This approach uses a dedicated HTML page and a TypeScript module. It is the current state of the collaborator report.

**Files involved:**

- `htdocs/collaborator_report.md` — Source Markdown page (rendered to HTML by Pandoc as part of the build)
- `htdocs/collaborator_report.html` — Rendered HTML page served directly
- `collaborator_report.ts` — TypeScript module for the browser-side UI
- `htdocs/modules/collaborator_report.js` — Transpiled JavaScript (generated by `deno task htdocs`)

**How the collaborator report browser UI works:**

`collaborator_report.ts` exports a `CollaboratorReportUI` class. When instantiated on the page it:

1. Renders a form with a `clpid` text input backed by a `<datalist>` for autocomplete.
2. Calls `GET /api/people.ds/get_all_clpid` (via `ClientAPI`) to populate the autocomplete list.
3. On form submit, validates the entered `clpid` against `GET /api/people.ds/validate_clpid?clpid=<value>` before sending anything.
4. If valid, POSTs to `../reports` with `report_name=run_collaborator_report` and `clpid=<value>`. This is the same endpoint the `report_list.hbs` form uses.

The page `collaborator_report.html` loads the module:

```html
<div id="collaborator_report"></div>
<noscript>JavaScript required for the collaborator report</noscript>
<script type="module">
  import { ClientAPI } from "./modules/client_api.js";
  import { CollaboratorReportUI } from "./modules/collaborator_report.js";
  const baseUrl = URL.parse(window.location.href);
  baseUrl.pathname = baseUrl.pathname.replace(/collaborator_report.html$/g, '');
  baseUrl.search = "";
  const reportElement = document.getElementById("collaborator_report");
  window.addEventListener('DOMContentLoaded', (event) => {
    const ui = new CollaboratorReportUI({
      baseUrl: baseUrl,
      reportElement: reportElement,
      clientAPI: new ClientAPI(baseUrl)
    });
  });
</script>
```

**To add a new report using Option B:**

1. Create `my_report.ts` following the structure of `collaborator_report.ts`. Export a class that renders the form, validates inputs, and POSTs to `../reports`.
2. Rebuild the browser modules: `deno task htdocs` (this bundles `my_report.ts` into `htdocs/modules/my_report.js`).
3. Create `htdocs/my_report.html` or `htdocs/my_report.md` embedding a `<div id="my_report">` and a `<script type="module">` block that imports and instantiates your class.
4. Add a link from `views/report_list.hbs` to `my_report.html` so users can find it.

**When to use Option A vs Option B:**

| | Option A (inline) | Option B (separate page) |
|---|---|---|
| Input count | 1–2 simple fields | Many fields or complex UI |
| Validation | Basic HTML5 / regexp | Requires API lookups (e.g., validate clpid exists) |
| Autocomplete | Not needed | Needed (datalist populated from API) |
| JavaScript dependency | None (vanilla JS) | TypeScript module required |
| Maintenance | One file (`report_list.hbs`) | Multiple files (`*.ts`, `*.html`, `*.js`) |

---

## Step 5 — Restart cold_reports

The `cold_reports` service reads `cold_reports.yaml` once at startup. Any changes to the file require a restart:

```bash
# In development
deno task cold_reports

# In production
sudo systemctl restart cold_reports
```

---

## Step 6 — Test the new report

1. Open the COLD reports page in the browser.
2. Select your new report (and fill in any parameters).
3. Submit the request.
4. Watch the reports table update — status should move from `requested` → `processing` → `completed`.
5. Follow the link to confirm the output file looks correct.

If the report stays in `requested` status, check that the `cold_reports` service is running and that the `report_name` submitted exactly matches the key in `cold_reports.yaml`.

If the status goes to `error`, read the `link` field in the report queue object for the error message:

```bash
dataset keys reports.ds | tail -1      # get the most recent UUID
dataset read reports.ds <uuid>          # inspect status and link
```

Then run the script directly to see its stderr:

```bash
./run_my_report.bash [args]
```

---

## Security checklist for parameterized reports

Every new parameterized report must address these points. See `report_design_choices.md` for the full rationale.

- [ ] **Browser**: The form validates that required fields are non-empty and that values conform to the expected format (regexp or API lookup) before submitting.
- [ ] **Middleware** (`cold_reports.ts`): `handleReportRequest` reads `cold_reports.yaml` to get the input definitions, merges form values into the `Report` object, and rejects any parameter not declared in the `inputs` list.
- [ ] **Runner** (`cold_reports.ts`, `resolveCommandInputs`): Inputs are matched by `id` and `type` before being passed to the command. Any mismatch substitutes an empty value. Only declared inputs are forwarded.
- [ ] **Script** (`run_my_report.bash`): The script validates each `$1`, `$2`, ... argument before using it. A missing or malformed argument prints `error://message` and exits non-zero.
- [ ] **Parameters are strings only**: Inputs must never be used to construct a shell command in a way that allows injection. Pass values as positional arguments, not interpolated into a command string.
- [ ] **No free-text inputs**: Use identifiers with a defined format (e.g., `clpid`, `orcid`) or constrained `<select>` menus. Never accept arbitrary free text as an input to a parameterized report.
- [ ] **Filename safety**: If the parameter contributes to the output filename (via `basename` template), confirm the value cannot traverse directories. The runner does not currently sanitise paths, so this is the script author's responsibility.

---

## Quick reference: files to change for each report type

### Non-parameterized report

| File | Change |
|---|---|
| `run_<name>.bash` | Create the script |
| `cold_reports.yaml` | Add the report entry |
| `views/report_list.hbs` | Add `<option>` to the select |
| `cold_api.yaml` | Only if a new SQL query is needed |

Restart: `cold_reports` (and `datasetd` if `cold_api.yaml` changed).

### Parameterized report — Option A (inline form)

| File | Change |
|---|---|
| `run_<name>.bash` | Create the script, validate `$1`, `$2`, ... |
| `cold_reports.yaml` | Add the report entry with `inputs:` list |
| `views/report_list.hbs` | Add `<option>` with `data-inputs`, hidden `<div>` with inputs, show/hide script, submit validation script |
| `cold_api.yaml` | Only if a new SQL query is needed |

Restart: `cold_reports` (and `datasetd` if `cold_api.yaml` changed).

### Parameterized report — Option B (separate page)

| File | Change |
|---|---|
| `run_<name>.bash` | Create the script, validate `$1`, `$2`, ... |
| `cold_reports.yaml` | Add the report entry with `inputs:` list |
| `<name>.ts` | Create the TypeScript UI class |
| `htdocs/<name>.html` | Create the standalone HTML page |
| `views/report_list.hbs` | Add a link to the standalone page |
| `cold_api.yaml` | Only if a new SQL query is needed |

Build: `deno task htdocs` (to transpile the TypeScript module).

Restart: `cold_reports` (and `datasetd` if `cold_api.yaml` changed).
