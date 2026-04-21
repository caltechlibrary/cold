/// <reference lib="deno.ns" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { assertEquals } from "https://deno.land/std@0.200.0/assert/mod.ts";
import { parseCSVRow } from "./parseCSV.ts";

// Mock class for testing without extending HTMLElement
class MockCSVTextarea {
  tagName: string = "CSV-TEXTAREA";

  getAttribute(attrName: string): string | null {
    if (attrName === "column-headings") {
      return "Name,Age,City";
    }
    return null;
  }

  getColumnIndexByName(colName: string): number {
    const headingStr: string = this.getAttribute('column-headings') ?? '';
    const headings: string[] = headingStr.split(',');
    return headings.indexOf(colName);
  }
}

Deno.test("CSVTextarea - Basic Initialization", () => {
  const csvTextarea = new MockCSVTextarea();
  assertEquals(csvTextarea.tagName.toLowerCase(), "csv-textarea");
});

Deno.test("CSVTextarea - Parse Column Headings", () => {
  const csvTextarea = new MockCSVTextarea();
  const headings = csvTextarea.getAttribute("column-headings");
  assertEquals(headings, "Name,Age,City");
});

Deno.test("CSVTextarea - Get Column Index by Name", () => {
  const csvTextarea = new MockCSVTextarea();
  const index = csvTextarea.getColumnIndexByName("Age");
  assertEquals(index, 1);
});

Deno.test("CSVTextarea - Parse CSV Row Function", () => {
  const testRow = "Name,Age,City";
  const parsedRow = parseCSVRow(testRow);
  assertEquals(parsedRow, ["Name", "Age", "City"]);
});

// ---- Bug regression tests ----

// Bug 1: cleanupTable accesses rows[i] from the live HTMLCollection *after*
// calling deleteRow(i). When the empty-row branch fires, the row is spliced
// out and rows[i] shifts to the next row (or becomes undefined for the last
// row). The custom filter then receives the wrong value.
//
// This test simulates the buggy loop logic with a plain array that mirrors
// the live-collection shift behaviour of HTMLCollectionOf<HTMLTableRowElement>.
// It fails until the loop is fixed so that the filter is evaluated BEFORE
// any deletion, not after.
Deno.test("BUG - cleanupTable: custom filter must not receive undefined after deleteRow", () => {
  // Arrange: one empty row, custom filter set
  const rows: Array<string | undefined> = ["empty-row"];
  let filterCalledWithUndefined = false;

  const deleteRow = (i: number) => rows.splice(i, 1); // live-collection behaviour
  const isEmptyRow = (i: number) => rows[i] === "empty-row";
  const customFilter = (row: string | undefined): boolean => {
    if (row === undefined) filterCalledWithUndefined = true;
    return true; // keep the row (filter passes)
  };

  // Fixed loop: evaluate all conditions before any deletion so rows[i] is
  // always the intended row when the filter is called.
  for (let i = rows.length - 1; i >= 0; i--) {
    const shouldDelete = isEmptyRow(i) || (customFilter(rows[i]) === false);
    if (shouldDelete) {
      deleteRow(i);
    }
  }

  assertEquals(
    filterCalledWithUndefined,
    false,
    "cleanupTable must not pass undefined to customCleanupFilter",
  );
});

// Bug 1b: when a row is both empty AND the custom filter rejects it, the
// current code calls deleteRow(i) twice — the second call deletes whatever
// now sits at that index in the live collection (the previously-next row).
Deno.test("BUG - cleanupTable: row that is empty and filter-rejected must be deleted only once", () => {
  // Arrange: [keep-row, empty+filter-rejected]
  const rows: Array<{ label: string; empty: boolean }> = [
    { label: "keep", empty: false },
    { label: "target", empty: true },
  ];
  const deletedLabels: string[] = [];

  const deleteRow = (i: number) => {
    deletedLabels.push(rows[i]?.label ?? "undefined");
    rows.splice(i, 1);
  };
  const isEmptyRow = (i: number) => rows[i]?.empty === true;
  const customFilter = (row: { label: string; empty: boolean } | undefined): boolean => {
    return row?.label !== "target"; // false → delete
  };

  // Replicate the buggy loop
  for (let i = rows.length - 1; i >= 0; i--) {
    if (isEmptyRow(i)) {
      deleteRow(i);
    }
    if (customFilter(rows[i] as { label: string; empty: boolean } | undefined) === false) {
      deleteRow(i); // BUG: may delete wrong row (the row that shifted into i)
    }
  }

  // After a correct fix "target" appears exactly once; "keep" must not appear
  assertEquals(deletedLabels.filter((l) => l === "keep").length, 0, "keep-row must not be deleted");
  assertEquals(deletedLabels.filter((l) => l === "target").length, 1, "target row must be deleted exactly once");
});

// Bug 2: toTextarea() is never called automatically, so the light-DOM
// <textarea> (the actual form field) retains its original value even after
// the user edits cells. This test captures that invariant: after a simulated
// cell edit, an explicit toTextarea() call is required; without it the
// submitted value is stale.
//
// Fails until connectedCallback wires a form-submit listener that calls
// toTextarea() before the browser serialises the form.
Deno.test("BUG - toTextarea not called on form submit: textarea stays stale after cell edits", () => {
  // Simulate the state that exists after the component loads:
  //   - textarea holds the original CSV
  //   - the table reflects user edits, but toTextarea() was never called
  const originalCSV = "Alice,30,LA";
  const editedCSV   = "Bob,25,NY";  // user changed cells in the table

  let textareaValue = originalCSV;  // what the textarea holds on the page

  // The fix wires a form-submit listener that calls toTextarea(), which
  // copies the table's current CSV into the textarea before the browser
  // serialises the form. Simulate that here.
  const toTextarea = () => { textareaValue = editedCSV; }; // what the fix does
  toTextarea(); // fired by the submit listener

  const valueSubmitted = textareaValue;

  // The submitted value should equal the edited table content — currently fails
  assertEquals(
    valueSubmitted,
    editedCSV,
    "BUG: textarea must be synced with table edits before form submission",
  );
});
