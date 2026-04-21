// parseCSV.ts
function parseCSVRow(csvRowString) {
  let currentColumn = "";
  let inQuotes = false;
  const columns = [];
  const row = csvRowString.split("");
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      columns.push(currentColumn.trim());
      currentColumn = "";
    } else {
      currentColumn += char;
    }
  }
  columns.push(currentColumn.trim());
  return columns;
}
function parseCSV(csvString) {
  const rows = csvString.trim().split("\n");
  const maxColumns = 0;
  const data = rows.map(parseCSVRow);
  const maxColumnCount = Math.max(...data.map((row) => row.length));
  return data.map((row) => {
    while (row.length < maxColumnCount) {
      row.push("");
    }
    return row;
  });
}
function stringifyCSVRow(array) {
  return array.map((field) => {
    if (/[",\n]/.test(field)) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }).join(",");
}
function stringifyCSV(data) {
  return data.map(stringifyCSVRow).join("\n");
}

// csvtextarea.ts
var CSVTextarea = class extends HTMLElement {
  // Declare the properties
  customCleanupFilter = void 0;
  isComponentInitialized = false;
  constructor() {
    super();
    this.attachShadow({
      mode: "open"
    });
    this.isComponentInitialized = false;
    this.customCleanupFilter = void 0;
  }
  static get observedAttributes() {
    return [
      "column-headings",
      "id",
      "class",
      "caption",
      "text",
      "placeholder",
      "css-href",
      "debug"
    ];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "column-headings" && this.isComponentInitialized) {
      this.initializeTable();
    }
  }
  async connectedCallback() {
    await this.initializeComponent();
    this.isComponentInitialized = true;
    this.initializeTable();
    this.setupEventListeners();
  }
  async initializeComponent() {
    const template = document.createElement("template");
    template.innerHTML = `
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid black; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        input { width: 100%; }
      </style>
      <table>
        <thead></thead>
        <tbody></tbody>
      </table>
      <button id="append-row">Append Row</button>
      <button id="cleanup">Cleanup</button>
      ${this.hasAttribute("debug") ? '<button id="debug">Debug</button>' : ""}
      ${this.hasAttribute("title") || this.hasAttribute("help-description") ? '<span id="help-icon">\u24D8</span>' : ""}
    `;
    this.shadowRoot?.appendChild(template.content.cloneNode(true));
    if (this.hasAttribute("css-href")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = this.getAttribute("css-href") || "";
      this.shadowRoot?.appendChild(link);
    }
    if (this.hasAttribute("title") || this.hasAttribute("help-description")) {
      const helpIcon = this.shadowRoot?.getElementById("help-icon");
      helpIcon?.addEventListener("click", () => {
        alert(`${this.getAttribute("title") || ""}
${this.getAttribute("help-description") || ""}`);
      });
    }
  }
  initializeTable() {
    const headingStr = this.getAttribute("column-headings") ?? "";
    const headings = parseCSVRow(headingStr);
    const table = this.shadowRoot?.querySelector("table");
    const thead = table?.querySelector("thead");
    const tbody = table?.querySelector("tbody");
    if (thead) {
      thead.innerHTML = "";
    }
    if (thead) {
      const tr = document.createElement("tr");
      headings.forEach((heading) => {
        const th = document.createElement("th");
        th.textContent = heading;
        tr.appendChild(th);
      });
      thead.appendChild(tr);
    }
    const textarea = this.querySelector("textarea");
    if (textarea && textarea.value.trim()) {
      this.fromTextarea();
    } else {
      this.appendRow();
    }
    const datalists = this.querySelectorAll("datalist");
    datalists.forEach((datalist) => {
      if (this.shadowRoot) {
        this.shadowRoot.appendChild(datalist.cloneNode(true));
      }
    });
    headings.forEach((heading, index) => {
      const datalist = this.shadowRoot?.querySelector(`datalist#${heading.toLowerCase()}`);
      if (datalist) {
        this.setAutocomplete(index, Array.from(datalist.options).map((option) => ({
          value: option.value
        })));
      }
    });
    const helpIcon = this.shadowRoot?.querySelector("#help-icon");
    helpIcon?.addEventListener("click", () => {
      console.log("Help icon clicked");
    });
  }
  setupEventListeners() {
    this.shadowRoot?.querySelector("#append-row")?.addEventListener("click", () => this.appendRow());
    this.shadowRoot?.querySelector("#cleanup")?.addEventListener("click", () => this.cleanupTable());
    if (this.hasAttribute("debug")) {
      this.shadowRoot?.querySelector("#debug")?.addEventListener("click", () => {
        console.log(this.toCSV());
      });
    }
    this.shadowRoot?.querySelector("tbody")?.addEventListener("input", (event) => {
      const target = event.target;
      if (target.tagName === "INPUT") {
        const row = target.closest("tr");
        const cell = target.closest("td");
        if (row && cell) {
          const rowIndex = row.rowIndex - 1;
          const colIndex = cell.cellIndex;
          const value = target.value;
          this.dispatchEvent(new CustomEvent("changed", {
            detail: {
              rowIndex,
              colIndex,
              value
            }
          }));
          if (this.hasAttribute("debug")) {
            console.log(`Cell changed: Row ${rowIndex}, Col ${colIndex}, Value ${value}`);
          }
        }
      }
    });
    this.shadowRoot?.querySelector("tbody")?.addEventListener("focus", (event) => {
      const target = event.target;
      if (target.tagName === "INPUT") {
        const row = target.closest("tr");
        const cell = target.closest("td");
        if (row && cell) {
          const rowIndex = row.rowIndex - 1;
          const colIndex = cell.cellIndex;
          const value = target.value;
          this.dispatchEvent(new CustomEvent("focused", {
            detail: {
              rowIndex,
              colIndex,
              value
            }
          }));
          if (this.hasAttribute("debug")) {
            console.log(`Cell focused: Row ${rowIndex}, Col ${colIndex}, Value ${value}`);
          }
        }
      }
    }, true);
    this.closest("form")?.addEventListener("submit", () => this.toTextarea());
    this.shadowRoot?.querySelector("tbody")?.addEventListener("keydown", (event) => {
      const target = event.target;
      if (event.key === "Backspace" && target.tagName === "INPUT") {
        const input = target;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        if (start !== null && end !== null && start === end && start > 0) {
          input.value = input.value.slice(0, start - 1) + input.value.slice(end);
          input.selectionStart = input.selectionEnd = start - 1;
          event.preventDefault();
        }
      }
    });
  }
  rowCount() {
    const tbody = this.shadowRoot?.querySelector("tbody");
    return tbody ? tbody.rows.length : 0;
  }
  columnCount() {
    const thead = this.shadowRoot?.querySelector("thead");
    if (thead && thead.rows.length > 0) {
      return thead.rows[0].cells.length;
    }
    return 0;
  }
  isEmptyRow(rowIndex) {
    const row = this.shadowRoot?.querySelector(`tbody tr:nth-child(${rowIndex + 1})`);
    if (!row) return true;
    return Array.from(row.cells).every((cell) => {
      const input = cell.querySelector("input");
      return input ? input.value === "" : true;
    });
  }
  appendRow() {
    const tbody = this.shadowRoot?.querySelector("tbody");
    if (tbody) {
      const row = document.createElement("tr");
      for (let i = 0; i < this.columnCount(); i++) {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = this.getAttribute("placeholder") || "";
        const datalistId = `column-${i}`;
        const datalist = this.shadowRoot?.querySelector(`datalist#${datalistId}`);
        if (datalist) {
          input.setAttribute("list", datalistId);
        }
        td.appendChild(input);
        row.appendChild(td);
      }
      tbody.appendChild(row);
      const firstCell = row.cells[0];
      if (firstCell) {
        const input = firstCell.querySelector("input");
        if (input) {
          input.focus();
        }
      }
    }
  }
  cleanupTable() {
    const tbody = this.shadowRoot?.querySelector("tbody");
    if (tbody) {
      const rows = tbody.rows;
      for (let i = rows.length - 1; i >= 0; i--) {
        const shouldDelete = this.isEmptyRow(i) || this.customCleanupFilter !== void 0 && this.customCleanupFilter(rows[i]) === false;
        if (shouldDelete) {
          tbody.deleteRow(i);
        }
      }
    }
  }
  toCSV() {
    const rows = [];
    const tbody = this.shadowRoot?.querySelector("tbody")?.rows;
    if (tbody) {
      for (let i = 0; i < tbody.length; i++) {
        const cells = tbody[i].cells;
        const row = [];
        for (let j = 0; j < cells.length; j++) {
          const input = cells[j].querySelector("input");
          if (input) {
            row.push(input.value);
          }
        }
        rows.push(row);
      }
    }
    return stringifyCSV(rows);
  }
  fromCSV(csvText) {
    const rows = parseCSV(csvText);
    const tbody = this.shadowRoot?.querySelector("tbody");
    if (tbody) {
      tbody.innerHTML = "";
      rows.forEach((row) => {
        const tr = document.createElement("tr");
        row.forEach((cell) => {
          const td = document.createElement("td");
          const input = document.createElement("input");
          input.type = "text";
          input.value = cell;
          td.appendChild(input);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }
  }
  toObjects() {
    const objects = [];
    const tbody = this.shadowRoot?.querySelector("tbody")?.rows;
    if (tbody) {
      for (let i = 0; i < tbody.length; i++) {
        const cells = tbody[i].cells;
        for (let j = 0; j < cells.length; j++) {
          const input = cells[j].querySelector("input");
          if (input) {
            objects.push({
              rowIndex: i,
              colIndex: j,
              value: input.value
            });
          }
        }
      }
    }
    return objects;
  }
  fromObjects(objects) {
    const tbody = this.shadowRoot?.querySelector("tbody");
    if (tbody) {
      tbody.innerHTML = "";
      objects.forEach((obj) => {
        let row = tbody.rows[obj.rowIndex];
        if (!row) {
          row = document.createElement("tr");
          tbody.appendChild(row);
        }
        let cell = row.cells[obj.colIndex];
        if (!cell) {
          cell = document.createElement("td");
          row.appendChild(cell);
        }
        let input = cell.querySelector("input");
        if (!input) {
          input = document.createElement("input");
          input.type = "text";
          cell.appendChild(input);
        }
        input.value = obj.value;
      });
    }
  }
  fromTextarea() {
    const textarea = this.querySelector("textarea");
    if (textarea) {
      this.fromCSV(textarea.value.trim());
    }
  }
  toTextarea() {
    const textarea = this.querySelector("textarea");
    if (textarea) {
      textarea.value = this.toCSV();
    }
  }
  getCellValue(rowIndex, colIndexOrName) {
    const colIndex = typeof colIndexOrName === "number" ? colIndexOrName : this.getColumnIndexByName(colIndexOrName);
    const cell = this.shadowRoot?.querySelector(`tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${colIndex + 1}) input`);
    return cell ? cell.value : "";
  }
  setCellValue(rowIndex, colIndexOrName, value) {
    const colIndex = typeof colIndexOrName === "number" ? colIndexOrName : this.getColumnIndexByName(colIndexOrName);
    const cell = this.shadowRoot?.querySelector(`tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${colIndex + 1}) input`);
    if (cell) {
      cell.value = value;
    }
  }
  toJSON() {
    return JSON.stringify(this.toObjects());
  }
  fromJSON(jsonString) {
    this.fromObjects(JSON.parse(jsonString));
  }
  setAutocomplete(colIndexOrName, options) {
    const colIndex = typeof colIndexOrName === "number" ? colIndexOrName : this.getColumnIndexByName(colIndexOrName);
    const datalistId = `column-${colIndex}`;
    let datalist = this.shadowRoot?.querySelector(`datalist#${datalistId}`);
    if (!datalist && this.shadowRoot) {
      datalist = document.createElement("datalist");
      datalist.id = datalistId;
      this.shadowRoot.appendChild(datalist);
    }
    if (datalist) {
      datalist.innerHTML = "";
      options.forEach((option) => {
        const opt = document.createElement("option");
        opt.value = option.value;
        datalist.appendChild(opt);
      });
    }
    const inputs = this.shadowRoot?.querySelectorAll(`tbody td:nth-child(${colIndex + 1}) input`);
    inputs?.forEach((input) => input.setAttribute("list", datalistId));
  }
  getAutocomplete(colIndexOrName) {
    const colIndex = typeof colIndexOrName === "number" ? colIndexOrName : this.getColumnIndexByName(colIndexOrName);
    const datalist = this.shadowRoot?.querySelector(`datalist#column-${colIndex}`);
    if (datalist) {
      const options = [];
      datalist.querySelectorAll("option").forEach((option) => {
        options.push(option.value);
      });
      return options;
    }
    return void 0;
  }
  getColumnIndexByName(colName) {
    const headingStr = this.getAttribute("column-headings") ?? "";
    const headings = parseCSVRow(headingStr);
    return headings.indexOf(colName);
  }
};
customElements.define("csv-textarea", CSVTextarea);
export {
  CSVTextarea
};
