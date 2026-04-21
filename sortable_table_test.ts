import { assertEquals, assert } from "@std/assert";

// Pure logic extracted from SortableTable for unit testing without a DOM.

function isSortedAscending(rows: string[][], columnIndex: number): boolean {
  for (let i = 0; i < rows.length - 1; i++) {
    const cellA = rows[i][columnIndex] ?? "";
    const cellB = rows[i + 1][columnIndex] ?? "";
    if (cellA.localeCompare(cellB) > 0) return false;
  }
  return true;
}

function sortRows(
  rows: string[][],
  columnIndex: number,
  ascending: boolean,
): string[][] {
  return [...rows].sort((a, b) => {
    const cellA = a[columnIndex] ?? "";
    const cellB = b[columnIndex] ?? "";
    return ascending
      ? cellA.localeCompare(cellB)
      : cellB.localeCompare(cellA);
  });
}

function filterRows(
  rows: string[][],
  columnIndex: number,
  searchTerm: string,
): string[][] {
  return rows.filter((row) =>
    (row[columnIndex] ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );
}

const sampleRows = [
  ["Charlie", "2023"],
  ["Alice", "2021"],
  ["Bob", "2022"],
];

Deno.test("isSortedAscending: unsorted returns false", () => {
  assert(!isSortedAscending(sampleRows, 0));
});

Deno.test("isSortedAscending: sorted returns true", () => {
  const sorted = [["Alice", "2021"], ["Bob", "2022"], ["Charlie", "2023"]];
  assert(isSortedAscending(sorted, 0));
});

Deno.test("isSortedAscending: single row returns true", () => {
  assert(isSortedAscending([["Alice", "2021"]], 0));
});

Deno.test("sortRows ascending by first column", () => {
  const result = sortRows(sampleRows, 0, true);
  assertEquals(result[0][0], "Alice");
  assertEquals(result[1][0], "Bob");
  assertEquals(result[2][0], "Charlie");
});

Deno.test("sortRows descending by first column", () => {
  const result = sortRows(sampleRows, 0, false);
  assertEquals(result[0][0], "Charlie");
  assertEquals(result[1][0], "Bob");
  assertEquals(result[2][0], "Alice");
});

Deno.test("sortRows by second column", () => {
  const result = sortRows(sampleRows, 1, true);
  assertEquals(result[0][1], "2021");
  assertEquals(result[1][1], "2022");
  assertEquals(result[2][1], "2023");
});

Deno.test("filterRows matches case-insensitively", () => {
  const result = filterRows(sampleRows, 0, "alice");
  assertEquals(result.length, 1);
  assertEquals(result[0][0], "Alice");
});

Deno.test("filterRows returns all rows on empty search", () => {
  assertEquals(filterRows(sampleRows, 0, "").length, 3);
});

Deno.test("filterRows returns empty on no match", () => {
  assertEquals(filterRows(sampleRows, 0, "zzz").length, 0);
});
