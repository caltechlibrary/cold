# COLD: Controlled Object List and Dataset

COLD is a web application that Caltech Library uses to manage controlled vocabularies and institutional records — primarily **people** (researchers), **groups** (departments, labs), **funders**, **journals**, **subjects**, and related identifiers. Think of it as an authoritative registry that other systems (like a research data management platform) can query for canonical information.

---

## The Three-Layer Architecture

The system is split into three independently running services:

```
Browser
   ↓  (via Apache/Shibboleth for auth)
[cold] on port 8111  ←→  [datasetd] on port 8112
                               ↓
                          SQLite (.ds collections)
[cold_reports] on port 8113  (async report queue)
```

**1. The Frontend Web Server (Apache + Shibboleth)**
Not part of this repo, but it sits in front of everything. It handles single sign-on authentication and proxies requests to COLD's services. In development you bypass this layer entirely.

**2. `cold` — The Middleware (cold.ts)**
This is the heart of the application — a Deno/TypeScript HTTP server that:
- Routes requests (e.g., `/people/*` → `people.ts`, `/groups/*` → `groups.ts`)
- Validates form inputs
- Renders HTML pages using Handlebars templates in `views/`
- Serves static files from `htdocs/`
- Exposes a read-only JSON API at `/api/*` for browser-side JavaScript

**3. `datasetd` — The Backend (cold_api.yaml)**
`datasetd` is a separate program (from the [dataset](https://github.com/caltechlibrary/dataset) project) that COLD does *not* own — it's a dependency. You configure it with `cold_api.yaml`, which declares:
- Which SQLite-backed collections exist (people.ds, groups.ds, etc.)
- What SQL queries are available on each collection
- Which CRUD endpoints are enabled

The middleware talks to datasetd over HTTP (port 8112) using a simple JSON API. Datasetd handles all data persistence; COLD handles all business logic.

---

## Role of `dataset` and `datasetd`

This is a critical distinction:

- **dataset** is a Go library/tool for managing collections of JSON objects backed by SQLite. A "collection" (`.ds` directory) is essentially a database of JSON records with a defined schema.
- **datasetd** is the web service wrapper around dataset — it exposes those collections as a JSON REST API.
- COLD uses datasetd as its **data layer**. The middleware never touches SQLite directly; it sends HTTP requests to datasetd and gets JSON back.

`cold_api.yaml` is where COLD tells datasetd how to behave: what endpoints to expose, what SQL queries to support, and where the collections live.

---

## Data Flow: Adding a Person (Example)

1. User fills out a form in the browser (`people_edit.hbs` template)
2. Browser POSTs form data to `cold` (port 8111)
3. `cold.ts` routes it to `handlePeople()` in `people.ts`
4. `people.ts` validates the data and constructs a JSON object
5. It sends an HTTP PUT/POST to `datasetd` (port 8112)
6. `datasetd` persists the record to `people.ds/` (SQLite)
7. `cold` fetches the saved record and renders it with Handlebars
8. Browser receives HTML showing the new/updated person

---

## The Report System

A third service, `cold_reports`, handles async report generation:
1. A user requests a report via the UI
2. A request record is written to `reports.ds`
3. `cold_reports` polls the queue and runs the configured script (bash, TypeScript binary, SQL, etc.)
4. Output is saved to `htdocs/rpt/`
5. The report record is updated with a link, and an email is sent

---

## Browser-Side Code

TypeScript modules in the repo are **transpiled** into plain JavaScript and placed in `htdocs/modules/`. The browser loads these as standard ES modules — no bundler framework, no React, just vanilla JavaScript. The key modules are:
- `client_api.js` — queries the read-only `/api/*` endpoint on `cold`
- `directory_client.js` — looks up people in Caltech's directory
- `orcid_api.js` — resolves ORCID identifiers

---

## Key Files to Start With

| File | What it does |
|---|---|
| `cold.ts` | Main HTTP server and request router |
| `cold_api.yaml` | Configures the datasetd backend |
| `people.ts` | Typical example of a collection handler |
| `render.ts` | Handlebars template rendering |
| `views/people_list.hbs` | Typical Handlebars template |
| `cold_reports.ts` | Async report queue processor |
| `browser_api.ts` | Read-only JSON API for the browser |
| `deno.json` | Build tasks (transpile, compile, test, etc.) |

---

## Tech Stack Summary

- **Runtime**: Deno + TypeScript (compiled to native binaries for production)
- **Data storage**: Dataset collections (SQLite under the hood), accessed via datasetd's JSON API
- **Templating**: Handlebars (`.hbs` files in `views/`)
- **Frontend**: Vanilla HTML5/CSS/JS — no frameworks
- **Build tooling**: `deno.json` tasks + `Makefile` + CMTools + Pandoc
