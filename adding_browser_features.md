# Adding Browser-Side Features to COLD

This guide walks through how to add a new browser-side feature to COLD, covering:

1. Writing a TypeScript module for the browser
2. Bundling it to JavaScript with Deno
3. Wiring up any new server-side API queries in `browser_api.ts` and `cold_api.yaml`
4. Loading the module in an HTML page

The existing `rdm_review_queue` feature is used throughout as the reference example, since it
demonstrates the full pattern end-to-end.

---

## How the Pieces Fit Together

```
TypeScript source (.ts)
    └─→ deno task htdocs  (runs build.ts + deno bundle)
            └─→ htdocs/modules/*.js   (served as static files)
                    └─→ browser imports via <script type="module">
                            └─→ calls /api/{collection}/{query}  (browser_api.ts)
                                    └─→ datasetd (cold_api.yaml SQL)
```

The browser never talks to `datasetd` directly. It calls COLD's read-only `/api/*` endpoint,
which proxies parameterized SQL queries defined in `cold_api.yaml`.

---

## Step 1 — Write the TypeScript Module

Create a `.ts` file in the project root (alongside the other source files like `rdm_review_queue.ts`).
The file should export a class or functions that the HTML page will import.

### Pattern: exported class with a DOM element target

```typescript
// my_feature.ts
import { ClientAPI } from "./client_api.ts";

export class MyFeatureUI {
  private searchElement: HTMLElement;
  private resultSection: HTMLElement;
  private clientAPI: ClientAPI;

  constructor(options: { searchElement: string | HTMLElement; baseUrl: URL }) {
    this.searchElement =
      typeof options.searchElement === "string"
        ? (document.getElementById(options.searchElement) as HTMLElement)
        : options.searchElement;

    this.clientAPI = new ClientAPI(options.baseUrl.toString());

    // Build the UI by injecting HTML into the target element
    this.searchElement.innerHTML = `
      <form>
        <input id="q" name="q" type="search" placeholder="Search..." size="40">
        <input type="submit" value="Search">
        <input type="reset" value="Clear">
      </form>
      <section id="my-feature-results"></section>
    `;

    this.resultSection = this.searchElement.querySelector("section")!;

    this.searchElement.querySelector("form")!.addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = (this.searchElement.querySelector("#q") as HTMLInputElement).value.trim();
      await this.runQuery(q);
    });
  }

  private async runQuery(q: string): Promise<void> {
    const params = new URLSearchParams({ q });
    // "people.ds" is the collection name; "lookup_by_something" is the SQL query name
    const results = await this.clientAPI.getList("people.ds", "lookup_by_something", params);
    this.resultSection.innerHTML = results.length
      ? results.map((r) => `<p>${r.clpid}: ${r.family_name}, ${r.given_name}</p>`).join("")
      : "<p>No results.</p>";
  }
}
```

### Key rules for browser-side TypeScript

- **Import only from project sources** — do not import Deno standard library modules or
  Node packages. Browsers cannot use them. `client_api.ts`, `orcid_api.ts`, and
  `directory_client.ts` are the approved browser-side dependencies.
- **Use native browser APIs** — `fetch()`, `document`, `HTMLElement`, `URLSearchParams`,
  `URL`, `window.history`, `DOMContentLoaded`. These are all available without imports.
- **Export what the HTML page needs** — a class or named functions. The HTML page will
  import those exports from the transpiled `.js` file.
- **Keep the constructor synchronous** — do async work in methods called after construction.
  The HTML page instantiates the class inside `DOMContentLoaded`.

---

## Step 2 — Register the Module in `build.ts`

`build.ts` lists the TypeScript files that `@deno/emit` transpiles individually to
`htdocs/modules/`. Open `build.ts` and add your file to the `transpileFiles` array:

```typescript
// build.ts (existing code, abbreviated)
let transpileFiles = [
  "client_api.ts",
  "orcid_api.ts",
  "directory_client.ts",
  "my_feature.ts",   // ← add your file here
];
```

The transpiler will output `htdocs/modules/my_feature.js`.

### When to use `deno bundle` instead

