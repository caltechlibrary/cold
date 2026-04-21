// sortable_table.ts provides a custom element that wraps a <table> and adds
// column sorting and column-scoped text search.

class SortableTable extends HTMLElement {
  private tableContainer: HTMLElement;
  private searchInput: HTMLInputElement;
  private columnSelect: HTMLSelectElement;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.innerHTML = `
      <style>
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
          cursor: pointer;
        }
        th:hover {
          background-color: #ddd;
        }
        .search-container {
          margin-bottom: 10px;
        }
        input[type="text"] {
          padding: 6px;
          margin-top: 8px;
          margin-right: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
      </style>
      <div class="search-container">
        <input type="text" id="searchInput" placeholder="Search...">
        <select id="columnSelect"></select>
      </div>
      <div id="tableContainer"></div>
    `;
    this.tableContainer = this.shadowRoot!.getElementById(
      "tableContainer",
    ) as HTMLElement;
    this.searchInput = this.shadowRoot!.getElementById(
      "searchInput",
    ) as HTMLInputElement;
    this.columnSelect = this.shadowRoot!.getElementById(
      "columnSelect",
    ) as HTMLSelectElement;
  }

  connectedCallback() {
    const table = this.querySelector("table");
    if (table) {
      const tableClone = table.cloneNode(true) as HTMLTableElement;
      this.tableContainer.appendChild(tableClone);
      this.setupSortableTable(tableClone);
      this.setupSearch(tableClone);
    }
  }

  private setupSortableTable(table: HTMLTableElement) {
    const headers = table.querySelectorAll<HTMLTableCellElement>("thead th");
    const tbody = table.querySelector("tbody")!;
    const rows = tbody.querySelectorAll("tr");

    headers.forEach((header, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = header.textContent?.trim() ?? "";
      this.columnSelect.appendChild(option);
    });

    headers.forEach((header, index) => {
      header.addEventListener("click", () => {
        this.sortTable(index, rows);
      });
    });
  }

  private setupSearch(table: HTMLTableElement) {
    this.searchInput.addEventListener("input", () => {
      const searchTerm = this.searchInput.value.toLowerCase();
      const columnIndex = parseInt(this.columnSelect.value);
      const rows = table.querySelectorAll<HTMLTableRowElement>("tbody tr");
      rows.forEach((row) => {
        const cell = row.cells[columnIndex];
        const cellText = cell.textContent?.toLowerCase() ?? "";
        row.style.display = cellText.includes(searchTerm) ? "" : "none";
      });
    });
  }

  private sortTable(
    columnIndex: number,
    rows: NodeListOf<HTMLTableRowElement>,
  ) {
    const tbody = this.tableContainer.querySelector("tbody")!;
    const rowsArray = Array.from(rows);
    const isAscending = !this.isSortedAscending(columnIndex);

    rowsArray.sort((rowA, rowB) => {
      const cellA = rowA.cells[columnIndex].textContent ?? "";
      const cellB = rowB.cells[columnIndex].textContent ?? "";
      return isAscending
        ? cellA.localeCompare(cellB)
        : cellB.localeCompare(cellA);
    });

    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }
    rowsArray.forEach((row) => tbody.appendChild(row));
  }

  private isSortedAscending(columnIndex: number): boolean {
    const table = this.tableContainer.querySelector("table")!;
    const rows = table.querySelectorAll<HTMLTableRowElement>("tbody tr");
    for (let i = 0; i < rows.length - 1; i++) {
      const cellA = rows[i].cells[columnIndex].textContent ?? "";
      const cellB = rows[i + 1].cells[columnIndex].textContent ?? "";
      if (cellA.localeCompare(cellB) > 0) return false;
    }
    return true;
  }
}

customElements.define("sortable-table", SortableTable);

export { SortableTable };
