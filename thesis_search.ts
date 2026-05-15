/**
 * thesis_search.ts provides the browser-side JavaScript for searching
 * CaltechTHESIS records via the caltechthesis.ds dataset collection JSON API.
 *
 * The search form mirrors the EPrints staff search at /cgi/search/eprint/staff.
 * Division and option vocabularies are drawn from the corpus at page load.
 * Multiple active fields run parallel queries whose results are intersected
 * (AND) or unioned (OR) client-side.
 *
 * Usage:
 * ~~~HTML
 * <div id="search">Loading...</div>
 * <script type="module">
 *   import { ThesisSearchUI } from "./modules/thesis_search.js";
 *   const baseUrl = URL.parse(window.location.href);
 *   baseUrl.pathname = baseUrl.pathname.replace(/thesis_search.html$/, '');
 *   baseUrl.search = "";
 *   window.addEventListener('DOMContentLoaded', () => {
 *     new ThesisSearchUI({ baseUrl, searchElement: document.getElementById("search") });
 *   });
 * </script>
 * ~~~
 */

import { ClientAPI } from "./client_api.ts";

// --- Vocabulary maps --------------------------------------------------------

const divisionLabels: Record<string, string> = {
  "div_bbe": "Biology and Biological Engineering",
  "div_biol": "Biology",
  "div_chem": "Chemistry and Chemical Engineering",
  "div_eng": "Engineering and Applied Science",
  "div_gps": "Geological and Planetary Sciences",
  "div_hss": "Humanities and Social Sciences",
  "div_int": "Interdisciplinary Programs",
  "div_pma": "Physics, Mathematics and Astronomy",
};

const optionLabels: Record<string, string> = {
  "aeronautics": "Aeronautics",
  "aerospace": "Aerospace Engineering",
  "appliedmath": "Applied And Computational Mathematics",
  "appmath": "Applied Mathematics",
  "appliedmech": "Applied Mechanics",
  "appliedphys": "Applied Physics",
  "astronomy": "Astronomy",
  "astrophys": "Astrophysics",
  "behav": "Behavioral and Social Neuroscience",
  "bioch": "Biochemistry",
  "biochem": "Biochemistry and Molecular Biophysics",
  "bioeng": "Bioengineering",
  "bioinfo": "Bioinformation Systems",
  "bioleng": "Biological Engineering",
  "biology": "Biology",
  "busecon": "Business Economics and Management",
  "chemeng": "Chemical Engineering",
  "chemistry": "Chemistry",
  "civileng": "Civil Engineering",
  "cns": "Computation and Neural Systems",
  "compscieng": "Computational Science and Engineering",
  "compsci": "Computer Science",
  "cms": "Computing and Mathematical Sciences",
  "cds": "Control and Dynamical Systems",
  "biodev": "Developmental Biology",
  "economics": "Economics",
  "eleceng": "Electrical Engineering",
  "eng": "Engineering",
  "engappsci": "Engineering and Applied Science",
  "english": "English",
  "envreng": "Environmental Science and Engineering",
  "geobiol": "Geobiology",
  "geochem": "Geochemistry",
  "gps": "Geological and Planetary Sciences",
  "geol": "Geology",
  "geophys": "Geophysics",
  "history": "History",
  "histsci": "History and Philosophy of Science",
  "humanities": "Humanities",
  "immun": "Immunology",
  "matsci": "Materials Science",
  "math": "Mathematics",
  "mecheng": "Mechanical Engineering",
  "medeng": "Medical Engineering",
  "meteor": "Meteorology",
  "microbio": "Microbiology",
  "molbio": "Molecular Biology",
  "molbiochem": "Molecular Biology and Biochemistry",
  "neurobio": "Neurobiology",
  "paleontology": "Paleontology",
  "philosophy": "Philosophy",
  "physics": "Physics",
  "plansci": "Planetary Sciences",
  "polisci": "Political Science",
  "socsci": "Social Science",
  "socdecneusci": "Social and Decision Neuroscience",
  "space": "Space Engineering",
  "sysbiol": "Systems Biology",
  "infdatasci": "Information and Data Sciences",
  "medee": "Medical and Electrical Engineering",
};

const thesisTypeLabels: Record<string, string> = {
  "phd": "Dissertation (Ph.D.)",
  "masters": "Master's thesis",
  "engd": "Engineer's thesis",
  "bachelors": "Bachelor's thesis",
  "senior_minor": "Senior thesis (Minor)",
  "senior_major": "Senior thesis (Major)",
  "other": "Other",
};

