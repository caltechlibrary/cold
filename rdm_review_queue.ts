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

import { ClientAPI } from "./client_api.ts";

export class RdmReviewQueueUI {
  private cName: string = "rdm_review_queue.ds";
  private searchElement: HTMLSelectElement;
  private querySelect: HTMLSelectElement;
  private queryInput: HTMLInputElement;
  private buttonSubmit: HTMLInputElement;
  private buttonClear: HTMLInputElement;
  private resultSection: HTMLElement;
  private baseUrl: URL;
  private basePath: string = "";
  private clientAPI: ClientAPI;
  // This adds auto complete for clpid and clgid reports
  private autocompleteResults: string[] = [];
  private selectedReportType: string | null = null;

  constructor(
    options: {
      searchElement: HTMLSelectElement | string;
      baseUrl: URL;
      cName?: string;
    },
  ) {
    (options.cName === undefined)
      ? "rdm_review_queue.ds"
      : this.cName = options.cName;
    (typeof options.searchElement === "string")
      ? this.searchElement = document.getElementById(
        options.searchElement,
      )! as unknown as HTMLSelectElement
      : this.searchElement = options.searchElement;
    this.baseUrl = new URL(options.baseUrl);
    this.basePath = this.baseUrl.pathname;
    this.clientAPI = new ClientAPI(this.baseUrl.toString());

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
    <input type="submit" value="🔎">
    <input type="reset" value="❌">
    <datalist id="autocomplete-container"></datalist>
</form><p><section class="rdm-review-queue-search-results" id="rdm-review-queue-results"></section>`;

    // set CSS classes as needed for what's hidden or visible
    this.searchElement.innerHTML = formHTML;
    this.querySelect = this.searchElement.querySelector("select")!;
    this.queryInput = this.searchElement.querySelector("input[type=search]")!;
    this.buttonSubmit = this.searchElement.querySelector("input[type=submit]")!;
    this.buttonClear = this.searchElement.querySelector("input[type=reset]")!;
    this.resultSection = this.searchElement.querySelector("section")!;
    // Map in query parameters from the URL.
    const u = URL.parse(window.location.href)!;
    const params = u.searchParams;
    const q_name: string = params.get("q_name") ?? "";
    const q: string = params.get("q") ?? "";
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

    // Add event handlers for query selection
    this.querySelect.addEventListener(
      "change",
      (e) => this.onReportTypeChange(e),
    );
  }

  private async get_all_clpid(): Promise<string[]> {
    return this.clientAPI.getStringList("people.ds", "get_all_clpid");
  }

  private async get_all_clgid(): Promise<string[]> {
    return this.clientAPI.getStringList("groups.ds", "get_all_clgid");
  }

  // fetchAutocompleteResults supports auto complete with clpid and clgid
  private async fetchAutocompleteResults(
    reportType: string,
  ): Promise<string[]> {
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
  public async onReportTypeChange(event: Event): Promise<void> {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedReportType = selectElement.value;

    if (this.selectedReportType) {
      this.autocompleteResults = await this.fetchAutocompleteResults(
        this.selectedReportType,
      );
      // Update the UI to show autocomplete options
      this.renderAutocompleteOptions();
    }
  }

  // renderAutocompleteOptions this populates the autocomplete for clpid or clgid, otherwise
  // it set the autocomplete data element to empty.
  private renderAutocompleteOptions(): void {
    const dataListElement: HTMLDataListElement = document.getElementById(
      "autocomplete-container",
    ) as unknown as HTMLDataListElement;
    if (!dataListElement) return;

    dataListElement.innerHTML = "";
    for (let val of this.autocompleteResults) {
      const optElem = document.createElement("option");
      optElem.value = val;
      dataListElement.appendChild(optElem);
    }
  }

  private updateURL(q_name: string, q: string) {
    const newUrl = new URL(window.location.href);
    newUrl.search = new URLSearchParams({ q_name: q_name, q: q }).toString();
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

  private genDownloadName(q_name: string, q: string, ext: string): string {
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

  private async setupQuery(q_name: string, q: string): Promise<void> {
    if (q_name === "" || q === "") {
      this.resultSection.innerText =
        `select search type, enter search term and press 🔎`;
      return;
    }
    if (q_name === "by_name" && q === "*") {
      this.resultSection.innerText =
        `Cannot complete search for all record by name using '${q}', too many results, enter revised search term and press 🔎`;
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
      query_label = `all records ${query_label}`;
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
    }

    try {
      const results = await this.fetchResults(q_name, query);
      this.resultSection.innerHTML =
        `${results.length}  items found, ${query_label} <em>"${q}"</em>`;
      if (results.length > 0) {
        const tableText: string = formatJsonAsHtmlTable(q_name, query, results);
        const csvText: string = formatJsonAsCSV(q_name, query, results);
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

  private async fetchResults(q_name: string, q: string): Promise<any> {
    const url = new URL(this.baseUrl);
    url.pathname = `${this.basePath}api/${this.cName}/${q_name}/q`;
    url.search = new URLSearchParams({ q: q }).toString();
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
  creators: Array<{
    person_or_org: {
      identifiers?: Array<{ identifier: string; scheme: string }>;
    };
  }>;
  comments_with_mentions: { content: string; created: string }[];
  groups: string;
  tags: string;
  query_clpid: string;
  query_orcid: string;
  journal_title: string;
  publication_date: string;
  created: string;
  submitted_by: string;
}

function extractOrcidForClpid(
  items: Array<{
    person_or_org: {
      identifiers?: Array<{ identifier: string; scheme: string }>;
    };
  }>,
  targetClpid: string,
): string {
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

function extractClpidForOrcid(
  items: Array<{
    person_or_org: {
      identifiers?: Array<{ identifier: string; scheme: string }>;
    };
  }>,
  targetOrcid: string,
): string {
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

function extractAndSortMentions(
  comments: Array<{ content: string; created: string }>,
): string[] {
  if (!comments) {
    return [];
  }

  // Extract all @mentions from each content
  const mentions = comments
    .flatMap((comment) =>
      // Match all @mentions (including Unicode letters/numbers)
      [...comment.content.matchAll(/@[\p{L}\p{N}_]+/gu)]
        .map((match) => match[0])
    );

  // Remove duplicates, sort, and return
  return [...new Set(mentions)].sort();
}

function normalizeItem(q_name: string, q: string, item: Item) {
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
  (item.comments_with_mentions === undefined)
    ? item.tags = ""
    : item.tags = extractAndSortMentions(item.comments_with_mentions).join(
      ", ",
    );
  switch (q_name) {
    case "by_clpid":
    case "review_queue_by_clpid":
      item.query_clpid = q;
      item.query_orcid = (item.creators === undefined)
        ? ""
        : extractOrcidForClpid(item.creators, q);
      break;
    case "by_orcid":
    case "review_queue_by_orcid":
      item.query_orcid = q;
      item.query_clpid = (item.creators === undefined)
        ? ""
        : extractClpidForOrcid(item.creators, q);
      break;
    default:
      item.query_clpid = "";
      item.query_orcid = "";
  }
  ["status", "link", "publisher"].forEach(function (key: string) {
    if (
      key in item &&
      (item[key as keyof Item] === undefined ||
        item[key as keyof Item] === null)
    ) {
      item[key as keyof Item] = "" as any; // or cast to the correct type
    }
  });
}

function formatJsonAsHtmlTable(
  q_name: string,
  q: string,
  items: Item[],
): string {
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

function formatJsonAsCSV(q_name: string, q: string, items: Item[]): string {
  let csvHeader: string = "";
  let csvRows: string = "";

  switch (q_name) {
    case "by_clpid":
    case "review_queue_by_clpid":
    case "by_orcid":
    case "review_queue_by_orcid":
      csvHeader =
        "Query,found clpid,found orcid,Tags,RDMID,Link,Status,Title,Publisher,Journal Title,Publication Date,Created Date,Submitted By,Caltech Groups";
      // Generate CSV content
      csvRows = items.map((item) => {
        normalizeItem(q_name, q, item);
        return `"${q}","${item.query_clpid}","${item.query_orcid}","${item.tags}","${item.rdmid}","${
          item.link.replace(/"/g, '""')
        }","${item.status}","${item.title.replace(/"/g, '""')}","${
          item.publisher.replace(/"/g, '""')
        }","${
          item.journal_title.replace(/"/g, '""')
        }","${item.publication_date}","${item.created}","${item.submitted_by}","${
          item.groups.replace(/"/g, '""')
        }"`;
      }).join("\n");
      break;
    default:
      csvHeader =
        "Query,Tags,RDMID,Link,Status,Title,Publisher,Journal Title,Publication Date,Created Date,Submitted By,Caltech Groups";
      // convert q wild card back from SQL '%' to '*'
      let q_normal: string = q;
      if (q.indexOf("%") > -1) {
        q_normal = q.replace(/%/g, "*");
      }
      // Generate CSV content
      csvRows = items.map((item) => {
        normalizeItem(q_name, q, item);
        return `"${q_normal}","${item.tags}","${item.rdmid}","${
          item.link.replace(/"/g, '""')
        }","${item.status}","${item.title.replace(/"/g, '""')}","${
          item.publisher.replace(/"/g, '""')
        }","${
          item.journal_title.replace(/"/g, '""')
        }","${item.publication_date}","${item.created}","${item.submitted_by}","${
          item.groups.replace(/"/g, '""')
        }"`;
      }).join("\n");
      break;
  }
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

function stripNonAlphanumericUTF8(input: string): string {
  // Matches any character that is not a Unicode letter or number
  return input.replace(/[^\p{L}\p{N}]/gu, "");
}