`deno bundle` is used for modules that have **cross-file imports that must be merged into one
output file** (e.g., `rdm_review_queue.ts` imports `client_api.ts`). If your module only
imports from `client_api.ts` and both files will be loaded on the same page, you can let the
browser resolve the import at runtime — just add your file to `transpileFiles` in `build.ts`.

If you need a single self-contained bundle (no runtime import resolution), add a `deno bundle`
command to the `htdocs` task in `deno.json`:

```json
"htdocs": "deno run --allow-net --allow-read --allow-env --allow-write=htdocs --allow-import build.ts ; deno bundle --config tsconfig.json client_api.ts my_feature.ts --outdir htdocs/modules/"
```

Check the existing `htdocs` task in `deno.json` for the exact flags already in use and follow
that pattern.

### Building

```bash
deno task htdocs
```

This runs `build.ts` (which calls `@deno/emit`) and any `deno bundle` commands in the task.
The output appears in `htdocs/modules/`.

---

## Step 3 — Add SQL Queries to `cold_api.yaml`

If your feature needs data from a collection that is not already exposed by an existing query,
add a named query to `cold_api.yaml`.

### Query anatomy

`cold_api.yaml` configures `datasetd`. Each collection section has a `query` block of named
SQL statements. The query name becomes part of the URL path used by `browser_api.ts`.

```yaml
# cold_api.yaml (excerpt showing the pattern)
collections:
  - dataset: people.ds
    query:
      # existing queries ...
      lookup_by_something: |
        SELECT json_object(
          'clpid',       src->>'clpid',
          'family_name', src->>'family_name',
          'given_name',  src->>'given_name'
        ) AS src
        FROM people
        WHERE json_extract(src, '$.family_name') LIKE ?
        ORDER BY json_extract(src, '$.family_name')
```

**Important:** `datasetd` passes URL query parameters positionally to SQL `?` placeholders.
The order of parameters in the URL must match the order of `?` in the SQL. See the existing
queries in `cold_api.yaml` for reference patterns using `json_extract` and `LIKE`.

After editing `cold_api.yaml` you must restart `datasetd` (the `cold_api` task) for the
change to take effect.

---

## Step 4 — Update `browser_api.ts` (if needed)

`browser_api.ts` is the server-side handler for all `/api/*` requests from the browser.
For most new queries **no changes are required** — the generic parameter-forwarding logic
handles them automatically.

### How the generic path works

The handler at `handleBrowserAPI()` in `browser_api.ts`:

1. Parses the URL: `/api/{c_name}/{query_name}?param=value`
2. Extracts all query-string keys/values into a `qObj` dictionary
3. Calls `ds.query(query_name, pList, body)` where `pList` is the list of parameter names
4. Returns the JSON result from `datasetd`

So calling `/api/people.ds/lookup_by_something?q=Smith` automatically forwards `q=Smith`
to the SQL query's first `?` placeholder — no code change needed.

### When you do need to change `browser_api.ts`

You need to add special-case handling in `browser_api.ts` when:

- **Parameter names need remapping** — e.g., the browser sends `q` but the SQL expects
  two separate parameters (`name` and `alternative`). Look at the existing `lookup_clgid`
  special case as a reference:

  ```typescript
  // browser_api.ts (existing special case)
  if (apiReq.query_name === "lookup_clgid") {
    body = JSON.stringify({ name: apiReq.q, alternative: apiReq.q });
    pList = ["name", "alternative"];
  }
  ```

  Add a similar `else if` block for your query name if it needs the same treatment.

- **The collection name needs to be blocked** — if you need to prevent access to a
  particular collection or query from the browser for security reasons, add an explicit
  check before the `ds.query()` call.

- **Response transformation is required** — if the raw JSON from `datasetd` needs reshaping
  before the browser receives it, add transformation logic after `resp.json()` and before
  `renderJSON()`.

### Minimal example: adding a remapped-parameter query

```typescript
// browser_api.ts — inside handleBrowserAPI(), before the generic else block
} else if (apiReq.query_name === "lookup_by_something") {
  // SQL expects two positional params: first_name and last_name
  // but the browser only sends a single "q" value
  body = JSON.stringify({ first_name: apiReq.q, last_name: apiReq.q });
  pList = ["first_name", "last_name"];
} else {
  // existing generic path
  for (let k of Object.keys(apiReq)) {
    ...
  }
}
```