const eprintStatusLabels: Record<string, string> = {
  "archive": "Live Archive",
  "buffer": "Under Review",
  "inbox": "User Workarea",
  "deletion": "Retired",
};

const reviewStatusLabels: Record<string, string> = {
  "review": "Being reviewed",
  "correction": "Waiting for corrections",
  "gradoffice": "Sent to Grad Office",
  "go-pending": "Pending in GO — see notes",
  "notapproved": "Not Approved — see notes",
  "approved": "Approved",
  "withheld": "Approved — WITHHELD",
  "other": "Other — see Internal Notes",
};

const fullTextStatusLabels: Record<string, string> = {
  "public": "Public (worldwide)",
  "restricted": "Caltech community only",
  "mixed": "Mixed (file-level)",
  "withheld": "Withheld",
};

// --- Types -----------------------------------------------------------------

interface Creator {
  family: string;
  given: string;
  id: string;
  orcid: string;
}

interface ThesisRecord {
  eprintid: number;
  title: string;
  abstract: string;
  date: number;
  thesis_degree: string;
  thesis_type: string;
  eprint_status: string;
  metadata_visibility: string;
  full_text_status: string;
  review_status: string;
  ispublished: string;
  link: string;
  creators: Creator[] | null;
  thesis_advisor: Creator[] | null;
  divisions: string[] | null;
  option_major: string[] | null;
  option_minor: string[] | null;
  creator_names_idx: string;
  advisor_names_idx: string;
  reviewer: string;
  lastmod: string;
}

// --- Main class ------------------------------------------------------------

export class ThesisSearchUI {
  private cName: string = "caltechthesis.ds";
  private searchElement: HTMLElement;
  private clientAPI: ClientAPI;
  private baseUrl: URL;
  private basePath: string = "";
  private resultSection!: HTMLElement;

  constructor(options: {
    searchElement: HTMLElement | string;
    baseUrl: URL;
    cName?: string;
  }) {
    if (options.cName) this.cName = options.cName;
    this.baseUrl = new URL(options.baseUrl);
    this.basePath = this.baseUrl.pathname;
    this.clientAPI = new ClientAPI(this.baseUrl.toString());

    if (typeof options.searchElement === "string") {
      this.searchElement = document.getElementById(options.searchElement)!;
    } else {
      this.searchElement = options.searchElement;
    }

    this.buildForm();
    this.loadVocabularies();
    this.restoreFromURL();
  }

  // --- Form construction ----------------------------------------------------

