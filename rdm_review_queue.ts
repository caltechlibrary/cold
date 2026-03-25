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
      <hr />
      <optgroup label="Review Queue Only">
        <option value="review_queue_by_name" title="review queue by name">by name</option>
        <option value="review_queue_by_clpid" title="review queue by clpid">by clpid</option>
        <option value="review_queue_by_orcid" title"review queue by orcid">by orcid</option>
        <option value="review_queue_by_clgid" title="review queue by clgid">by clgid (group identifier)</option>
        <option value="review_queue_mentions" title="review queue search by @tag">by @tags</option>
      </optgroup>
      <hr />
      <optgroup label="All Requests">
        <option value="by_name" title="all requests by name">by name</option>
        <option value="by_clpid" title="all requests by clpid">by clpid</option>
        <option value="by_orcid" title="all requests by orcid">by orcid</option>
        <option value="by_clgid" title="all requests by clgid">by clgid (group identifier)</option>
      </optgroup>
    </select> <input id="q" name="q" type="search"
                  placeholder="use '*' as a wild card with names and @tag for at tags" value="" size="40"
                  title="use '*' as a wild card with names and @tag for at tags">
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
    const q = params.get("q").trim() || "";
    //console.log(`DEBUG from URL, q_name: "${q_name}", q: "${q}"`);
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
        const q = this.queryInput.value.trim();
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
    if (q_name.startsWith("review_queue")) {
      query_label = `review queue ${query_label}`;
    } else {
      query_label = `all requests ${query_label}`;
    }
    this.resultSection.innerHTML =
      `Searching ${query_label} for <em>"${q}"</em> <span id="spinner">👓</span>`;

    // Convert wild card to SQL wild card
    let query = q.indexOf("*") > -1 ? q.replace(/\*/g, "%") : q;
    // Handle special case of at tag queries
    if (q_name === "review_queue_mentions") {
      if (!query.startsWith("@")) {
        query = `@${query}`;
      }
      query = `%${query}%`;
      //console.log(`DEBUG updated query to ${query}`);
    }

    try {
      const results = await this.fetchResults(q_name, query);
      this.resultSection.innerHTML =
        `${results.length}  items found, ${query_label} <em>"${q}"</em>`;
      if (results.length > 0) {
        const tableText: string = formatJsonAsHtmlTable(results);
        const csvText: string = formatJsonAsCSV(results);
        const download = csvToDownloadElements(csvText, q_name + ".csv");
        this.resultSection.appendChild(download);
        this.resultSection.appendChild(document.createElement("p"));
        this.resultSection.insertAdjacentHTML("beforeend", tableText);
      }
    } catch (error) {
      this.resultSection.innerHTML = `Error: ${error}`;
    }
  }

  private async fetchResults(q_name: string, q: string): Promise<any> {
    const url = new URL(this.baseUrl);
    url.pathname = `${this.basePath}api/${this.cName}/${q_name}/q`;
    url.search = new URLSearchParams({ q: q });
    /* console.log(
      `DEBUG POST datasetd query end point ${url}, payload ${
        JSON.stringify({ q: q })
      }`,
      ); */
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }
}

interface Creator {
  person_or_org: {
    family_name: string;
    given_name: string;
    name: string;
  };
  affiliations: Array<{ id: string }>;
}

interface CustomFields {
  "caltech:groups": Array<{ id: string }>;
  "caltech:publication_status": Array<{ id: string }>;
  "journal:journal": {
    title: string;
    issn?: string;
    issue?: string;
    pages?: string;
    volume?: string;
  };
}

interface Item {
  rdmid: string;
  link: string;
  status: string;
  title: string;
  publisher: string;
  custom_fields: CustomFields;
  publication_date: string;
  created: string;
  submitted_by: string;
}

function normalizeItem(item: Item) {
  let groups: string = "";
  let journal_title: string = "";
  (item.custom_fields["caltech:groups"] === undefined)
    ? item.groups = ""
    : item.groups = item.custom_fields["caltech:groups"].map((g) => g.id).join(
      "; ",
    );
  (item.custom_fields["journal:journal"] === undefined)
    ? item.journal_title = ""
    : item.journal_title = item.custom_fields["journal:journal"].title || "";
  ["status", "link", "publisher"].forEach(function (key: string) {
    if (item[key] === undefined || item[key] === null) {
      item[key] = "";
    }
  });
}

function formatJsonAsHtmlTable(items: Item[]): string {
  const tableRows = items.map((item) => {
    normalizeItem(item);
    return `
            <tr>
                <td><a href="${item.link}" target="_blank">${item.rdmid}</a></td>
                <td>${item.status}</td>
                <td>${item.title}</td>
                <td>${item.publisher}</td>
                <td>${item.journal_title}</td>
                <td>${item.publication_date}</td>
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

function formatJsonAsCSV(items: Item[]): string {
  // Generate CSV content
  const csvHeader =
    "RDMID,Link,Status,Title,Publisher,Journal Title,Publication Date,Created Date,Submitted By,Caltech Groups";
  const csvRows = items.map((item) => {
    normalizeItem(item);
    return `"${item.rdmid}","${
      item.link.replace(/"/g, '""')
    }","${item.status}","${item.title.replace(/"/g, '""')}","${
      item.publisher.replace(/"/g, '""')
    }","${
      item.journal_title.replace(/"/g, '""')
    }","${item.publication_date}","${item.created}","${item.submitted_by}","${
      item.groups.replace(/"/g, '""')
    }"`;
  }).join("\n");
  const csv = `${csvHeader}\n${csvRows}`;
  return csv;
}

function csvToDownloadElements(
  csvContent: string,
  fileName: string = "data.csv",
): HTMLElement {
  // Create a data element to hold the CSV content
  const container = document.createElement("span");
  const dataElement = document.createElement("data");
  dataElement.setAttribute("data-csv", csvContent);

  // Create a button element
  const button = document.createElement("button");
  button.textContent = "Download CSV";

  // Add click event to trigger download
  button.addEventListener("click", () => {
    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    // Create a temporary anchor element
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";

    // Append to the body, trigger click, and then remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
  container.appendChild(button);
  container.appendChild(dataElement);
  return container;
}
