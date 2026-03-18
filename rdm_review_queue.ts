/**
 * rdm_review_queue.ts provides the browser side JavaScript for interacting with the rdm_review_queue dataset collection API.
 * Given the size of that colleciton (> 100,000 objects) I am only planning on presenting a search interface at this time.
 * This initial version will treat the src JSON column as a text column as I think that will be the most flexibly but still
 * allowing for picking records with known unique identifiers (example clpid, orcid).
 *
 * The search currently implemented is naive and is located in the cold_api.yaml file. It is the query named search. Eventually
 * I will need to add paging if this turns out to be useful.
 *
 * example of how I want this code to work when available to a web page.
 *
 * ~~~HTML
 * <script type="module" src="js/rdm_review_queue.js"></script>
 * <div id="search"></div>
 * <script>
 * // RdmReviewQueueUI configuration variables
 * const cName = 'rdm_review_queue.ds';
 * const u = URL.parse(window.location.href);
 * const basePath = u.pathname.replace(/rdm_review_queue.html$/g, '') + `/api/${cName}/query/search`;
 *
 * // Function to extract query parameters from the URL
 * function getQueryParam(name) {
 *   const urlParams = new URLSearchParams(window.location.search);
 *   return urlParams.get(name);
 * }
 *
 * // Extract the query parameter
 * const searchQuery = getQueryParam('q');
 *
 * window.addEventListener('DOMContentLoaded', (event) => {
 *    const reviewQueueUI = new ReviewQueueUI({
 *            element: "#search",
 *            baseUrl: basePath,
 *            cName: cName,
 *    });
 *    if (searchQuery) {
 *        reviewQueueUI.triggerSearch(searchQuery);
 *    }
 * });
 * </script>
 * ~~~
 *
 */

 interface SearchResult {
   id: string;
   data: () => Promise<any>;
   // Add other properties as needed to match your API response
 }

 interface RdmReviewQueueAPIResponse {
   results: SearchResult[];
   // Add other properties as needed to match your API response
 }

 class RdmReviewQueueUI {
   private apiBaseUrl: string = '../';
   private cName string: string;
   private searchInput: HTMLInputElement | null = null;
   private resultsContainer: HTMLElement | null = null;
   private baseUrl: string;

   constructor(options: { element: HTMLElement | string; baseUrl: string | cName: string }) {
     this.searchInput = this.resolveElement(options.element);
     (options.baseUrl === undefined) ? '' : this.baseUrl = options.baseUrl;
     (options.baseUrl === defined) ? this.apiBaseUrl = `${this.baseUrl}/api/${cName}/search` : this.apiBaseUrl = baseUrl;
   }

   /**
    * Initializes the UI and binds to a search input.
    */
   public init(): void {
     if (!this.searchInput) {
       throw new Error("Search input element not found.");
     }
     this.searchInput.addEventListener("input", this.debounce(this.handleSearch, 300));
   }

   /**
    * Resolves an element from a selector or direct reference.
    */
   private resolveElement(element: HTMLElement | string): HTMLInputElement {
     if (typeof element === "string") {
       const el = document.querySelector<HTMLInputElement>(element);
       if (!el) throw new Error(`Element not found: ${element}`);
       return el;
     }
     return element;
   }

   /**
    * Handles the search input and fetches results from the API.
    */
   private handleSearch = async (event: Event): Promise<void> => {
     const query = (event.target as HTMLInputElement).value.trim();
     if (!query) {
       this.clearResults();
       return;
     }
     await this.fetchAndRenderResults(query);
   };

   /**
    * Triggers a search programmatically (mimics PagefindUI.triggerSearch).
    */
   public async triggerSearch(query: string): Promise<void> {
     if (!this.searchInput) return;
     this.searchInput.value = query;
     await this.fetchAndRenderResults(query);
   }

   /**
    * Fetches results from the API and renders them.
    */
   private async fetchAndRenderResults(query: string): Promise<void> {
     try {
       //FIXME: this needs to make a POST to the datasetd query end point.
       const response = await fetch(`${this.apiBaseUrl}?q=${encodeURIComponent(query)}`);
       const data: RdmReviewQueueAPIResponse = await response.json();
       this.renderResults(data.results);
     } catch (error) {
       console.error("Search failed:", error);
       this.renderError("Failed to fetch results.");
     }
   }

   /**
    * Renders search results to the container.
    */
   private renderResults(results: SearchResult[]): void {
     if (!this.resultsContainer) {
       this.resultsContainer = this.createResultsContainer();
     }

     this.resultsContainer.innerHTML = "";
     if (results.length === 0) {
       this.resultsContainer.innerHTML = "<div>No results found.</div>";
       return;
     }

     results.forEach((result) => {
       const resultElement = document.createElement("div");
       resultElement.className = "rdm-review-queue-result";
       resultElement.innerHTML = `
         <h3>${result.id}</h3>
         <!-- Customize this based on your API response structure -->
       `;
       resultElement.addEventListener("click", async () => {
         const data = await result.data();
         this.renderResultDetail(data);
       });
       this.resultsContainer?.appendChild(resultElement);
     });
   }

   /**
    * Renders detailed view for a single result.
    */
   private renderResultDetail(data: any): void {
     console.log("Result data:", data);
     // Implement your detail view logic here
   }

   /**
    * Creates a default results container if none is provided.
    */
   private createResultsContainer(): HTMLElement {
     const container = document.createElement("div");
     container.className = "rdm-review-queue-results";
     this.searchInput?.insertAdjacentElement("afterend", container);
     return container;
   }

   /**
    * Clears the results container.
    */
   private clearResults(): void {
     if (this.resultsContainer) {
       this.resultsContainer.innerHTML = "";
     }
   }

   /**
    * Renders an error message.
    */
   private renderError(message: string): void {
     if (!this.resultsContainer) {
       this.resultsContainer = this.createResultsContainer();
     }
     this.resultsContainer.innerHTML = `<div class="error">${message}</div>`;
   }

   /**
    * Debounce function to limit API calls during typing.
    */
   private debounce<T extends (...args: any[]) => any>(
     func: T,
     wait: number
   ): (...args: Parameters<T>) => void {
     let timeout: ReturnType<typeof setTimeout>;
     return (...args: Parameters<T>): void => {
       clearTimeout(timeout);
       timeout = setTimeout(() => func(...args), wait);
     };
   }
 }