  private buildForm(): void {
    const formHTML = `
<form method="get" id="thesis-search-form">

<div class="ts-text-row">
  <label for="q_name">Search field:</label>
  <select name="q_name" id="q_name">
    <optgroup label="Text searches">
      <option value="by_text">Full text (title / abstract / keywords)</option>
      <option value="by_title">Title</option>
      <option value="by_abstract">Abstract</option>
      <option value="by_author">Author name</option>
      <option value="by_advisor">Advisor name</option>
      <option value="by_committee">Committee member name</option>
      <option value="by_orcid">ORCID</option>
      <option value="by_doi">DOI</option>
      <option value="by_reviewer">Reviewer</option>
      <option value="by_depositor">Depositor (username or name)</option>
      <option value="by_funder">Funding agency / grant number</option>
      <option value="by_eprintid">Item ID (exact number)</option>
    </optgroup>
  </select>
  <input id="q" name="q" type="search" size="45"
         placeholder="use * as wildcard" value="">
</div>

<div class="ts-year-row">
  <label>Degree year:</label>
  From <input type="number" id="year_from" name="year_from" size="6" min="1900" max="2100">
  to   <input type="number" id="year_to"   name="year_to"   size="6" min="1900" max="2100">
</div>

<div class="ts-selects-row">
  <fieldset>
    <legend>Division <small>(ctrl/cmd-click for multiple)</small></legend>
    <select id="divisions" name="divisions" multiple size="8">
      <option value="">Loading...</option>
    </select>
    <label class="ts-merge-label">
      <input type="radio" name="divisions_merge" value="ANY" checked> Any of these
    </label>
    <label class="ts-merge-label">
      <input type="radio" name="divisions_merge" value="ALL"> All of these
    </label>
  </fieldset>

  <fieldset>
    <legend>Major Option <small>(ctrl/cmd-click for multiple)</small></legend>
    <select id="option_major" name="option_major" multiple size="10">
      <option value="">Loading...</option>
    </select>
    <label class="ts-merge-label">
      <input type="radio" name="option_major_merge" value="ANY" checked> Any of these
    </label>
    <label class="ts-merge-label">
      <input type="radio" name="option_major_merge" value="ALL"> All of these
    </label>
  </fieldset>

  <fieldset>
    <legend>Minor Option <small>(ctrl/cmd-click for multiple)</small></legend>
    <select id="option_minor" name="option_minor" multiple size="10">
      <option value="">Loading...</option>
    </select>
    <label class="ts-merge-label">
      <input type="radio" name="option_minor_merge" value="ANY" checked> Any of these
    </label>
  </fieldset>
</div>

<div class="ts-checks-row">
  <fieldset>
    <legend>Item Status</legend>
    ${this.checkboxGroup("eprint_status", eprintStatusLabels, ["archive"])}
  </fieldset>

  <fieldset>
    <legend>Thesis Type</legend>
    ${this.checkboxGroup("thesis_type", thesisTypeLabels, [])}
  </fieldset>

  <fieldset>
    <legend>Thesis Availability</legend>
    ${this.checkboxGroup("full_text_status", fullTextStatusLabels, [])}
  </fieldset>

  <fieldset>
    <legend>Review Status</legend>
    ${this.checkboxGroup("review_status", reviewStatusLabels, [])}
  </fieldset>
</div>

<div class="ts-buttons-row">
  <label>Results must fulfil:
    <select id="satisfyall" name="satisfyall">
      <option value="ALL" selected>all of these conditions (AND)</option>
      <option value="ANY">any of these conditions (OR)</option>
    </select>
  </label>
  <input type="submit" value="🔎 Search">
  <input type="reset" value="❌ Reset">
</div>

</form>
<p><section class="thesis-search-results" id="thesis-search-results"></section>`;

    this.searchElement.innerHTML = formHTML;
    this.resultSection = this.searchElement.querySelector("section")!;

    this.searchElement.querySelector("form")!.addEventListener(
      "submit",
      (e) => {
        e.preventDefault();
        this.runSearch();
      },
    );

    this.searchElement.querySelector("input[type=reset]")!.addEventListener(
      "click",
      () => {
        this.resultSection.innerHTML = "";
      },
    );
  }

  private checkboxGroup(
    name: string,
    labels: Record<string, string>,
    defaultChecked: string[],
  ): string {
    return Object.entries(labels).map(([val, label]) => {
      const checked = defaultChecked.includes(val) ? " checked" : "";
      return `<label><input type="checkbox" name="${name}" value="${val}"${checked}> ${label}</label>`;
    }).join("\n    ");
  }

  // --- Vocabulary loading ---------------------------------------------------

  private async loadVocabularies(): Promise<void> {
    const [divisions, optionsMajor, optionsMinor] = await Promise.all([
      this.clientAPI.getStringList(this.cName, "get_distinct_divisions"),
      this.clientAPI.getStringList(this.cName, "get_distinct_option_major"),
      this.clientAPI.getStringList(this.cName, "get_distinct_option_minor"),
    ]);
    this.populateSelect("divisions", divisions, divisionLabels);
    this.populateSelect("option_major", optionsMajor, optionLabels);
    this.populateSelect("option_minor", optionsMinor, optionLabels);
  }

  private populateSelect(
    id: string,
    codes: string[],
    labelMap: Record<string, string>,
  ): void {
    const sel = document.getElementById(id) as HTMLSelectElement | null;
    if (!sel) return;
    sel.innerHTML = codes.map((code) => {
      const label = labelMap[code] ?? code;
      return `<option value="${code}">${label}</option>`;
    }).join("");
  }

  // --- URL state -----------------------------------------------------------

