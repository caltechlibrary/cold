class CSVTextarea extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Set default values
    this.rows = parseInt(this.getAttribute('rows')) || 1;
    this.cols = parseInt(this.getAttribute('cols')) || 2;
    this.maxRows = parseInt(this.getAttribute('max-rows')) || Infinity;
    this.columnHeadings = this.getAttribute('column-headings')
      ? this.getAttribute('column-headings').split(',')
      : Array.from({ length: this.cols }, (_, i) => `column_${i + 1}`);

    // Adjust columns based on column-headings if provided
    if (this.columnHeadings.length > 0) {
      this.cols = this.columnHeadings.length;
    }

    // Default to showing the header unless explicitly set to false
    this.showHeader = !this.hasAttribute('show-header') || this.getAttribute('show-header') !== 'false';
    this.readOnly = this.hasAttribute('readonly');

    // Optional title attribute
    this.title = this.getAttribute('title') || 'CSV Textarea';

    // Attach the template to the shadow DOM
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        .csv-table {
          width: 100%;
          border-collapse: collapse;
        }
        .csv-table th, .csv-table td {
          border: 1px solid #ddd;
          padding: 8px;
        }
        .csv-table th {
          background-color: #f2f2f2;
          text-align: left;
        }
        .button-container {
          display: flex;
          gap: 10px;
          margin-top: 10px;
          position: relative;
        }
        .info-icon {
          position: absolute;
          top: 0;
          right: 0;
          cursor: pointer;
        }
        .tooltip {
          display: none;
          position: absolute;
          top: 30px;
          right: 0;
          background-color: #fff;
          border: 1px solid #ddd;
          padding: 10px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          z-index: 10;
        }
        .tooltip.visible {
          display: block;
        }
      </style>
      <table class="csv-table">
        <thead></thead>
        <tbody></tbody>
      </table>
      <div class="button-container">
        <button class="add-row-button" type="button" aria-label="Press Shift+Enter to add row" title="Press Shift+Enter to add row">Add Row</button>
        <button class="clean-up-button" type="button" aria-label="Press Shift+Backspace to clean up empty rows" title="Press Shift+Backspace to clean up empty rows">Clean Up</button>
        <span class="info-icon">ⓘ</span>
      </div>
      <div class="tooltip">
        <h4>${this.getAttribute('name')}</h4>
        <p>${this.title}</p>
        <p><strong>Key Bindings:</strong></p>
        <ul>
          <li>Shift + Enter: Add a new row</li>
          <li>Shift + Backspace: Clean up empty rows</li>
          <li>Ctrl + A: Select all text in the current cell</li>
          <li>Ctrl + Right Arrow: Select all text in the current row</li>
          <li>Backspace: Delete selected text in each cell</li>
        </ul>
      </div>
    `;

    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.table = this.shadowRoot.querySelector('.csv-table tbody');
    this.headerRow = this.shadowRoot.querySelector('.csv-table thead');
    this.addRowButton = this.shadowRoot.querySelector('.add-row-button');
    this.cleanUpButton = this.shadowRoot.querySelector('.clean-up-button');
    this.infoIcon = this.shadowRoot.querySelector('.info-icon');
    this.tooltip = this.shadowRoot.querySelector('.tooltip');

    this.addRowButton.addEventListener('click', this.addRow.bind(this));
    this.cleanUpButton.addEventListener('click', this.cleanUp.bind(this));
    this.infoIcon.addEventListener('click', this.toggleTooltip.bind(this));

    this.render();
  }

  static get observedAttributes() {
    return ['rows', 'cols', 'column-headings', 'show-header', 'max-rows', 'readonly'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log(`Attribute changed: ${name}, oldValue: ${oldValue}, newValue: ${newValue}`);
    switch (name) {
      case 'rows':
        this.rows = parseInt(newValue) || 1;
        break;
      case 'cols':
        this.cols = parseInt(newValue) || 2;
        this.columnHeadings = this.getAttribute('column-headings')
          ? this.getAttribute('column-headings').split(',')
          : Array.from({ length: this.cols }, (_, i) => `column_${i + 1}`);
        break;
      case 'column-headings':
        this.columnHeadings = newValue.split(',');
        if (this.columnHeadings.length > 0) {
          this.cols = this.columnHeadings.length;
        }
        break;
      case 'show-header':
        this.showHeader = newValue !== 'false'; // Show header unless explicitly set to 'false'
        break;
      case 'max-rows':
        this.maxRows = parseInt(newValue) || Infinity;
        break;
      case 'readonly':
        this.readOnly = this.hasAttribute('readonly');
        break;
      default:
        console.warn(`Unhandled attribute change: ${name}`);
    }
    this.render();
    this.updateButtonVisibility();
    this.updateHeaderVisibility();
  }

  connectedCallback() {
    this.populateTableFromBody();
    if (!this.readOnly) {
      this.addEventListeners();
    }
    this.updateButtonVisibility();
    this.updateHeaderVisibility();

    // Add event listener for form submission
    this.closest('form').addEventListener('submit', this.handleFormSubmit.bind(this));
  }

  render() {
    this.table.innerHTML = '';

    // Render header row if showHeader is true
    this.headerRow.innerHTML = '';
    if (this.showHeader) {
      const headerRow = this.headerRow.insertRow();
      this.columnHeadings.forEach(heading => {
        const th = document.createElement('th');
        th.textContent = heading;
        headerRow.appendChild(th);
      });
    }

    for (let i = 0; i < this.rows; i++) {
      const row = this.table.insertRow();
      for (let j = 0; j < this.cols; j++) {
        const cell = row.insertCell();
        cell.contentEditable = !this.readOnly;
        if (!this.readOnly) {
          cell.addEventListener('blur', this.handleCellChange.bind(this, i, j));
        }
      }
    }
  }

  addRow() {
    if (this.rows < this.maxRows) {
      this.rows++;
      const row = this.table.insertRow();
      for (let j = 0; j < this.cols; j++) {
        const cell = row.insertCell();
        cell.contentEditable = !this.readOnly;
        if (!this.readOnly) {
          cell.addEventListener('blur', this.handleCellChange.bind(this, this.rows - 1, j));
        }
      }
      // Focus on the first cell of the new row
      if (row.cells[0]) {
        row.cells[0].focus();
      }
      this.updateButtonVisibility();
    }
  }

  handleCellChange(rowIndex, colIndex, event) {
    const columnName = this.columnHeadings[colIndex];
    this.updateBodyFromTable();
    const changeEvent = new CustomEvent('change', {
      bubbles: true,
      detail: {
        row: rowIndex,
        col: colIndex,
        columnName: columnName,
        value: event.target.textContent.trim()
      }
    });
    this.dispatchEvent(changeEvent);
  }

  populateTableFromBody() {
    if (this.innerHTML.trim()) {
      const rows = this.innerHTML.trim().split('\n');
      this.rows = Math.min(rows.length, this.maxRows);
      this.cols = Math.max(...rows.map(row => row.split(',').length), this.cols);
      this.render();
      rows.forEach((row, rowIndex) => {
        const cells = row.split(',');
        cells.forEach((cell, colIndex) => {
          if (this.table.rows[rowIndex] && this.table.rows[rowIndex].cells[colIndex]) {
            this.table.rows[rowIndex].cells[colIndex].textContent = cell.trim().replace(/^"|"$/g, '');
          }
        });
      });
    }
  }

  updateBodyFromTable() {
    const rows = [];
    for (let i = 0; i < this.table.rows.length; i++) {
      const cells = [];
      for (let j = 0; j < this.table.rows[i].cells.length; j++) {
        const cellContent = this.table.rows[i].cells[j].textContent.trim();
        // Quote the cell content if it contains a comma
        cells.push(cellContent.includes(',') ? `"${cellContent}"` : cellContent);
      }
      if (cells.some(cell => cell)) {
        rows.push(cells.join(','));
      }
    }
    this.innerHTML = rows.join('\n');
  }

  addEventListeners() {
    this.table.addEventListener('keydown', event => {
      if (event.shiftKey && event.key === 'Enter') {
        event.preventDefault();
        this.addRow();
      } else if (event.shiftKey && event.key === 'Backspace') {
        event.preventDefault();
        this.cleanUp();
      } else if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
        const cell = event.target;
        if (cell.tagName === 'TD' || cell.tagName === 'TH') {
          const range = document.createRange();
          range.selectNodeContents(cell);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else if (event.ctrlKey && event.key === 'ArrowRight') {
        event.preventDefault();
        const cell = event.target;
        if (cell.tagName === 'TD' || cell.tagName === 'TH') {
          const row = cell.parentNode;
          const range = document.createRange();
          range.selectNodeContents(row);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else if (event.key === 'Backspace') {
        const selection = window.getSelection();
        if (selection.toString().trim() !== '') {
          const cell = event.target;
          if (cell.tagName === 'TD' || cell.tagName === 'TH') {
            const row = cell.parentNode;
            for (let i = 0; i < row.cells.length; i++) {
              if (selection.containsNode(row.cells[i], true)) {
                row.cells[i].textContent = '';
              }
            }
            this.updateBodyFromTable();
          }
        }
      }
    });
  }

  updateButtonVisibility() {
    this.addRowButton.style.display = !this.readOnly && this.rows < this.maxRows ? 'block' : 'none';
    this.cleanUpButton.style.display = !this.readOnly ? 'block' : 'none';
  }

  updateHeaderVisibility() {
    this.headerRow.style.display = this.showHeader ? 'table-header-group' : 'none';
  }

  handleFormSubmit(event) {
    // Add the CSV content to the form data
    const formData = new FormData(event.target);
    formData.append(this.getAttribute('name'), this.innerHTML);

    // Log the form data for demonstration purposes
    console.log('Form data submitted:', [...formData.entries()]);

    // Optionally, you can prevent the default form submission and handle it via JavaScript
    // event.preventDefault();
  }

  toJSON() {
    const rows = this.innerHTML.trim().split('\n');
    const jsonArray = [];

    rows.forEach(row => {
      const cells = row.split(',');
      const rowObject = {};
      cells.forEach((cell, index) => {
        const cellContent = cell.trim().replace(/^"|"$/g, '');
        rowObject[this.columnHeadings[index]] = cellContent;
      });
      jsonArray.push(rowObject);
    });

    return JSON.stringify(jsonArray, null, 2);
  }

  setCellValue(rowIndex, col, value) {
    let colIndex;
    if (typeof col === 'string') {
      // If col is a column name, find the corresponding index
      colIndex = this.columnHeadings.indexOf(col);
    } else if (typeof col === 'number') {
      // If col is a column number, use it directly
      colIndex = col;
    }

    if (colIndex !== -1 && this.table.rows[rowIndex] && this.table.rows[rowIndex].cells[colIndex]) {
      this.table.rows[rowIndex].cells[colIndex].textContent = value;
      this.updateBodyFromTable();
    }
  }

  getCellValue(rowIndex, col) {
    let colIndex;
    if (typeof col === 'string') {
      // If col is a column name, find the corresponding index
      colIndex = this.columnHeadings.indexOf(col);
    } else if (typeof col === 'number') {
      // If col is a column number, use it directly
      colIndex = col;
    }

    if (colIndex !== -1 && this.table.rows[rowIndex] && this.table.rows[rowIndex].cells[colIndex]) {
      return this.table.rows[rowIndex].cells[colIndex].textContent.trim();
    }
    return null;
  }

  cleanUp() {
    // Remove rows where all cells are empty
    const rowsToRemove = [];
    for (let i = 0; i < this.table.rows.length; i++) {
      const row = this.table.rows[i];
      let isEmpty = true;
      for (let j = 0; j < row.cells.length; j++) {
        if (row.cells[j].textContent.trim() !== '') {
          isEmpty = false;
          break;
        }
      }
      if (isEmpty) {
        rowsToRemove.push(i);
      }
    }
    rowsToRemove.reverse().forEach(index => {
      this.table.deleteRow(index);
    });
    this.rows = this.table.rows.length;
    this.updateBodyFromTable();
    this.updateButtonVisibility();
  }

  toggleTooltip() {
    this.tooltip.classList.toggle('visible');
  }
}

customElements.define('csv-textarea', CSVTextarea);
