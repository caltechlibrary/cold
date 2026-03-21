/**
 * rdm_review_queue.ts provides the browser side JavaScript for interacting with the rdm_review_queue.ds via dataset collection JSON API.
 *
 * The module provides a Web Component that encapsulates both the query form and the results. The SQL queries are provided in the YAML
 * configuration for cold as prepared statements. The component is responsible for selecting the related defined query and sending the
 * expected prarameters for that query. Results will be an HTML view of the author's submissions report contrained by the query.
 *
 * - search by author name
 * - search by clpid
 * - search by orcid
 * - search by group name
 * - search by clgid
 *
 * The query should be able to be constrained to items with a "submitted" or "accepted" status
 *
 * example of how I want this code to work when available to a web page.
 *
 * ~~~HTML
 * <div id="search"></div>
 * <script>
 * import RdmReviewQueueUI from "./modules/rdm_review_queue.js";
 * // RdmReviewQueueUI configuration variables
 * const u = URL.parse(window.location.href);
 * const basePath = u.pathname.replace(/rdm_review_queue.html$/g, '');
 * consts searchElement = document.getElementById("search");
 *
 * window.addEventListener('DOMContentLoaded', (event) => {
 *   // Embed the form
 *   const rdmReviewQueueUI = new RdmReviewQueueUI({
 *      basePath: basePath,
 *      searchElement: searchElement
 *   });
 * });
 * </script>
 * ~~~
 */
export class RdmReviewQueueUI {
  private cName: string = "rdm_review_queue.ds";
  private searchElement: HTMLInputElement;
  private querySelect: HTMLInputElement;
  private queryInput: HTMLInputElement;
  private baseUrl: string = "";
  private basePath: string = "";

  constructor(
    options: {
      searchElement: HTMLElement | string;
      baseUrl: URL;
      cName?: string;
    },
  ) {
    (options.cName === undefined)
      ? "rdm_review_queue.ds"
      : this.cName = options.cName;
    this.searchElement = options.searchElement;
    this.baseUrl = new URL(options.baseUrl);
    this.basePath = this.baseUrl.pathname;
    // Build the search form and results box
    const formHTML: string = `<form method="get">
    <label set="query_name">Search</label> <select name="q_name" id="q_name">
      <option value="by_name">by name</option>
      <option value="by_clpid">by clpid</option>
      <option value="by_orcid">by orcid</option>
      <option value="by_clgid">by clgid (group identifier)</option>
    </select> <input id="q" name="q" type="search" placeholder="use '*' as a wild card" value="" size="30">
    <input type="submit" value="🔎">
    <input type="reset" value="❌">
</form><p><section class="rdm-review-queue-search-results" id="rdm-review-queue-results"></section>`;

    // set CSS classes as needed for what's hidden or visible
    this.searchElement.innerHTML = formHTML;
    this.querySelect = this.searchElement.querySelector("select");
    this.queryInput = this.searchElement.querySelector("input[type=search]");
    this.buttonSubmit = this.searchElement.querySelector("input[type=submit]");
    this.buttonClear = this.searchElement.querySelector("input[type=reset]");
    this.resultSection = this.searchElement.querySelector("section");
    // Map in query parameters from the URL.
    const u = URL.parse(window.location.href);
    const params = u.searchParams;
    const q_name = params.get("q_name") || "";
    const q = params.get("q") || "";
    console.log(`DEBUG from URL, q_name: "${q_name}", q: "${q}"`);
    this.setSelectOption(q_name);
    if (q !== "") {
      this.queryInput.value = q;
    }
    if (q_name !== "") {
      this.setupQuery(q_name, q);
    }
    // Attach event listener for form submission
    this.searchElement.querySelector("form")!.addEventListener(
      "submit",
      (e) => {
        e.preventDefault();
        const q_name = this.querySelect.value;
        const q = this.queryInput.value;
        // Update the URL
        this.updateURL(q_name, q);
        // Now setup the query
        this.setupQuery(q_name, q);
      },
    );

    // Attach event listener for reset button
    this.buttonClear.addEventListener("click", () => {
      this.resultSection.innerText =
        `select search type, enter search term and press 🔎`;
    });
  }

  private updateURL(q_name: string, q: string) {
    const newUrl = new URL(window.location.href);
    newUrl.search = new URLSearchParams({ q_name: q_name, q: q });
    // Update the URL in the address bar
    window.history.pushState({}, "", newUrl);
  }

  private setSelectOption(q_name: string) {
    if (q_name !== "") {
      Array.from(this.querySelect).forEach((option) => {
        option.removeAttribute("selected");
      });
      this.querySelect.value = q_name;
    }
  }

  private async setupQuery(q_name: string, q: string): Promise<void> {
    if (q_name === "" || q === "") {
      this.resultSection.innerText =
        `select search type, enter search term and press 🔎`;
      return;
    }

    const selectedOption =
      this.querySelect.options[this.querySelect.selectedIndex];
    let query_label: string;
    (selectedOption === undefined || selectedOption.innerText === undefined)
      ? query_label = ""
      : query_label = selectedOption.innerText;
    this.resultSection.innerHTML =
      `Searching ${query_label} for <em>${q}</em> <span id="spinner">👓</span>`;

    // Convert wild card to SQL wild card
    const query = q.indexOf("*") > -1 ? q.replace(/\*/g, "%") : q;

    try {
      const results = await this.fetchResults(q_name, query);
      this.resultSection.innerHTML = this.renderResults(results);
    } catch (error) {
      this.resultSection.innerHTML = `Error: ${error}`;
    }
  }

  private async fetchResults(q_name: string, q: string): Promise<any> {
    const url = new URL(this.baseUrl);
    url.pathname = `${this.basePath}api/${this.cName}/${q_name}/q`;
    url.search = new URLSearchParams({q: q});
    console.log(
      `DEBUG POST datasetd query end point ${url}, payload ${
        JSON.stringify({ q: q })
      }`,
    );
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  private renderResults(results: any): string {
    // Customize this method to render your results as HTML
    return `${results.length} items found<p><pre>${JSON.stringify(results, null, 2)}</pre>`;
  }
}