  private restoreFromURL(): void {
    const params = new URL(window.location.href).searchParams;

    const qName = params.get("q_name");
    const q = params.get("q");
    if (qName) {
      const sel = document.getElementById("q_name") as HTMLSelectElement;
      if (sel) sel.value = qName;
    }
    if (q) {
      const inp = document.getElementById("q") as HTMLInputElement;
      if (inp) inp.value = q;
    }

    const setNum = (id: string, key: string) => {
      const v = params.get(key);
      if (v) (document.getElementById(id) as HTMLInputElement).value = v;
    };
    setNum("year_from", "year_from");
    setNum("year_to", "year_to");

    const restoreMultiSelect = (id: string, key: string) => {
      const values = params.getAll(key);
      if (!values.length) return;
      const sel = document.getElementById(id) as HTMLSelectElement;
      if (!sel) return;
      for (const opt of Array.from(sel.options)) {
        opt.selected = values.includes(opt.value);
      }
    };
    restoreMultiSelect("divisions", "divisions");
    restoreMultiSelect("option_major", "option_major");
    restoreMultiSelect("option_minor", "option_minor");

    const restoreChecks = (name: string) => {
      const values = params.getAll(name);
      if (!values.length) return;
      document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)
        .forEach((cb) => {
          cb.checked = values.includes(cb.value);
        });
    };
    restoreChecks("eprint_status");
    restoreChecks("thesis_type");
    restoreChecks("full_text_status");
    restoreChecks("review_status");

    const satisfyAll = params.get("satisfyall");
    if (satisfyAll) {
      const sel = document.getElementById("satisfyall") as HTMLSelectElement;
      if (sel) sel.value = satisfyAll;
    }

