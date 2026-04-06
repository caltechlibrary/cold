/**
 * collaborator_report.ts provides the browser side JavaScript for interacting with the collaborator_reports by providing a field search form
 * and setting up the command line options to be passed through the reports system after vetting.
 *
 * The module provides a form that list people from people.ds by clpid and name. Once selected then the report can be formed and sent back
 * to the cold middleware which then vets the clpid to make sure it is real before injecting a report request into the report queue where it'll
 * get run with the correct parameter. Form elements
 *
 * - clpid with auto complete
 * - email (optional) of who to notify when report is available (example someone in the library)
 *
 * ~~~HTML
 * <div id="collaborator_report"></div>
 *
 * <noscript>JavaScript required for the collaborator report</noscript>
 *
 * <script type="module">
 *   import { CollaboratorReportUI } from "./modules/collaborator_report.js";
 *   const baseUrl = URL.parse(window.location.href);
 *   baseUrl.pathname = baseUrl.pathname.replace(/collaborator_report.html$/g, '');
 *   baseUrl.search = "";
 *   const reportElement = document.getElementById("collaborator_report");
 *   window.addEventListener('DOMContentLoaded', (event) => {
 *     const CollaboratorReprotUI = new RdmReviewQueueUI({
 *         baseUrl: baseUrl,
 *         reportElement: reportElement
 *     });
 *   });
 * </script>
 * ~~~
 */
import { ClientAPI } from "./client_api.ts";

export class CollaboratorReportUI {
  private cName: string = "people.ds";
  private reportElement!: HTMLElement;
  private clpidElement: HTMLInputElement;
  private baseUrl: URL;
  private basePath: string = "";
  private buttonSubmit!: HTMLInputElement;
  private buttonClear!: HTMLInputElement;
  private resultSection!: HTMLElement;
  private clientAPI!: ClientAPI;

  constructor(
    options: {
      reportElement: HTMLElement | string;
      baseUrl: string;
      clientAPI: ClientAPI;
      cName?: string;
    },
  ) {
    // Build the search form and results box
    const formHTML: string = `<form method="get">
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
        <input type="submit" value="⚙️">
        <input type="reset" value="❌">
    </form>
    <p>
        <section class="collaborator-report-results" id="collaborator-report-results"></section>
    </p>
`;

    // FIXME: The collaborator report form needs a auto complete for the clpid. This can be done with an input element typed
    // to a data list element avoiding allot of JavaScript. Need to update this via the form builder. That means
    // to display the form I will see how long it takes to get a list of people.ds keys from the API. Hopefully
    // it is fast enough.

    (options.cName === undefined) ? "reports.ds" : this.cName = options.cName;
    this.reportElement = typeof options.reportElement === "string"
      ? document.getElementById(options.reportElement)!
      : options.reportElement;
    this.baseUrl = new URL(options.baseUrl);
    this.basePath = this.baseUrl.pathname;
    this.clientAPI = options.clientAPI;

    // set update form elements
    this.reportElement.innerHTML = formHTML;
    this.clpidElement = this.reportElement.querySelector("#clpid")!;
    this.buttonSubmit = this.reportElement.querySelector("input[type=submit]")!;
    this.buttonClear = this.reportElement.querySelector("input[type=reset]")!;
    this.resultSection = this.reportElement.querySelector("section")!;

    // Map in query parameters from the URL.
    const u = new URL(window.location.href);
    const params = u.searchParams!;
    let clpid = params.get("clpid") || "";
    clpid = clpid.trim();
    this.populateAutocomplete();
    if (clpid !== "") {
      this.clpidElement.value = clpid;
      this.setupReport(clpid);
    }
    // Attach event listener for form submission
    this.reportElement.querySelector("form")!.addEventListener(
      "submit",
      (e) => {
        e.preventDefault();
        const clpid = this.clpidElement.value.trim();
        // Update the URL
        this.updateURL(clpid);
        // Now setup the query
        this.setupReport(clpid);
      },
    );

    // Attach event listener for reset button
    this.buttonClear.addEventListener("click", () => {
      this.resultSection.innerText = `Enter clpid and press ⚙️`;
    });
  }

  private async populateAutocomplete() {
    const peopleList = await this.clientAPI.getList(
      "people.ds",
      "get_all_clpid",
    );
    const dataListElement: HTMLDataListElement = document.getElementById(
      "clpid-list",
    );
    if (dataListElement !== undefined && dataListElement != null) {
      for (let clpid of peopleList) {
        let optElem = document.createElement("option");
        optElem.value = clpid;
        dataListElement.appendChild(optElem);
      }
    }
  }

  private updateURL(clpid: string) {
    const newUrl = new URL(window.location.href);
    newUrl.search = new URLSearchParams({ clpid: clpid }).toString();
    // Update the URL in the address bar
    window.history.pushState({}, "", newUrl);
  }

  private async isValidClpid(clpid: string): Promise<boolean> {
    let result: { [key: string]: any }[] = await this.clientAPI.getList(
      "people.ds",
      "validate_clpid",
      new URLSearchParams({ "clpid": clpid }),
    );
    if (
      (result === undefined) || (result.length !== 1) ||
      (result[0].clpid !== clpid)
    ) {
      return false;
    }
    return true;
  }

  private async postReportRequest(
    report_name: string,
    clpid: string,
    emails?: string,
  ): Promise<Response> {
    const postUrl = "../records";
    const formData = new URLSearchParams();
    formData.append("report_name", report_name);
    formData.append("clpid", clpid);
    formData.append("emails", emails);
    const defaultHeaders = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const response = await fetch(postUrl, {
      method: "POST",
      headers: defaultHeaders,
      body: formData.toString(),
    });

    if (!response.ok) {
      console.log(`HTTP error! status: ${response.status}`);
    }

    return response;
  }

  private async setupReport(clpid: string): Promise<void> {
    if (clpid === "") {
      this.resultSection.innerText = `Enter clpid and press ⚙️`;
      return;
    }
    // Make sure clpid is known, then send a post to the middleware.
    if (!await this.isValidClpid(clpid)) {
      this.resultSection.innerHTML =
        `<em>Invalid clpid '${clpid}'</em>, enter clpid and press ⚙️`;
      return;
    }
    // FIXME: We have a valid clpid, let's submit the request to the reports queue for processing.
    let resp = await this.postReportRequest(
      "run_collaborator_report",
      clpid,
      "",
    );
    if (resp.ok) {
      this.resultSection.innerHTML =
        `The collaborator report for "${clpid}" is queued`;
    } else {
      this.resultSection.innerHTML =
        `There was a problem submitting the collaborator report for "${clpid}", ${
          JSON.stringify(resp)
        }`;
    }
  }
}