---

## Step 5 — Add a Method to `ClientAPI` (optional but recommended)

`client_api.ts` is the browser-side class that wraps `fetch()` calls to `/api/*`. Adding a
named method makes the feature easier to use from your UI module and provides a typed return
value.

```typescript
// client_api.ts — add inside the ClientAPI class

async lookupBySomething(
  q: string,
): Promise<{ clpid: string; family_name: string; given_name: string }[]> {
  const params = new URLSearchParams({ q });
  return (await this.getList("people.ds", "lookup_by_something", params)) as {
    clpid: string;
    family_name: string;
    given_name: string;
  }[];
}
```

Then in `my_feature.ts` use it:

```typescript
const results = await this.clientAPI.lookupBySomething(q);
```

After editing `client_api.ts`, re-run `deno task htdocs` so the change is compiled into
`htdocs/modules/client_api.js`.

---

## Step 6 — Create the HTML Page

Create `htdocs/my_feature.html`. It should be a plain HTML5 file. Use an existing page like
`htdocs/rdm_review_queue.html` or `htdocs/collaborator_report.html` as a template.

```html
<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My Feature - COLD</title>
  <link rel="stylesheet" href="css/site.css">
</head>
<body>
<nav>
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>
<header>
  <h1>My Feature</h1>
</header>
<main>
  <!-- The UI module injects its form and results into this element -->
  <div id="my-feature-container"></div>
</main>
<footer>
  <p>Caltech Library</p>
</footer>

<script type="module">
  import { MyFeatureUI } from "./modules/my_feature.js";

  // Resolve the base URL (strip the filename so relative API calls work)
  const baseUrl = new URL(window.location.href);
  baseUrl.pathname = baseUrl.pathname.replace(/my_feature\.html$/, "");
  baseUrl.search = "";

  window.addEventListener("DOMContentLoaded", () => {
    new MyFeatureUI({
      baseUrl: baseUrl,
      searchElement: "my-feature-container",
    });
  });
</script>
</body>
</html>
```

### Why the `baseUrl` normalization?

`ClientAPI` uses `baseUrl` to construct `/api/` URLs. If the page is served at
`/my_feature.html`, the browser's `window.location.href` is `.../my_feature.html`. The
module strips the filename so that the constructed API URL becomes `/api/people.ds/...`
rather than `/my_feature.htmlapi/people.ds/...`. This matches the pattern used by every
other page in `htdocs/`.

---

## Step 7 — Verify the Full Pipeline

1. **Type-check** — catches TypeScript errors before building:
   ```bash
   deno task check
   ```

2. **Build browser modules:**
   ```bash
   deno task htdocs
   ```
   Confirm `htdocs/modules/my_feature.js` exists.

3. **Start the backend** (if not running):
   ```bash
   deno task cold_api     # starts datasetd on port 8112
   ```

4. **Start the middleware:**
   ```bash
   deno task cold         # starts cold on port 8111, watches for changes
   ```

5. **Open the page** at `http://localhost:8111/my_feature.html` and exercise the feature.

6. **Check the API directly** to verify the query works:
   ```
   http://localhost:8111/api/people.ds/lookup_by_something?q=Smith
   ```
   Should return a JSON array.

---

## Summary of Files Changed

| File | Change |
|---|---|
| `my_feature.ts` | New — browser-side UI module |
| `build.ts` | Add `"my_feature.ts"` to `transpileFiles` (or add bundle command to `deno.json`) |
| `cold_api.yaml` | Add named SQL query to the relevant collection |
| `browser_api.ts` | Only if parameter remapping or response transformation is needed |
| `client_api.ts` | Optional — add a typed wrapper method for the new query |
| `htdocs/my_feature.html` | New — HTML page that loads the module |

The only file that must change is `build.ts` (or `deno.json`). Everything else follows from
whether your query fits the generic path in `browser_api.ts` or needs special handling.
