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
 */ export class CollaboratorReportUI {
  cName = "people.ds";
  reportElement;
  clpidElement;
  baseUrl = "";
  basePath = "";
  constructor(options){
    options.cName === undefined ? "reports.ds" : this.cName = options.cName;
    this.reportElement = options.reportElement;
    this.baseUrl = new URL(options.baseUrl);
    this.basePath = this.baseUrl.pathname;
    // Build the search form and results box
    const formHTML = `<form method="get">
    <label set="clpid">clpid</label> <input name="clpid" id="clpid" type="text" value="" size="40"  placeholder="Enter a clpid, example Doiel-R-S" required>
    <input type="submit" value="⚙️">
    <input type="reset" value="❌">
</form><p><section class="collaborator-report-results" id="collaborator-report-results"></section>`;
    // set CSS classes as needed for what's hidden or visible
    this.reportElement.innerHTML = formHTML;
    this.clpidInput = this.reportElement.querySelector("#clpid");
    this.buttonSubmit = this.reportElement.querySelector("input[type=submit]");
    this.buttonClear = this.reportElement.querySelector("input[type=reset]");
    this.resultSection = this.reportElement.querySelector("section");
    // Map in query parameters from the URL.
    const u = URL.parse(window.location.href);
    const params = u.searchParams;
    let clpid = params.get("clpid") || "";
    clpid = clpid.trim();
    //console.log(`DEBUG from URL, clpid: "${clpid}"`);
    if (clpid !== "") {
      this.clpidInput.value = clpid;
      this.setupReport(clpid);
    }
    // Attach event listener for form submission
    this.reportElement.querySelector("form").addEventListener("submit", (e)=>{
      e.preventDefault();
      const clpid = this.clpidInput.value.trim();
      // Update the URL
      this.updateURL(clpid);
      // Now setup the query
      this.setupReport(clpid);
    });
    // Attach event listener for reset button
    this.buttonClear.addEventListener("click", ()=>{
      this.resultSection.innerText = `Enter clpid and press ⚙️`;
    });
  }
  updateURL(clpid) {
    const newUrl = new URL(window.location.href);
    newUrl.search = new URLSearchParams({
      clpid: clpid
    });
    // Update the URL in the address bar
    window.history.pushState({}, "", newUrl);
  }
  async setupReport(clpid) {
    if (clpid === "") {
      this.resultSection.innerText = `Enter clpid and press ⚙️`;
      return;
    }
    // FIXME: Need to make sure clpid is valid before submitting to middleware for re-validation and report queuing
    this.resultSection.innerHTML = `Validate "${clpid}" Not implemented yet! <em>"${clpid}"</em>, Report queue for "${clpid}" not implemented yet! <span id="spinner">⚙️</span>`;
  }
}
