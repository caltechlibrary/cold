// client_api.ts
var ClientAPI = class {
  baseUrl = "../";
  constructor(baseUrl) {
    baseUrl === void 0 ? "" : this.baseUrl = baseUrl;
  }
  joinUrlPath(baseUrl, path) {
    const url = typeof baseUrl === "string" && !/^([a-z]+:)?\/\//i.test(baseUrl) ? new URL(baseUrl, window.location.href) : new URL(baseUrl);
    const normalizedPath = path.replace(/^\/+/, "");
    const combinedPath = `${url.pathname}/${normalizedPath}`.replace(/\/\/+/g, "/");
    const newUrl = new URL(url.origin + combinedPath);
    return newUrl.toString();
  }
  async getStringList(c_name, query_name, params) {
    const base_url = this.joinUrlPath(this.baseUrl, `/api/${c_name}/${query_name}`);
    let uri = base_url;
    let resp;
    if (params !== void 0) {
      uri = `${base_url}?${params}`;
    }
    try {
      resp = await fetch(uri, {
        headers: {
          "Content-Type": "application/json"
        },
        method: "GET"
      });
    } catch (err) {
      return [];
    }
    if (resp.ok) {
      const src = await resp.text();
      if (src !== void 0 && src !== "") {
        let l = [];
        try {
          l = JSON.parse(src);
        } catch (err) {
          return [];
        }
        return l;
      }
    }
    return [];
  }
  getParamNames(params) {
    return params ? Array.from(params.keys()) : [];
  }
  async getList(c_name, query_name, params) {
    const fieldList = this.getParamNames(params);
    const base_url = this.joinUrlPath(this.baseUrl, `/api/${c_name}/${query_name}`);
    let uri = base_url;
    if (fieldList.length > 0) {
      uri = `${base_url}/${fieldList.join("/")}?${params.toString()}`;
    }
    try {
      const resp = await fetch(uri, {
        headers: {
          "Content-Type": "application/json"
        },
        method: "GET"
      });
      if (!resp.ok) {
        return [];
      }
      const src = await resp.text();
      if (src !== void 0 && src !== "") {
        try {
          return JSON.parse(src);
        } catch (err) {
          return [];
        }
      }
    } catch (err) {
      console.log(`ERROR: fetching ${uri}, ${err}`);
      return [];
    }
    return [];
  }
  /**
   * getGroupsList returns an array of clgid and group names.  If list can't be retrieved
   * then an empty list is return.
   * @returns an array of objects consisting of clgid and group name.
   */
  async getGroupsList() {
    const c_name = "groups";
    const query_name = "group_names";
    return await this.getList(c_name, query_name);
  }
  /**
   * getPeopleList returns an array of clpid and group names.  If list can't be retrieved
   * then an empty list is return.
   * @returns an array of objects consisting of clgid and group name.
   */
  async getPeopleList() {
    const c_name = "people";
    const query_name = "people_names";
    return await this.getList(c_name, query_name);
  }
  async lookupGroupName(name) {
    const c_name = "groups.ds";
    const query_name = "lookup_name";
    let params = new URLSearchParams();
    params.append("q", name + "%");
    params.append("alternate", name + "%");
    return await this.getList(c_name, query_name, params);
  }
  async lookupGroupMembership(clgid) {
    const c_name = "people.ds";
    const query_name = "lookup_clgid";
    let params = new URLSearchParams();
    params.append("q", clgid);
    return await this.getList(c_name, query_name, params);
  }
  async getROR(ror) {
    const c_name = "ror.ds";
    const query_name = "get_ror";
    let params = new URLSearchParams();
    params.append("q", ror);
    return await this.getList(c_name, query_name, params);
  }
  async lookupRORByName(funder_name) {
    const c_name = "ror.ds";
    const query_name = "lookup_ror_by_name";
    let params = new URLSearchParams();
    params.append("q", funder_name);
    return await this.getList(c_name, query_name, params);
  }
  async lookupRORByAcronym(acronym) {
    const c_name = "ror.ds";
    const query_name = "lookup_ror_by_acronym";
    let params = new URLSearchParams();
    params.append("q", acronym);
    return await this.getList(c_name, query_name, params);
  }
  async lookupPeopleName(clpid) {
    const params = new URLSearchParams();
    params.append("clpid", clpid);
    return await this.getList("people.ds", "lookup_people_name", params);
  }
  async lookupPersonByClpid(clpid) {
    const params = new URLSearchParams();
    params.append("clpid", clpid);
    return await this.getList("people.ds", "lookup_person_by_clpid", params);
  }
  async validateClpid(clpid) {
    const params = new URLSearchParams();
    params.append("clpid", clpid);
    const results = await this.getList("people.ds", "validate_clpid", params);
    return results.length > 0;
  }
  async validateClgid(clgid) {
    const params = new URLSearchParams();
    params.append("clgid", clgid);
    const results = await this.getList("groups.ds", "validate_clgid", params);
    return results.length > 0;
  }
};

