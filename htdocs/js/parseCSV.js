/**
 * Parses a CSV string that represents an array of columns.
 * @param {string} csvRowString - The CSV data as a string.
 * @returns {string[]} - An array of columns.
 */
export function parseCSVRow(csvRowString) {
  let currentColumn = '';
  let inQuotes = false;
  const columns = [];
  const row = csvRowString.split('');

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      columns.push(currentColumn.trim());
      currentColumn = '';
    } else {
      currentColumn += char;
    }
  }
  columns.push(currentColumn.trim());
  return columns;
}

/**
 * Parses a CSV string and returns a 2D array of rows and columns.
 * @param {string} csvString - The CSV data as a string.
 * @returns {string[][]} - A 2D array of rows and columns.
 */
export function parseCSV(csvString) {
  const rows = csvString.trim().split('\n');
  const maxColumns = 0;

  const data = rows.map(parseCSVRow);
  
  const maxColumnCount = Math.max(...data.map((row) => row.length));

  return data.map((row) => {
    while (row.length < maxColumnCount) {
      row.push('');
    }
    return row;
  });
}

/**
 * stringifyCSVRow takes an array of strings and returns a CSV encoded string.
 */
export function stringifyCSVRow(array) {
  return array.map(field => {
      // Check if the field contains a comma, newline, or double quote
      if (/[",\n]/.test(field)) {
          // Escape double quotes and enclose the field in double quotes
          return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
  }).join(',');
}

/**
 * stringifyCSV a 2D array of strings (rows and columns) and returns a CSV encoded string.
 */
export function stringifyCSV(data) {
  return data.map(stringifyCSVRow).join('\n');
}

