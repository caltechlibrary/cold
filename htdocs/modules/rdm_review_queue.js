// client_api.ts
var ClientAPI = class {
  baseUrl = "../";
  constructor(baseUrl) {
    baseUrl === void 0 ? "" : this.baseUrl = baseUrl;
  }
  joinUrlPath(baseUrl, path) {
    const url = typeof baseUrl === "string" && !/^([a-z]+:)?\/\//i.test(baseUrl) ? new URL(baseUrl, window.location.origin) : new URL(baseUrl);
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
      console.log(`DEBUG updated uri updated -> ${uri}`);
    }
    try {
      const resp = await fetch(uri, {
        headers: {
          "Content-Type": "application/json"
        },
        method: "GET"
      });
      if (!resp.ok) {
        console.log(`DEBUG fetch failed: ${resp.status} ${resp.statusText}, URL: ${uri}`);
        return [];
      }
      console.log(`DEBUG resp -> ${resp.status} -> ${resp.statusText}, URL: ${uri}`);
      const src = await resp.text();
      if (src !== void 0 && src !== "") {
        console.log(`DEBUG src -> ${src}`);
        try {
          return JSON.parse(src);
        } catch (err) {
          console.log(`DEBUG error parsing JSON: ${err}, response: ${src}`);
          return [];
        }
      } else {
        console.log(`DEBUG why is the source empty? ${src}`);
      }
    } catch (err) {
      console.log(`DEBUG error in fetching ${uri}, ${err}`);
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
    params.append("q", name);
    params.append("alternate", name);
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
};

// rdm_review_queue.ts
var RdmReviewQueueUI = class {
  cName = "rdm_review_queue.ds";
  searchElement;
  querySelect;
  queryInput;
  buttonSubmit;
  buttonClear;
  resultSection;
  baseUrl;
  basePath = "";
  clientAPI;
  // This adds auto complete for clpid and clgid reports
  autocompleteResults = [];
  selectedReportType = null;
  constructor(options) {
    options.cName === void 0 ? "rdm_review_queue.ds" : this.cName = options.cName;
    typeof options.searchElement === "string" ? this.searchElement = document.getElementById(options.searchElement) : this.searchElement = options.searchElement;
    this.baseUrl = new URL(options.baseUrl);
    this.basePath = this.baseUrl.pathname;
    this.clientAPI = new ClientAPI(this.baseUrl.toString());
    const formHTML = `<form method="get">
    <label set="query_name">Search</label> <select name="q_name" id="q_name">
      <hr />
      <optgroup label="Review Queue Only">
        <option value="review_queue_by_name" title="review queue by name">by name</option>
        <option value="review_queue_by_clpid" title="review queue by clpid">by clpid</option>
        <option value="review_queue_by_orcid" title"review queue by orcid">by orcid</option>
        <option value="review_queue_by_clgid" title="review queue by clgid">by clgid (group identifier)</option>
        <option value="review_queue_mentions" title="review queue search by @tag">by @tags</option>
      </optgroup>
      <hr />
      <optgroup label="All Records">
        <option value="by_name" title="all records by name">all records by name</option>
        <option value="by_clpid" title="all records by clpid">all records by clpid</option>
        <option value="by_orcid" title="all records by orcid">all records by orcid</option>
        <option value="by_clgid" title="all records by clgid">all records by clgid (group identifier)</option>
      </optgroup>
    </select> <input id="q" name="q" type="search"
                  list="autocomplete-container"
                  placeholder="use '*' as a wild card with names and @tag for at tags" value="" size="40"
                  title="use '*' as a wild card with names and @tag for at tags">
    <input type="submit" value="\u{1F50E}">
    <input type="reset" value="\u274C">
    <datalist id="autocomplete-container"></datalist>
</form><p><section class="rdm-review-queue-search-results" id="rdm-review-queue-results"></section>`;
    this.searchElement.innerHTML = formHTML;
    this.querySelect = this.searchElement.querySelector("select");
    this.queryInput = this.searchElement.querySelector("input[type=search]");
    this.buttonSubmit = this.searchElement.querySelector("input[type=submit]");
    this.buttonClear = this.searchElement.querySelector("input[type=reset]");
    this.resultSection = this.searchElement.querySelector("section");
    const u = URL.parse(window.location.href);
    const params = u.searchParams;
    const q_name = params.get("q_name") ?? "";
    const q = params.get("q") ?? "";
    this.setSelectOption(q_name);
    if (q !== "") {
      this.queryInput.value = q;
    }
    if (q_name !== "") {
      this.setupQuery(q_name, q);
    }
    this.searchElement.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const q_name2 = this.querySelect.value;
      const q2 = this.queryInput.value.trim();
      this.updateURL(q_name2, q2);
      this.setupQuery(q_name2, q2);
    });
    this.buttonClear.addEventListener("click", () => {
      this.resultSection.innerText = `select search type, enter search term and press \u{1F50E}`;
    });
    this.querySelect.addEventListener("change", (e) => this.onReportTypeChange(e));
  }
  async get_all_clpid() {
    return this.clientAPI.getStringList("people.ds", "get_all_clpid");
  }
  async get_all_clgid() {
    return this.clientAPI.getStringList("groups.ds", "get_all_clgid");
  }
  // fetchAutocompleteResults supports auto complete with clpid and clgid
  async fetchAutocompleteResults(reportType) {
    switch (reportType) {
      case "review_queue_by_clpid":
        return await this.get_all_clpid();
      case "by_clpid":
        return await this.get_all_clpid();
      case "review_queue_by_clgid":
        return await this.get_all_clgid();
      case "by_clgid":
        return await this.get_all_clgid();
      default:
        return [];
    }
  }
  // Handle report selection change
  async onReportTypeChange(event) {
    const selectElement = event.target;
    this.selectedReportType = selectElement.value;
    if (this.selectedReportType) {
      this.autocompleteResults = await this.fetchAutocompleteResults(this.selectedReportType);
      this.renderAutocompleteOptions();
    }
  }
  // renderAutocompleteOptions this populates the autocomplete for clpid or clgid, otherwise
  // it set the autocomplete data element to empty.
  renderAutocompleteOptions() {
    const dataListElement = document.getElementById("autocomplete-container");
    if (!dataListElement) return;
    dataListElement.innerHTML = "";
    for (let val of this.autocompleteResults) {
      const optElem = document.createElement("option");
      optElem.value = val;
      dataListElement.appendChild(optElem);
    }
  }
  updateURL(q_name, q) {
    const newUrl = new URL(window.location.href);
    newUrl.search = new URLSearchParams({
      q_name,
      q
    }).toString();
    window.history.pushState({}, "", newUrl);
  }
  setSelectOption(q_name) {
    if (q_name !== "") {
      Array.from(this.querySelect).forEach((option) => {
        option.removeAttribute("selected");
      });
      this.querySelect.value = q_name;
    }
  }
  genDownloadName(q_name, q, ext) {
    switch (q_name) {
      case "by_name":
        if (q === "*") {
          return `all_records_${q_name}${ext}`;
        }
        return `${stripNonAlphanumericUTF8(q)}_${q_name}${ext}`;
      case "review_queue_by_name":
        if (q === "*") {
          return `all_{q_name}${ext}`;
        }
        return `${stripNonAlphanumericUTF8(q)}_${q_name}${ext}`;
      case "review_queue_mentions":
        return `at_${stripNonAlphanumericUTF8(q)}_${q_name}${ext}`;
      default:
        return `${q}_${q_name}${ext}`;
    }
  }
  async setupQuery(q_name, q) {
    if (q_name === "" || q === "") {
      this.resultSection.innerText = `select search type, enter search term and press \u{1F50E}`;
      return;
    }
    if (q_name === "by_name" && q === "*") {
      this.resultSection.innerText = `Cannot complete search for all record by name using '${q}', too many results, enter revised search term and press \u{1F50E}`;
      return;
    }
    const selectedOption = this.querySelect.options[this.querySelect.selectedIndex];
    let query_label;
    selectedOption === void 0 || selectedOption.innerText === void 0 ? query_label = "" : query_label = selectedOption.innerText;
    if (q_name.startsWith("review_queue")) {
      query_label = `review queue ${query_label}`;
    } else {
      query_label = `all records ${query_label}`;
    }
    this.resultSection.innerHTML = `Searching ${query_label} for <em>"${q}"</em> <span id="spinner">\u{1F453}</span>`;
    let query = q.indexOf("*") > -1 ? q.replace(/\*/g, "%") : q;
    if (q_name === "review_queue_mentions") {
      if (!query.startsWith("@")) {
        query = `@${query}`;
      }
      query = `%${query}%`;
    }
    try {
      const results = await this.fetchResults(q_name, query);
      this.resultSection.innerHTML = `${results.length}  items found, ${query_label} <em>"${q}"</em>`;
      if (results.length > 0) {
        const tableText = formatJsonAsHtmlTable(q_name, query, results);
        const csvText = formatJsonAsCSV(q_name, query, results);
        const downloadName = this.genDownloadName(q_name, query, ".csv");
        const download = csvToDownloadElements(csvText, downloadName);
        this.resultSection.appendChild(download);
        this.resultSection.appendChild(document.createElement("p"));
        this.resultSection.insertAdjacentHTML("beforeend", tableText);
      }
    } catch (error) {
      this.resultSection.innerHTML = `Error: ${q_name}(${query}) ${error}`;
    }
  }
  async fetchResults(q_name, q) {
    const url = new URL(this.baseUrl);
    url.pathname = `${this.basePath}api/${this.cName}/${q_name}/q`;
    url.search = new URLSearchParams({
      q
    }).toString();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }
};
function extractOrcidByClpid(items, targetClpid) {
  for (const item of items) {
    const identifiers = item.person_or_org.identifiers || [];
    const clpidObj = identifiers.find((id) => id.scheme === "clpid");
    const orcidObj = identifiers.find((id) => id.scheme === "orcid");
    if (clpidObj && clpidObj.identifier === targetClpid) {
      return orcidObj?.identifier || "";
    }
  }
  return "";
}
function extractClpidByOrcid(items, targetOrcid) {
  for (const item of items) {
    const identifiers = item.person_or_org.identifiers || [];
    const orcidObj = identifiers.find((id) => id.scheme === "orcid");
    const clpidObj = identifiers.find((id) => id.scheme === "clpid");
    if (orcidObj && orcidObj.identifier === targetOrcid) {
      return clpidObj?.identifier || "";
    }
  }
  return "";
}
function extractClpidByName(items, q_name) {
  const clpidList = [];
  const re = new RegExp(q_name);
  for (const item of items) {
    const identifiers = item.person_or_org.identifiers || [];
    const clpidObj = identifiers.find((id) => id.scheme === "clpid");
    if (clpidObj !== void 0 && item.person_or_org.name !== void 0 && re.test(item.person_or_org.name)) {
      clpidList.push(clpidObj.identifier);
    }
  }
  return clpidList.join(", ");
}
function extractOrcidByName(items, q_name) {
  const orcidList = [];
  const re = new RegExp(q_name);
  for (const item of items) {
    const identifiers = item.person_or_org.identifiers || [];
    const orcidObj = identifiers.find((id) => id.scheme === "orcid");
    if (orcidObj !== void 0 && item.person_or_org.name !== void 0 && re.test(item.person_or_org.name)) {
      orcidList.push(orcidObj.identifier);
    }
  }
  return orcidList.join(", ");
}
function extractAndSortMentions(comments) {
  if (!comments) {
    return [];
  }
  const mentions = comments.flatMap((comment) => (
    // Match all @mentions (including Unicode letters/numbers)
    [
      ...comment.content.matchAll(/@[\p{L}\p{N}_]+/gu)
    ].map((match) => match[0])
  ));
  return [
    ...new Set(mentions)
  ].sort();
}
function normalizeItem(q_name, q, item) {
  let groups = "";
  let journal_title = "";
  item.custom_fields["caltech:groups"] === void 0 ? item.groups = "" : item.groups = item.custom_fields["caltech:groups"].map((g) => g.id).join("; ");
  item.custom_fields["journal:journal"] === void 0 ? item.journal_title = "" : item.journal_title = item.custom_fields["journal:journal"].title || "";
  item.comments_with_mentions === void 0 ? item.tags = "" : item.tags = extractAndSortMentions(item.comments_with_mentions).join(", ");
  switch (q_name) {
    case "by_clpid":
    case "review_queue_by_clpid":
      item.query_clpid = q;
      item.query_orcid = item.creators === void 0 ? "" : extractOrcidByClpid(item.creators, q);
      break;
    case "by_orcid":
    case "review_queue_by_orcid":
      item.query_clpid = item.creators === void 0 ? "" : extractClpidByOrcid(item.creators, q);
      item.query_orcid = q;
      break;
    case "by_name":
    case "review_queue_by_name":
      item.query_clpid = item.creators === void 0 ? "" : extractClpidByName(item.creators, q);
      item.query_orcid = item.creators === void 0 ? "" : extractOrcidByName(item.creators, q);
      break;
    default:
      item.query_clpid = "";
      item.query_orcid = "";
  }
  [
    "status",
    "link",
    "publisher"
  ].forEach(function(key) {
    if (key in item && (item[key] === void 0 || item[key] === null)) {
      item[key] = "";
    }
  });
}
function formatJsonAsHtmlTable(q_name, q, items) {
  const tableRows = items.map((item) => {
    normalizeItem(q_name, q, item);
    return `
            <tr>
                <td><a href="${item.link}" target="_blank">${item.rdmid}</a></td>
                <td>${item.status}</td>
                <td>${item.title}</td>
                <td>${item.publisher}</td>
                <td>${item.journal_title}</td>
                <td>${item.publication_date}</td>
                <td>${item.tags}</td>
                <td>${item.created}</td>
                <td>${item.submitted_by}</td>
                <td>${item.groups}</td>
            </tr>
        `;
  }).join("");
  return `
        <table border="1">
            <thead>
                <tr>
                    <th>RDMID</th>
                    <th>Status</th>
                    <th>Title</th>
                    <th>Publisher</th>
                    <th>Journal Title</th>
                    <th>Publication Date</th>
                    <th>Tags</th>
                    <th>Created Date</th>
                    <th>Submitted By</th>
                    <th>Caltech Groups</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}
function formatJsonAsCSV(q_name, q, items) {
  let csvHeader = "";
  let csvRows = "";
  let q_normal = q;
  if (q.indexOf("%") > -1) {
    q_normal = q.replace(/%/g, "*");
  }
  switch (q_name) {
    case "by_clpid":
    case "review_queue_by_clpid":
    case "by_orcid":
    case "review_queue_by_orcid":
    case "by_name":
    case "review_queue_by_name":
      csvHeader = "Query,found clpid,found orcid,Tags,RDMID,Link,Status,Title,Publisher,Journal Title,Publication Date,Created Date,Submitted By,Caltech Groups";
      csvRows = items.map((item) => {
        normalizeItem(q_name, q_normal, item);
        return `"${q_normal}","${item.query_clpid}","${item.query_orcid}","${item.tags}","${item.rdmid}","${item.link.replace(/"/g, '""')}","${item.status}","${item.title.replace(/"/g, '""')}","${item.publisher.replace(/"/g, '""')}","${item.journal_title.replace(/"/g, '""')}","${item.publication_date}","${item.created}","${item.submitted_by}","${item.groups.replace(/"/g, '""')}"`;
      }).join("\n");
      break;
    default:
      csvHeader = "Query,Tags,RDMID,Link,Status,Title,Publisher,Journal Title,Publication Date,Created Date,Submitted By,Caltech Groups";
      csvRows = items.map((item) => {
        normalizeItem(q_name, q_normal, item);
        return `"${q_normal}","${item.tags}","${item.rdmid}","${item.link.replace(/"/g, '""')}","${item.status}","${item.title.replace(/"/g, '""')}","${item.publisher.replace(/"/g, '""')}","${item.journal_title.replace(/"/g, '""')}","${item.publication_date}","${item.created}","${item.submitted_by}","${item.groups.replace(/"/g, '""')}"`;
      }).join("\n");
      break;
  }
  const csv = `${csvHeader}
${csvRows}`;
  return csv;
}
function csvToDownloadElements(csvContent, fileName = "data.csv") {
  const container = document.createElement("span");
  const dataElement = document.createElement("data");
  dataElement.setAttribute("data-csv", csvContent);
  const button = document.createElement("button");
  button.textContent = "Download CSV";
  button.addEventListener("click", () => {
    const blob = new Blob([
      csvContent
    ], {
      type: "text/csv;charset=utf-8;"
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
  container.appendChild(button);
  container.appendChild(dataElement);
  return container;
}
function stripNonAlphanumericUTF8(input) {
  return input.replace(/[^\p{L}\p{N}]/gu, "");
}
export {
  RdmReviewQueueUI
};
