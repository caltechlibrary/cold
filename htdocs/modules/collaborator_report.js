// collaborator_report.ts
var CollaboratorReportUI = class {
  cName = "people.ds";
  reportElement;
  clpidElement;
  baseUrl;
  basePath = "";
  buttonSubmit;
  buttonClear;
  resultSection;
  clientAPI;
  constructor(options) {
    const formHTML = `<form method="get">
        <label for="clpid">clpid</label>
        <input
            name="clpid"
            id="clpid"
            type="text"
            value=""
            size="40"
            placeholder="Enter a clpid, example Doiel-R-S"
            list="clpid-list"
            required
            autocomplete="on"
        >
        <datalist id="clpid-list"></datalist>
        <input type="submit" value="\u2699\uFE0F">
        <input type="reset" value="\u274C">
    </form>
    <p>
        <section class="collaborator-report-results" id="collaborator-report-results"></section>
    </p>
`;
    options.cName === void 0 ? "reports.ds" : this.cName = options.cName;
    this.reportElement = typeof options.reportElement === "string" ? document.getElementById(options.reportElement) : options.reportElement;
    ;
    this.baseUrl = new URL(options.baseUrl);
    this.basePath = this.baseUrl.pathname;
    this.clientAPI = options.clientAPI;
    this.reportElement.innerHTML = formHTML;
    this.clpidElement = this.reportElement.querySelector("#clpid");
    this.buttonSubmit = this.reportElement.querySelector("input[type=submit]");
    this.buttonClear = this.reportElement.querySelector("input[type=reset]");
    this.resultSection = this.reportElement.querySelector("section");
    const u = new URL(window.location.href);
    const params = u.searchParams;
    let clpid = params.get("clpid") || "";
    clpid = clpid.trim();
    this.populateAutocomplete();
    if (clpid !== "") {
      this.clpidElement.value = clpid;
      this.setupReport(clpid);
    }
    this.reportElement.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const clpid2 = this.clpidElement.value.trim();
      this.updateURL(clpid2);
      this.setupReport(clpid2);
    });
    this.buttonClear.addEventListener("click", () => {
      this.resultSection.innerText = `Enter clpid and press \u2699\uFE0F`;
    });
  }
  async populateAutocomplete() {
    const peopleList = await this.clientAPI.getList("people.ds", "get_all_clpid");
    const dataListElement = document.getElementById("clpid-list");
    if (dataListElement !== void 0 && dataListElement != null) {
      for (let clpid of peopleList) {
        let optElem = document.createElement("option");
        optElem.value = clpid;
        console.log(`DEBUG optElem -> ${optElem.outerHTML}`);
        dataListElement.appendChild(optElem);
      }
    }
  }
  updateURL(clpid) {
    const newUrl = new URL(window.location.href);
    newUrl.search = new URLSearchParams({
      clpid
    }).toString();
    window.history.pushState({}, "", newUrl);
  }
  async isValidClpid(clpid) {
    let result = await this.clientAPI.getList("people.ds", "validate_clpid", new URLSearchParams({
      "clpid": clpid
    }));
    if (result === void 0 || result.length !== 1 || result[0].clpid !== clpid) {
      return false;
    }
    return true;
  }
  async postReportRequest(report_name, clpid, emails) {
    const postUrl = "../records";
    const formData = new URLSearchParams();
    formData.append("report_name", report_name);
    formData.append("clpid", clpid);
    formData.append("emails", emails);
    console.log(`DEBUG formData -> ${formData.toString()}`);
    const defaultHeaders = {
      "Content-Type": "application/x-www-form-urlencoded"
    };
    const response = await fetch(postUrl, {
      method: "POST",
      headers: defaultHeaders,
      body: formData.toString()
    });
    if (!response.ok) {
      console.log(`HTTP error! status: ${response.status}`);
    }
    return response;
  }
  async setupReport(clpid) {
    if (clpid === "") {
      this.resultSection.innerText = `Enter clpid and press \u2699\uFE0F`;
      return;
    }
    if (!await this.isValidClpid(clpid)) {
      this.resultSection.innerHTML = `<em>Invalid clpid '${clpid}'</em>, enter clpid and press \u2699\uFE0F`;
      return;
    }
    let resp = await this.postReportRequest("run_collaborator_report", clpid, "");
    if (resp.ok) {
      this.resultSection.innerHTML = `The collaborator report for "${clpid}" is queued`;
    } else {
      this.resultSection.innerHTML = `There was a problem submitting the collaborator report for "${clpid}", ${JSON.stringify(resp)}`;
    }
  }
};
export {
  CollaboratorReportUI
};