    if (
      qName || q || params.get("year_from") || params.get("year_to") ||
      params.getAll("divisions").length || params.getAll("thesis_type").length
    ) {
      this.runSearch();
    }
  }

  private updateURL(): void {
    const url = new URL(window.location.href);
    url.search = "";
    const p = url.searchParams;

    const qName =
      (document.getElementById("q_name") as HTMLSelectElement).value;
    const q = (document.getElementById("q") as HTMLInputElement).value.trim();
    if (qName) p.set("q_name", qName);
    if (q) p.set("q", q);

    const addNum = (id: string, key: string) => {
      const v = (document.getElementById(id) as HTMLInputElement).value.trim();
      if (v) p.set(key, v);
    };
    addNum("year_from", "year_from");
    addNum("year_to", "year_to");

    const addMultiSelect = (id: string, key: string) => {
      const sel = document.getElementById(id) as HTMLSelectElement;
      if (!sel) return;
      for (const opt of Array.from(sel.options)) {
        if (opt.selected) p.append(key, opt.value);
      }
    };
    addMultiSelect("divisions", "divisions");
    addMultiSelect("option_major", "option_major");
    addMultiSelect("option_minor", "option_minor");

    const addChecks = (name: string) => {
      document.querySelectorAll<HTMLInputElement>(
        `input[name="${name}"]:checked`,
      ).forEach((cb) => {
        p.append(name, cb.value);
      });
    };
    addChecks("eprint_status");
    addChecks("thesis_type");
    addChecks("full_text_status");
    addChecks("review_status");

    const satisfyAll =
      (document.getElementById("satisfyall") as HTMLSelectElement).value;
    p.set("satisfyall", satisfyAll);

    window.history.pushState({}, "", url);
  }

  // --- Query execution -----------------------------------------------------

  private async runSearch(): Promise<void> {
    this.updateURL();

    const satisfyAll =
      (document.getElementById("satisfyall") as HTMLSelectElement).value ===
        "ALL";
    const conditions: Array<() => Promise<ThesisRecord[]>> = [];

    // Text / ID search
    const qName =
      (document.getElementById("q_name") as HTMLSelectElement).value;
    const rawQ = (document.getElementById("q") as HTMLInputElement).value
      .trim();
    if (rawQ !== "") {
      const q = qName === "by_eprintid" ? rawQ : rawQ.replace(/\*/g, "%");
      conditions.push(() => this.fetchResults(qName, q));
    }

    // Year range
    const yearFrom = (document.getElementById("year_from") as HTMLInputElement)
      .value.trim();
    const yearTo = (document.getElementById("year_to") as HTMLInputElement)
      .value.trim();
    if (yearFrom && yearTo) {
      const yf = yearFrom, yt = yearTo;
      conditions.push(() =>
        this.fetchResults("by_year_from", yf).then((results) =>
          results.filter((r) => r.date <= parseInt(yt))
        )
      );
    } else if (yearFrom) {
      conditions.push(() => this.fetchResults("by_year_from", yearFrom));
    } else if (yearTo) {
      conditions.push(() => this.fetchResults("by_year_to", yearTo));
    }

    // Division multi-select
    const divisions = this.getSelectedValues("divisions");
    const divMerge = this.getRadioValue("divisions_merge");
    if (divisions.length > 0) {
      const q = divisions.join(",");
      if (divMerge === "ALL") {
        conditions.push(() =>
          this.fetchResults("by_division", q).then((results) =>
            results.filter((r) =>
              divisions.every((d) => (r.divisions ?? []).includes(d))
            )
          )
        );
      } else {
        conditions.push(() => this.fetchResults("by_division", q));
      }
    }

    // Option major multi-select
    const optMajor = this.getSelectedValues("option_major");
    const optMajorMerge = this.getRadioValue("option_major_merge");
    if (optMajor.length > 0) {
      const q = optMajor.join(",");
      if (optMajorMerge === "ALL") {
        conditions.push(() =>
          this.fetchResults("by_option_major", q).then((results) =>
            results.filter((r) =>
              optMajor.every((o) => (r.option_major ?? []).includes(o))
            )
          )
        );
      } else {
        conditions.push(() => this.fetchResults("by_option_major", q));
      }
    }

    // Option minor multi-select
    const optMinor = this.getSelectedValues("option_minor");
    if (optMinor.length > 0) {
      conditions.push(() =>
        this.fetchResults("by_option_minor", optMinor.join(","))
      );
    }

    // Status checkboxes
    const statusVals = this.getCheckedValues("eprint_status");
    if (statusVals.length > 0) {
      conditions.push(() =>
        this.fetchResults("by_eprint_status", statusVals.join(","))
      );
    }

    const thesisTypes = this.getCheckedValues("thesis_type");
    if (thesisTypes.length > 0) {
      conditions.push(() =>
        this.fetchResults("by_thesis_type", thesisTypes.join(","))
      );
    }

    const ftStatuses = this.getCheckedValues("full_text_status");
    if (ftStatuses.length > 0) {
      conditions.push(() =>
        this.fetchResults("by_full_text_status", ftStatuses.join(","))
      );
    }

    const reviewStatuses = this.getCheckedValues("review_status");
    if (reviewStatuses.length > 0) {
      conditions.push(() =>
        this.fetchResults("by_review_status", reviewStatuses.join(","))
      );
    }

    if (conditions.length === 0) {
      this.resultSection.innerHTML =
        `<p>Fill in at least one field and press 🔎</p>`;
      return;
    }

    this.resultSection.innerHTML =
      `<p>Searching… <span id="spinner">👓</span></p>`;

    try {
      const resultSets = await Promise.all(conditions.map((fn) => fn()));
      const combined = satisfyAll
        ? this.intersect(resultSets)
        : this.union(resultSets);
      this.renderResults(combined);
    } catch (err) {
      this.resultSection.innerHTML = `<p>Error: ${err}</p>`;
    }
  }

  private async fetchResults(
    qName: string,
    q: string,
  ): Promise<ThesisRecord[]> {
    const url = new URL(this.baseUrl);
    url.pathname = `${this.basePath}api/${this.cName}/${qName}/q`;
    url.search = new URLSearchParams({ q }).toString();
    const resp = await fetch(url.toString());
    if (!resp.ok) return [];
    return (await resp.json()) as ThesisRecord[];
  }

  // --- Result combination --------------------------------------------------

  private intersect(sets: ThesisRecord[][]): ThesisRecord[] {
    if (sets.length === 0) return [];
    if (sets.length === 1) return sets[0];
    const idSets = sets.map((s) => new Set(s.map((r) => r.eprintid)));
    const commonIds = sets[0]
      .map((r) => r.eprintid)
      .filter((id) => idSets.every((s) => s.has(id)));
    const idSet = new Set(commonIds);
    return sets[0].filter((r) => idSet.has(r.eprintid));
  }

  private union(sets: ThesisRecord[][]): ThesisRecord[] {
    const seen = new Set<number>();
    const result: ThesisRecord[] = [];
    for (const set of sets) {
      for (const r of set) {
        if (!seen.has(r.eprintid)) {
          seen.add(r.eprintid);
          result.push(r);
        }
      }
    }
    return result;
  }

  // --- Rendering -----------------------------------------------------------

  private renderResults(records: ThesisRecord[]): void {
    if (records.length === 0) {
      this.resultSection.innerHTML = `<p>No records found.</p>`;
      return;
    }

    const csvText = this.formatCSV(records);
    const downloadEl = csvToDownloadElements(
      csvText,
      `caltechthesis_${Date.now()}.csv`,
    );
    const tableHTML = this.formatTable(records);

    this.resultSection.innerHTML = `<p>${records.length} record(s) found.</p>`;
    this.resultSection.appendChild(downloadEl);
    this.resultSection.insertAdjacentHTML("beforeend", tableHTML);
  }

  private statusFlag(r: ThesisRecord): string {
    const flags: string[] = [];
    if (r.eprint_status !== "archive") flags.push(`[${r.eprint_status}]`);
    if (r.metadata_visibility !== "show") {
      flags.push(`[${r.metadata_visibility}]`);
    }
    if (r.full_text_status === "restricted") flags.push("[restricted]");
    if (r.full_text_status === "withheld") flags.push("[withheld]");
    return flags.length > 0
      ? `<em class="ts-flag">${flags.join(" ")}</em>`
      : "";
  }

  private formatTable(records: ThesisRecord[]): string {
    const rows = records.map((r) => {
      const authors = (r.creators ?? []).map((c) => `${c.family}, ${c.given}`)
        .join("; ");
      const advisors = (r.thesis_advisor ?? []).map((c) =>
        `${c.family}, ${c.given}`
      ).join("; ");
      const divs = (r.divisions ?? []).map((d) => divisionLabels[d] ?? d).join(
        "; ",
      );
      const opts = (r.option_major ?? []).map((o) => optionLabels[o] ?? o).join(
        "; ",
      );
      const flag = this.statusFlag(r);
      return `<tr>
        <td><a href="${r.link}" target="_blank">${r.eprintid}</a>${flag}</td>
        <td>${escapeHTML(r.title)}</td>
        <td>${escapeHTML(authors)}</td>
        <td>${escapeHTML(advisors)}</td>
        <td>${r.date ?? ""}</td>
        <td>${r.thesis_degree ?? ""}</td>
        <td>${escapeHTML(divs)}</td>
        <td>${escapeHTML(opts)}</td>
        <td>${r.eprint_status}</td>
      </tr>`;
    }).join("");

    return `<table border="1">
      <thead><tr>
        <th>ID</th>
        <th>Title</th>
        <th>Author(s)</th>
        <th>Advisor(s)</th>
        <th>Year</th>
        <th>Degree</th>
        <th>Division(s)</th>
        <th>Option(s)</th>
        <th>Status</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  private formatCSV(records: ThesisRecord[]): string {
    const header =
      "eprintid,link,title,authors,advisors,year,degree,divisions,option_major,eprint_status,metadata_visibility,full_text_status,review_status";
    const rows = records.map((r) => {
      const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
      const authors = (r.creators ?? []).map((c) => `${c.family}, ${c.given}`)
        .join("; ");
      const advisors = (r.thesis_advisor ?? []).map((c) =>
        `${c.family}, ${c.given}`
      ).join("; ");
      const divs = (r.divisions ?? []).join("; ");
      const opts = (r.option_major ?? []).join("; ");
      return [
        r.eprintid,
        q(r.link),
        q(r.title ?? ""),
        q(authors),
        q(advisors),
        r.date ?? "",
        q(r.thesis_degree ?? ""),
        q(divs),
        q(opts),
        q(r.eprint_status ?? ""),
        q(r.metadata_visibility ?? ""),
        q(r.full_text_status ?? ""),
        q(r.review_status ?? ""),
      ].join(",");
    }).join("\n");
    return `${header}\n${rows}`;
  }

  // --- Helpers -------------------------------------------------------------

  private getSelectedValues(id: string): string[] {
    const sel = document.getElementById(id) as HTMLSelectElement | null;
    if (!sel) return [];
    return Array.from(sel.options)
      .filter((o) => o.selected && o.value !== "")
      .map((o) => o.value);
  }

  private getCheckedValues(name: string): string[] {
    return Array.from(
      document.querySelectorAll<HTMLInputElement>(
        `input[name="${name}"]:checked`,
      ),
    ).map((cb) => cb.value);
  }

  private getRadioValue(name: string): string {
    const checked = document.querySelector<HTMLInputElement>(
      `input[name="${name}"]:checked`,
    );
    return checked ? checked.value : "ANY";
  }
}

// --- Standalone helpers ----------------------------------------------------

function escapeHTML(s: string): string {
  return s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvToDownloadElements(
  csvContent: string,
  fileName: string = "data.csv",
): HTMLElement {
  const container = document.createElement("span");
  const button = document.createElement("button");
  button.textContent = "Download CSV";
  button.addEventListener("click", () => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
  container.appendChild(button);
  return container;
}