// thesis_search.ts
var divisionLabels = {
  "div_bbe": "Biology and Biological Engineering",
  "div_biol": "Biology",
  "div_chem": "Chemistry and Chemical Engineering",
  "div_eng": "Engineering and Applied Science",
  "div_gps": "Geological and Planetary Sciences",
  "div_hss": "Humanities and Social Sciences",
  "div_int": "Interdisciplinary Programs",
  "div_pma": "Physics, Mathematics and Astronomy"
};
var optionLabels = {
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
  "medee": "Medical and Electrical Engineering"
};
var thesisTypeLabels = {
  "phd": "Dissertation (Ph.D.)",
  "masters": "Master's thesis",
  "engd": "Engineer's thesis",
  "bachelors": "Bachelor's thesis",
  "senior_minor": "Senior thesis (Minor)",
  "senior_major": "Senior thesis (Major)",
  "other": "Other"
};
var eprintStatusLabels = {
  "archive": "Live Archive",
  "buffer": "Under Review",
  "inbox": "User Workarea",
  "deletion": "Retired"
};
var reviewStatusLabels = {
  "review": "Being reviewed",
  "correction": "Waiting for corrections",
  "gradoffice": "Sent to Grad Office",
  "go-pending": "Pending in GO \u2014 see notes",
  "notapproved": "Not Approved \u2014 see notes",
  "approved": "Approved",
  "withheld": "Approved \u2014 WITHHELD",
  "other": "Other \u2014 see Internal Notes"
};
var fullTextStatusLabels = {
  "public": "Public (worldwide)",
  "restricted": "Caltech community only",
  "mixed": "Mixed (file-level)",
  "withheld": "Withheld"
};
var ThesisSearchUI = class {
  cName = "caltechthesis.ds";
  searchElement;
  clientAPI;
  baseUrl;
  basePath = "";
  resultSection;
  constructor(options) {
    if (options.cName) this.cName = options.cName;
    this.baseUrl = new URL(options.baseUrl);
    this.basePath = this.baseUrl.pathname;
    this.clientAPI = new ClientAPI(this.baseUrl.toString());
    if (typeof options.searchElement === "string") {
      this.searchElement = document.getElementById(options.searchElement);
    } else {
      this.searchElement = options.searchElement;
    }
    this.buildForm();
    this.loadVocabularies();
    this.restoreFromURL();
  }
  // --- Form construction ----------------------------------------------------
  buildForm() {
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
    ${this.checkboxGroup("eprint_status", eprintStatusLabels, [
      "archive"
    ])}
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
  <input type="submit" value="\u{1F50E} Search">
  <input type="reset" value="\u274C Reset">
</div>

</form>
<p><section class="thesis-search-results" id="thesis-search-results"></section>`;
    this.searchElement.innerHTML = formHTML;
    this.resultSection = this.searchElement.querySelector("section");
    this.searchElement.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.runSearch();
    });
    this.searchElement.querySelector("input[type=reset]").addEventListener("click", () => {
      this.resultSection.innerHTML = "";
    });
  }
  checkboxGroup(name, labels, defaultChecked) {
    return Object.entries(labels).map(([val, label]) => {
      const checked = defaultChecked.includes(val) ? " checked" : "";
      return `<label><input type="checkbox" name="${name}" value="${val}"${checked}> ${label}</label>`;
    }).join("\n    ");
  }
  // --- Vocabulary loading ---------------------------------------------------
  async loadVocabularies() {
    const [divisions, optionsMajor, optionsMinor] = await Promise.all([
      this.clientAPI.getStringList(this.cName, "get_distinct_divisions"),
      this.clientAPI.getStringList(this.cName, "get_distinct_option_major"),
      this.clientAPI.getStringList(this.cName, "get_distinct_option_minor")
    ]);
    this.populateSelect("divisions", divisions, divisionLabels);
    this.populateSelect("option_major", optionsMajor, optionLabels);
    this.populateSelect("option_minor", optionsMinor, optionLabels);
  }
  populateSelect(id, codes, labelMap) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = codes.map((code) => {
      const label = labelMap[code] ?? code;
      return `<option value="${code}">${label}</option>`;
    }).join("");
  }
  // --- URL state -----------------------------------------------------------
  restoreFromURL() {
    const params = new URL(window.location.href).searchParams;
    const qName = params.get("q_name");
    const q = params.get("q");
    if (qName) {
      const sel = document.getElementById("q_name");
      if (sel) sel.value = qName;
    }
    if (q) {
      const inp = document.getElementById("q");
      if (inp) inp.value = q;
    }
    const setNum = (id, key) => {
      const v = params.get(key);
      if (v) document.getElementById(id).value = v;
    };
    setNum("year_from", "year_from");
    setNum("year_to", "year_to");
    const restoreMultiSelect = (id, key) => {
      const values = params.getAll(key);
      if (!values.length) return;
      const sel = document.getElementById(id);
      if (!sel) return;
      for (const opt of Array.from(sel.options)) {
        opt.selected = values.includes(opt.value);
      }
    };
    restoreMultiSelect("divisions", "divisions");
    restoreMultiSelect("option_major", "option_major");
    restoreMultiSelect("option_minor", "option_minor");
    const restoreChecks = (name) => {
      const values = params.getAll(name);
      if (!values.length) return;
      document.querySelectorAll(`input[name="${name}"]`).forEach((cb) => {
        cb.checked = values.includes(cb.value);
      });
    };
    restoreChecks("eprint_status");
    restoreChecks("thesis_type");
    restoreChecks("full_text_status");
    restoreChecks("review_status");
    const satisfyAll = params.get("satisfyall");
    if (satisfyAll) {
      const sel = document.getElementById("satisfyall");
      if (sel) sel.value = satisfyAll;
    }
    if (qName || q || params.get("year_from") || params.get("year_to") || params.getAll("divisions").length || params.getAll("thesis_type").length) {
      this.runSearch();
    }
  }
  updateURL() {
    const url = new URL(window.location.href);
    url.search = "";
    const p = url.searchParams;
    const qName = document.getElementById("q_name").value;
    const q = document.getElementById("q").value.trim();
    if (qName) p.set("q_name", qName);
    if (q) p.set("q", q);
    const addNum = (id, key) => {
      const v = document.getElementById(id).value.trim();
      if (v) p.set(key, v);
    };
    addNum("year_from", "year_from");
    addNum("year_to", "year_to");
    const addMultiSelect = (id, key) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      for (const opt of Array.from(sel.options)) {
        if (opt.selected) p.append(key, opt.value);
      }
    };
    addMultiSelect("divisions", "divisions");
    addMultiSelect("option_major", "option_major");
    addMultiSelect("option_minor", "option_minor");
    const addChecks = (name) => {
      document.querySelectorAll(`input[name="${name}"]:checked`).forEach((cb) => {
        p.append(name, cb.value);
      });
    };
    addChecks("eprint_status");
    addChecks("thesis_type");
    addChecks("full_text_status");
    addChecks("review_status");
    const satisfyAll = document.getElementById("satisfyall").value;
    p.set("satisfyall", satisfyAll);
    window.history.pushState({}, "", url);
  }
  // --- Query execution -----------------------------------------------------
  async runSearch() {
    this.updateURL();
    const satisfyAll = document.getElementById("satisfyall").value === "ALL";
    const conditions = [];
    const qName = document.getElementById("q_name").value;
    const rawQ = document.getElementById("q").value.trim();
    if (rawQ !== "") {
      const q = qName === "by_eprintid" ? rawQ : rawQ.replace(/\*/g, "%");
      conditions.push(() => this.fetchResults(qName, q));
    }
    const yearFrom = document.getElementById("year_from").value.trim();
    const yearTo = document.getElementById("year_to").value.trim();
    if (yearFrom && yearTo) {
      const yf = yearFrom, yt = yearTo;
      conditions.push(() => this.fetchResults("by_year_from", yf).then((results) => results.filter((r) => r.date <= parseInt(yt))));
    } else if (yearFrom) {
      conditions.push(() => this.fetchResults("by_year_from", yearFrom));
    } else if (yearTo) {
      conditions.push(() => this.fetchResults("by_year_to", yearTo));
    }
    const divisions = this.getSelectedValues("divisions");
    const divMerge = this.getRadioValue("divisions_merge");
    if (divisions.length > 0) {
      const q = divisions.join(",");
      if (divMerge === "ALL") {
        conditions.push(() => this.fetchResults("by_division", q).then((results) => results.filter((r) => divisions.every((d) => (r.divisions ?? []).includes(d)))));
      } else {
        conditions.push(() => this.fetchResults("by_division", q));
      }
    }
    const optMajor = this.getSelectedValues("option_major");
    const optMajorMerge = this.getRadioValue("option_major_merge");
    if (optMajor.length > 0) {
      const q = optMajor.join(",");
      if (optMajorMerge === "ALL") {
        conditions.push(() => this.fetchResults("by_option_major", q).then((results) => results.filter((r) => optMajor.every((o) => (r.option_major ?? []).includes(o)))));
      } else {
        conditions.push(() => this.fetchResults("by_option_major", q));
      }
    }
    const optMinor = this.getSelectedValues("option_minor");
    if (optMinor.length > 0) {
      conditions.push(() => this.fetchResults("by_option_minor", optMinor.join(",")));
    }
    const statusVals = this.getCheckedValues("eprint_status");
    if (statusVals.length > 0) {
      conditions.push(() => this.fetchResults("by_eprint_status", statusVals.join(",")));
    }
    const thesisTypes = this.getCheckedValues("thesis_type");
    if (thesisTypes.length > 0) {
      conditions.push(() => this.fetchResults("by_thesis_type", thesisTypes.join(",")));
    }
    const ftStatuses = this.getCheckedValues("full_text_status");
    if (ftStatuses.length > 0) {
      conditions.push(() => this.fetchResults("by_full_text_status", ftStatuses.join(",")));
    }
    const reviewStatuses = this.getCheckedValues("review_status");
    if (reviewStatuses.length > 0) {
      conditions.push(() => this.fetchResults("by_review_status", reviewStatuses.join(",")));
    }
    if (conditions.length === 0) {
      this.resultSection.innerHTML = `<p>Fill in at least one field and press \u{1F50E}</p>`;
      return;
    }
    this.resultSection.innerHTML = `<p>Searching\u2026 <span id="spinner">\u{1F453}</span></p>`;
    try {
      const resultSets = await Promise.all(conditions.map((fn) => fn()));
      const combined = satisfyAll ? this.intersect(resultSets) : this.union(resultSets);
      this.renderResults(combined);
    } catch (err) {
      this.resultSection.innerHTML = `<p>Error: ${err}</p>`;
    }
  }
  async fetchResults(qName, q) {
    const url = new URL(this.baseUrl);
    url.pathname = `${this.basePath}api/${this.cName}/${qName}/q`;
    url.search = new URLSearchParams({
      q
    }).toString();
    const resp = await fetch(url.toString());
    if (!resp.ok) return [];
    return await resp.json();
  }
  // --- Result combination --------------------------------------------------
  intersect(sets) {
    if (sets.length === 0) return [];
    if (sets.length === 1) return sets[0];
    const idSets = sets.map((s) => new Set(s.map((r) => r.eprintid)));
    const commonIds = sets[0].map((r) => r.eprintid).filter((id) => idSets.every((s) => s.has(id)));
    const idSet = new Set(commonIds);
    return sets[0].filter((r) => idSet.has(r.eprintid));
  }
  union(sets) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
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
  renderResults(records) {
    if (records.length === 0) {
      this.resultSection.innerHTML = `<p>No records found.</p>`;
      return;
    }
    const csvText = this.formatCSV(records);
    const downloadEl = csvToDownloadElements(csvText, `caltechthesis_${Date.now()}.csv`);
    const tableHTML = this.formatTable(records);
    this.resultSection.innerHTML = `<p>${records.length} record(s) found.</p>`;
    this.resultSection.appendChild(downloadEl);
    this.resultSection.insertAdjacentHTML("beforeend", tableHTML);
  }
  statusFlag(r) {
    const flags = [];
    if (r.eprint_status !== "archive") flags.push(`[${r.eprint_status}]`);
    if (r.metadata_visibility !== "show") flags.push(`[${r.metadata_visibility}]`);
    if (r.full_text_status === "restricted") flags.push("[restricted]");
    if (r.full_text_status === "withheld") flags.push("[withheld]");
    return flags.length > 0 ? `<em class="ts-flag">${flags.join(" ")}</em>` : "";
  }
  formatTable(records) {
    const rows = records.map((r) => {
      const authors = (r.creators ?? []).map((c) => `${c.family}, ${c.given}`).join("; ");
      const advisors = (r.thesis_advisor ?? []).map((c) => `${c.family}, ${c.given}`).join("; ");
      const divs = (r.divisions ?? []).map((d) => divisionLabels[d] ?? d).join("; ");
      const opts = (r.option_major ?? []).map((o) => optionLabels[o] ?? o).join("; ");
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
  formatCSV(records) {
    const header = "eprintid,link,title,authors,advisors,year,degree,divisions,option_major,eprint_status,metadata_visibility,full_text_status,review_status";
    const rows = records.map((r) => {
      const q = (s) => `"${s.replace(/"/g, '""')}"`;
      const authors = (r.creators ?? []).map((c) => `${c.family}, ${c.given}`).join("; ");
      const advisors = (r.thesis_advisor ?? []).map((c) => `${c.family}, ${c.given}`).join("; ");
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
        q(r.review_status ?? "")
      ].join(",");
    }).join("\n");
    return `${header}
${rows}`;
  }
  // --- Helpers -------------------------------------------------------------
  getSelectedValues(id) {
    const sel = document.getElementById(id);
    if (!sel) return [];
    return Array.from(sel.options).filter((o) => o.selected && o.value !== "").map((o) => o.value);
  }
  getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((cb) => cb.value);
  }
  getRadioValue(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : "ANY";
  }
};
function escapeHTML(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function csvToDownloadElements(csvContent, fileName = "data.csv") {
  const container = document.createElement("span");
  const button = document.createElement("button");
  button.textContent = "Download CSV";
  button.addEventListener("click", () => {
    const blob = new Blob([
      csvContent
    ], {
      type: "text/csv;charset=utf-8;"
    });
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
export {
  ThesisSearchUI
};
