class SortableTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
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
        <select id="columnSelect">
          <!-- Column options will be added dynamically -->
        </select>
      </div>
      <div id="tableContainer"></div>
    `;

    this.tableContainer = this.shadowRoot.getElementById('tableContainer');
    this.searchInput = this.shadowRoot.getElementById('searchInput');
    this.columnSelect = this.shadowRoot.getElementById('columnSelect');
  }

  connectedCallback() {
    const table = this.querySelector('table');
    if (table) {
      // Clone the table to avoid modifying the original table directly
      const tableClone = table.cloneNode(true);
      this.tableContainer.appendChild(tableClone);
      this.setupSortableTable(tableClone);
      this.setupSearch(tableClone);
    }
  }

  setupSortableTable(table) {
    const headers = table.querySelectorAll('thead th');
    const tbody = table.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');

    // Populate column select options
    headers.forEach((header, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = header.textContent.trim();
      this.columnSelect.appendChild(option);
    });

    headers.forEach((header, index) => {
      header.addEventListener('click', () => {
        this.sortTable(index, rows);
      });
    });
  }

  setupSearch(table) {
    this.searchInput.addEventListener('input', () => {
      const searchTerm = this.searchInput.value.toLowerCase();
      const columnIndex = parseInt(this.columnSelect.value);
      const rows = table.querySelectorAll('tbody tr');

      rows.forEach(row => {
        const cell = row.cells[columnIndex];
        const cellText = cell.textContent.toLowerCase();
        if (cellText.includes(searchTerm)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }

  sortTable(columnIndex, rows) {
    const tbody = this.tableContainer.querySelector('tbody');
    const rowsArray = Array.from(rows);
    const isAscending = !this.isSortedAscending(columnIndex);

    rowsArray.sort((rowA, rowB) => {
      const cellA = rowA.cells[columnIndex].textContent;
      const cellB = rowB.cells[columnIndex].textContent;
      return isAscending ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
    });

    // Clear existing rows
    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }

    // Append sorted rows
    rowsArray.forEach(row => tbody.appendChild(row));
  }

  isSortedAscending(columnIndex) {
    const table = this.tableContainer.querySelector('table');
    const rows = table.querySelectorAll('tbody tr');
    for (let i = 0; i < rows.length - 1; i++) {
      const cellA = rows[i].cells[columnIndex].textContent;
      const cellB = rows[i + 1].cells[columnIndex].textContent;
      if (cellA.localeCompare(cellB) > 0) {
        return false;
      }
    }
    return true;
  }
}

customElements.define('sortable-table', SortableTable);
