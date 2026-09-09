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
var dateTypeLabels = {
  "published": "Publication",
  "submitted": "Submission for publication",
  "completed": "Completion",
  "degree": "Degree Awarded"
};
var isPublishedLabels = {
  "pub": "Published",
  "inpress": "In Press",
  "submitted": "Submitted",
  "unpub": "Unpublished"
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

<div class="ts-fields">
  <div class="ts-field-row">
    <label for="q_title">Title:</label>
    <input id="q_title" name="q_title" type="search" size="45" placeholder="use * as wildcard">
  </div>
  <div class="ts-field-row">
    <label for="q_alt_title">Alternate Title:</label>
    <input id="q_alt_title" name="q_alt_title" type="search" size="45" placeholder="use * as wildcard">
  </div>
  <div class="ts-field-row">
    <label for="q_author">Authors:</label>
    <input id="q_author" name="q_author" type="search" size="45" placeholder="use * as wildcard">
  </div>
  <div class="ts-field-row">
    <label for="q_orcid">ORCID:</label>
    <input id="q_orcid" name="q_orcid" type="search" size="45" placeholder="use * as wildcard">
  </div>
  <div class="ts-field-row">
    <label for="q_abstract">Abstract:</label>
    <input id="q_abstract" name="q_abstract" type="search" size="45" placeholder="use * as wildcard">
  </div>
  <div class="ts-field-row">
    <label for="q_eprintid">Item ID:</label>
    <input id="q_eprintid" name="q_eprintid" type="text" size="9">
  </div>
  <div class="ts-field-row">
    <label for="q_doi">DOI:</label>
    <input id="q_doi" name="q_doi" type="search" size="45" placeholder="use * as wildcard">
  </div>
  <div class="ts-field-row">
    <label for="q_username">Username:</label>
    <input id="q_username" name="q_username" type="search" size="45">
  </div>
  <div class="ts-field-row">
    <label for="q_depositor_name">Name:</label>
    <input id="q_depositor_name" name="q_depositor_name" type="search" size="45" placeholder="use * as wildcard">
  </div>
</div>

<div class="ts-checks-row">
  <fieldset>
    <legend>Item Status</legend>
    ${this.checkboxGroup("eprint_status", eprintStatusLabels, [
      "buffer",
      "archive"
    ])}
  </fieldset>
</div>

<div class="ts-fields">
  <div class="ts-field-row">
    <label for="q_reviewer">Reviewer:</label>
    <input id="q_reviewer" name="q_reviewer" type="search" size="45" placeholder="use * as wildcard">
  </div>
</div>

<div class="ts-checks-row">
  <fieldset>
    <legend>Review Status</legend>
    ${this.checkboxGroup("review_status", reviewStatusLabels, [])}
  </fieldset>

  <fieldset>
    <legend>Thesis Availability</legend>
    ${this.checkboxGroup("full_text_status", fullTextStatusLabels, [])}
  </fieldset>

  <fieldset>
    <legend>Status</legend>
    ${this.checkboxGroup("ispublished", isPublishedLabels, [])}
  </fieldset>
</div>

<div class="ts-year-row">
  <label>Degree Date (Year Only):</label>
  From <input type="number" id="year_from" name="year_from" size="6" min="1900" max="2100">
  to   <input type="number" id="year_to"   name="year_to"   size="6" min="1900" max="2100">
</div>

<div class="ts-checks-row">
  <fieldset>
    <legend>Date Type</legend>
    ${this.checkboxGroup("date_type", dateTypeLabels, [])}
  </fieldset>
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
    <label class="ts-merge-label">
      <input type="radio" name="option_minor_merge" value="ALL"> All of these
    </label>
  </fieldset>
</div>

<div class="ts-checks-row">
  <fieldset>
    <legend>Thesis Type</legend>
    ${this.checkboxGroup("thesis_type", thesisTypeLabels, [])}
  </fieldset>
</div>

<div class="ts-fields">
  <div class="ts-field-row">
    <label for="q_advisor">Advisor Name:</label>
    <input id="q_advisor" name="q_advisor" type="search" size="45" placeholder="use * as wildcard">
  </div>
  <div class="ts-field-row">
    <label for="q_committee">Committee Member Name:</label>
    <input id="q_committee" name="q_committee" type="search" size="45" placeholder="use * as wildcard">
  </div>
  <div class="ts-field-row">
    <label for="q_funder_agency">Funding Agency:</label>
    <input id="q_funder_agency" name="q_funder_agency" type="search" size="45" placeholder="use * as wildcard">
  </div>
  <div class="ts-field-row">
    <label for="q_grant_number">Grant Number:</label>
    <input id="q_grant_number" name="q_grant_number" type="search" size="45" placeholder="use * as wildcard">
  </div>
  <div class="ts-field-row">
    <label for="q_group">Group:</label>
    <input id="q_group" name="q_group" type="search" size="45"
           list="q_group_list" placeholder="type to filter groups">
    <datalist id="q_group_list"></datalist>
  </div>
  <div class="ts-field-row">
    <label for="q_other_numbering_name">Other Numbering System Name:</label>
    <input id="q_other_numbering_name" name="q_other_numbering_name" type="search" size="45" placeholder="use * as wildcard">
  </div>
  <div class="ts-field-row">
    <label for="q_other_numbering_id">Other Numbering System ID:</label>
    <input id="q_other_numbering_id" name="q_other_numbering_id" type="search" size="45" placeholder="use * as wildcard">
  </div>
</div>

<div class="ts-buttons-row">
  <label>Retrieved records must fulfil:
    <select id="satisfyall" name="satisfyall">
      <option value="ALL" selected>all of these conditions</option>
      <option value="ANY">any of these conditions</option>
    </select>
  </label>
  <label>Order:
    <select id="order" name="order">
      <option value="date/creators_name/title">by year (oldest first)</option>
      <option value="-date/creators_name/title" selected>by year (most recent first)</option>
      <option value="title/creators_name/-date">by title</option>
      <option value="creators_name/-date/title">by author's name</option>
    </select>
  </label>
  <input type="submit" value="Search">
  <input type="reset" value="Reset">
</div>

</form>
<section class="thesis-search-results" id="thesis-search-results"></section>`;
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
    const [divisions, optionsMajor, optionsMinor, localGroups] = await Promise.all([
      this.clientAPI.getStringList(this.cName, "get_distinct_divisions"),
      this.clientAPI.getStringList(this.cName, "get_distinct_option_major"),
      this.clientAPI.getStringList(this.cName, "get_distinct_option_minor"),
      this.clientAPI.getStringList(this.cName, "get_distinct_local_group")
    ]);
    this.populateSelect("divisions", divisions, divisionLabels);
    this.populateSelect("option_major", optionsMajor, optionLabels);
    this.populateSelect("option_minor", optionsMinor, optionLabels);
    this.populateDatalist("q_group_list", localGroups);
  }
  populateSelect(id, codes, labelMap) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = codes.map((code) => {
      const label = labelMap[code] ?? code;
      return `<option value="${code}">${label}</option>`;
    }).join("");
  }
  populateDatalist(id, values) {
    const dl = document.getElementById(id);
    if (!dl) return;
    dl.innerHTML = values.map((v) => `<option value="${escapeHTML(v)}">`).join("");
  }
  // --- URL state -----------------------------------------------------------
  restoreFromURL() {
    const params = new URL(window.location.href).searchParams;
    const textFieldIds = [
      "q_title",
      "q_alt_title",
      "q_author",
      "q_orcid",
      "q_abstract",
      "q_eprintid",
      "q_doi",
      "q_username",
      "q_depositor_name",
      "q_reviewer",
      "q_advisor",
      "q_committee",
      "q_funder_agency",
      "q_grant_number",
      "q_group",
      "q_other_numbering_name",
      "q_other_numbering_id"
    ];
    for (const id of textFieldIds) {
      const v = params.get(id);
      if (v) document.getElementById(id).value = v;
    }
    const setNum = (id) => {
      const v = params.get(id);
      if (v) document.getElementById(id).value = v;
    };
    setNum("year_from");
    setNum("year_to");
    const restoreMultiSelect = (id) => {
      const values = params.getAll(id);
      if (!values.length) return;
      const sel = document.getElementById(id);
      if (!sel) return;
      for (const opt of Array.from(sel.options)) {
        opt.selected = values.includes(opt.value);
      }
    };
    restoreMultiSelect("divisions");
    restoreMultiSelect("option_major");
    restoreMultiSelect("option_minor");
    const isSearchState = params.has("satisfyall");
    const restoreChecks = (name) => {
      const values = params.getAll(name);
      if (!values.length) {
        if (!isSearchState) return;
        document.querySelectorAll(`input[name="${name}"]`).forEach((cb) => {
          cb.checked = false;
        });
        return;
      }
      document.querySelectorAll(`input[name="${name}"]`).forEach((cb) => {
        cb.checked = values.includes(cb.value);
      });
    };
    restoreChecks("eprint_status");
    restoreChecks("thesis_type");
    restoreChecks("full_text_status");
    restoreChecks("review_status");
    restoreChecks("date_type");
    restoreChecks("ispublished");
    const satisfyAll = params.get("satisfyall");
    if (satisfyAll) {
      const sel = document.getElementById("satisfyall");
      if (sel) sel.value = satisfyAll;
    }
    const order = params.get("order");
    if (order) {
      const sel = document.getElementById("order");
      if (sel) sel.value = order;
    }
    const anyText = textFieldIds.some((id) => params.get(id));
    if (anyText || params.get("year_from") || params.get("year_to") || params.getAll("divisions").length || params.getAll("thesis_type").length || params.getAll("date_type").length || params.getAll("ispublished").length) {
      this.runSearch();
    }
  }
  updateURL() {
    const url = new URL(window.location.href);
    url.search = "";
    const p = url.searchParams;
    const textFieldIds = [
      "q_title",
      "q_alt_title",
      "q_author",
      "q_orcid",
      "q_abstract",
      "q_eprintid",
      "q_doi",
      "q_username",
      "q_depositor_name",
      "q_reviewer",
      "q_advisor",
      "q_committee",
      "q_funder_agency",
      "q_grant_number",
      "q_group",
      "q_other_numbering_name",
      "q_other_numbering_id"
    ];
    for (const id of textFieldIds) {
      const v = document.getElementById(id).value.trim();
      if (v) p.set(id, v);
    }
    const addNum = (id) => {
      const v = document.getElementById(id).value.trim();
      if (v) p.set(id, v);
    };
    addNum("year_from");
    addNum("year_to");
    const addMultiSelect = (id) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      for (const opt of Array.from(sel.options)) {
        if (opt.selected) p.append(id, opt.value);
      }
    };
    addMultiSelect("divisions");
    addMultiSelect("option_major");
    addMultiSelect("option_minor");
    const addChecks = (name) => {
      document.querySelectorAll(`input[name="${name}"]:checked`).forEach((cb) => {
        p.append(name, cb.value);
      });
    };
    addChecks("eprint_status");
    addChecks("thesis_type");
    addChecks("full_text_status");
    addChecks("review_status");
    addChecks("date_type");
    addChecks("ispublished");
    const satisfyAll = document.getElementById("satisfyall").value;
    p.set("satisfyall", satisfyAll);
    const order = document.getElementById("order").value;
    p.set("order", order);
    window.history.pushState({}, "", url);
  }
  // --- Query execution -----------------------------------------------------
  async runSearch() {
    this.updateURL();
    const satisfyAll = document.getElementById("satisfyall").value === "ALL";
    const conditions = [];
    const textFields = [
      {
        id: "q_title",
        query: "by_title"
      },
      {
        id: "q_alt_title",
        query: "by_alt_title"
      },
      {
        id: "q_author",
        query: "by_author"
      },
      {
        id: "q_orcid",
        query: "by_orcid"
      },
      {
        id: "q_abstract",
        query: "by_abstract"
      },
      {
        id: "q_doi",
        query: "by_doi"
      },
      {
        id: "q_username",
        query: "by_depositor_username"
      },
      {
        id: "q_depositor_name",
        query: "by_depositor_name"
      },
      {
        id: "q_reviewer",
        query: "by_reviewer"
      },
      {
        id: "q_advisor",
        query: "by_advisor"
      },
      {
        id: "q_committee",
        query: "by_committee"
      },
      {
        id: "q_funder_agency",
        query: "by_funder_agency"
      },
      {
        id: "q_grant_number",
        query: "by_grant_number"
      },
      {
        id: "q_group",
        query: "by_local_group"
      },
      {
        id: "q_other_numbering_name",
        query: "by_other_numbering_name"
      },
      {
        id: "q_other_numbering_id",
        query: "by_other_numbering_id"
      }
    ];
    for (const { id, query } of textFields) {
      const val = document.getElementById(id).value.trim();
      if (val) {
        const q = val.replace(/\*/g, "%");
        conditions.push(() => this.fetchResults(query, q));
      }
    }
    const eprintidVal = document.getElementById("q_eprintid").value.trim();
    if (eprintidVal) {
      conditions.push(() => this.fetchResults("by_eprintid", eprintidVal));
    }
    const yearFrom = document.getElementById("year_from").value.trim();
    const yearTo = document.getElementById("year_to").value.trim();
    if (yearFrom && yearTo) {
      conditions.push(() => this.fetchResults2("by_year_range", yearFrom, yearTo));
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
    const optMinorMerge = this.getRadioValue("option_minor_merge");
    if (optMinor.length > 0) {
      const q = optMinor.join(",");
      if (optMinorMerge === "ALL") {
        conditions.push(() => this.fetchResults("by_option_minor", q).then((results) => results.filter((r) => optMinor.every((o) => (r.option_minor ?? []).includes(o)))));
      } else {
        conditions.push(() => this.fetchResults("by_option_minor", q));
      }
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
    const dateTypes = this.getCheckedValues("date_type");
    if (dateTypes.length > 0) {
      conditions.push(() => this.fetchResults("by_date_type", dateTypes.join(",")));
    }
    const pubStatuses = this.getCheckedValues("ispublished");
    if (pubStatuses.length > 0) {
      conditions.push(() => this.fetchResults("by_ispublished", pubStatuses.join(",")));
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
  async fetchResults2(qName, q1, q2) {
    const url = new URL(this.baseUrl);
    url.pathname = `${this.basePath}api/${this.cName}/${qName}/q1/q2`;
    url.search = new URLSearchParams({
      q1,
      q2
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
  sortResults(records, order) {
    const r = [
      ...records
    ];
    switch (order) {
      case "date/creators_name/title":
        return r.sort((a, b) => (a.date ?? 0) - (b.date ?? 0) || (a.creator_names_idx ?? "").localeCompare(b.creator_names_idx ?? "") || (a.title ?? "").localeCompare(b.title ?? ""));
      case "title/creators_name/-date":
        return r.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "") || (a.creator_names_idx ?? "").localeCompare(b.creator_names_idx ?? "") || (b.date ?? 0) - (a.date ?? 0));
      case "creators_name/-date/title":
        return r.sort((a, b) => (a.creator_names_idx ?? "").localeCompare(b.creator_names_idx ?? "") || (b.date ?? 0) - (a.date ?? 0) || (a.title ?? "").localeCompare(b.title ?? ""));
      default:
        return r.sort((a, b) => (b.date ?? 0) - (a.date ?? 0) || (a.creator_names_idx ?? "").localeCompare(b.creator_names_idx ?? "") || (a.title ?? "").localeCompare(b.title ?? ""));
    }
  }
  // --- Rendering -----------------------------------------------------------
  renderResults(records) {
    if (records.length === 0) {
      this.resultSection.innerHTML = `<p>No records found.</p>`;
      return;
    }
    const order = document.getElementById("order").value;
    const sorted = this.sortResults(records, order);
    const csvText = this.formatCSV(sorted);
    const downloadEl = csvToDownloadElements(csvText, `caltechthesis_${Date.now()}.csv`);
    const tableHTML = this.formatTable(sorted);
    this.resultSection.innerHTML = `<p>${sorted.length} record(s) found.</p>`;
    this.resultSection.appendChild(downloadEl);
    this.resultSection.insertAdjacentHTML("beforeend", tableHTML);
  }
  statusFlag(r) {
    const flags = [];
    if (r.eprint_status !== "archive") flags.push(`[${r.eprint_status}]`);
    if (r.metadata_visibility !== "show") {
      flags.push(`[${r.metadata_visibility}]`);
    }
    if (r.full_text_status === "restricted") flags.push("[restricted]");
    if (r.full_text_status === "withheld") flags.push("[withheld]");
    return flags.length > 0 ? `<em class="ts-flag">${flags.join(" ")}</em>` : "";
  }
  formatTable(records) {
    const rows = records.map((r) => {
      const authors = (r.creators ?? []).map((c) => `${c.family}, ${c.given}`).join("; ");
      const advisors = (r.thesis_advisor ?? []).map((c) => `${c.family}, ${c.given}`).join("; ");
      const committee = (r.thesis_committee ?? []).map((c) => `${c.family}, ${c.given}`).join("; ");
      const divs = (r.divisions ?? []).map((d) => divisionLabels[d] ?? d).join("; ");
      const opts = (r.option_major ?? []).map((o) => optionLabels[o] ?? o).join("; ");
      const flag = this.statusFlag(r);
      return `<tr>
        <td><a href="${r.link}" target="_blank">${r.eprintid}</a>${flag}</td>
        <td>${escapeHTML(r.title)}</td>
        <td>${escapeHTML(authors)}</td>
        <td>${escapeHTML(advisors)}</td>
        <td>${escapeHTML(committee)}</td>
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
        <th>Committee</th>
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
    const header = "eprintid,link,title,authors,advisors,committee,year,degree,divisions,option_major,eprint_status,metadata_visibility,full_text_status,review_status";
    const rows = records.map((r) => {
      const q = (s) => `"${s.replace(/"/g, '""')}"`;
      const authors = (r.creators ?? []).map((c) => `${c.family}, ${c.given}`).join("; ");
      const advisors = (r.thesis_advisor ?? []).map((c) => `${c.family}, ${c.given}`).join("; ");
      const committee = (r.thesis_committee ?? []).map((c) => `${c.family}, ${c.given}`).join("; ");
      const divs = (r.divisions ?? []).join("; ");
      const opts = (r.option_major ?? []).join("; ");
      return [
        r.eprintid,
        q(r.link),
        q(r.title ?? ""),
        q(authors),
        q(advisors),
        q(committee),
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
