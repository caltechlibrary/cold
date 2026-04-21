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
