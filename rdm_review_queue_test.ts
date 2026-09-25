import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  buildSearchTypeOptions,
  formatJsonAsCSV,
  formatJsonAsHtmlTable,
  genDownloadName,
  normalizeItem,
} from "./rdm_review_queue.ts";

// deno-lint-ignore no-explicit-any
function makeItem(overrides: { [key: string]: any } = {}): any {
  return {
    rdmid: "12345",
    link: "https://authors.library.caltech.edu/records/12345",
    status: "submitted",
    title: "A Test Record",
    publisher: "Caltech",
    custom_fields: {},
    creators: [],
    comments_with_mentions: [],
    groups: "",
    tags: "",
    query_clpid: "",
    query_orcid: "",
    journal_title: "",
    publication_date: "2026-01-01",
    created: "2026-01-01T00:00:00",
    submitted_by: "rsdoiel",
    reviewer_names: "pjaffe",
    ...overrides,
  };
}

Deno.test("normalizeItem fills reviewer_names with empty string when undefined", () => {
  const item = makeItem({ reviewer_names: undefined });
  normalizeItem("review_queue_by_reviewer", "pjaffe", item);
  assertEquals(item.reviewer_names, "");
});

Deno.test("normalizeItem fills reviewer_names with empty string when null", () => {
  const item = makeItem({ reviewer_names: null });
  normalizeItem("review_queue_by_reviewer", "pjaffe", item);
  assertEquals(item.reviewer_names, "");
});

Deno.test("normalizeItem leaves a populated reviewer_names untouched", () => {
  const item = makeItem({ reviewer_names: "pjaffe; tmorrell" });
  normalizeItem("review_queue_by_reviewer", "pjaffe", item);
  assertEquals(item.reviewer_names, "pjaffe; tmorrell");
});

Deno.test("formatJsonAsHtmlTable renders the Reviewer column and header", () => {
  const table = formatJsonAsHtmlTable("review_queue_by_reviewer", "pjaffe", [
    makeItem({ reviewer_names: "pjaffe" }),
  ]);
  assertStringIncludes(table, "<th>Reviewer</th>");
  assertStringIncludes(table, "<td>pjaffe</td>");
});

Deno.test("formatJsonAsHtmlTable renders an empty Reviewer cell, not 'undefined', when absent", () => {
  const table = formatJsonAsHtmlTable("by_name", "Smith", [
    makeItem({ reviewer_names: undefined }),
  ]);
  assertStringIncludes(table, "<th>Reviewer</th>");
  const noUndefined = table.indexOf("undefined") === -1;
  assertEquals(
    noUndefined,
    true,
    `table unexpectedly rendered "undefined": ${table}`,
  );
});

Deno.test("formatJsonAsCSV includes a Reviewer column in the identifier-resolving branch", () => {
  const csv = formatJsonAsCSV("review_queue_by_name", "Smith", [
    makeItem({ reviewer_names: "pjaffe" }),
  ]);
  const header = csv.split("\n")[0];
  assertStringIncludes(header, "Reviewer");
  assertStringIncludes(csv, '"pjaffe"');
});

Deno.test("formatJsonAsCSV includes a Reviewer column in the default branch", () => {
  const csv = formatJsonAsCSV("review_queue_by_clgid", "CG-123", [
    makeItem({ reviewer_names: "tmorrell" }),
  ]);
  const header = csv.split("\n")[0];
  assertStringIncludes(header, "Reviewer");
  assertStringIncludes(csv, '"tmorrell"');
});

Deno.test("formatJsonAsCSV renders an empty Reviewer field, not 'undefined', when absent", () => {
  const csv = formatJsonAsCSV("by_clgid", "CG-123", [
    makeItem({ reviewer_names: undefined }),
  ]);
  const noUndefined = csv.indexOf("undefined") === -1;
  assertEquals(
    noUndefined,
    true,
    `csv unexpectedly rendered "undefined": ${csv}`,
  );
});

Deno.test("genDownloadName: review_queue_by_reviewer", () => {
  const name = genDownloadName("review_queue_by_reviewer", "pjaffe", ".csv");
  assertEquals(name, "pjaffe_review_queue_by_reviewer.csv");
});

Deno.test("genDownloadName: by_reviewer falls through to the default case", () => {
  const name = genDownloadName("by_reviewer", "pjaffe", ".csv");
  assertEquals(name, "pjaffe_by_reviewer.csv");
});

Deno.test("genDownloadName: review_queue_browse ignores q, uses a fixed name", () => {
  const name = genDownloadName("review_queue_browse", "", ".csv");
  assertEquals(name, "all_submitted_review_queue_browse.csv");
});

Deno.test("buildSearchTypeOptions(review_queue) includes review_queue_browse and excludes All Records options", () => {
  const html = buildSearchTypeOptions("review_queue");
  assertStringIncludes(html, "review_queue_browse");
  assertStringIncludes(html, "review_queue_by_reviewer");
  assertEquals(html.includes('value="by_name"'), false);
  assertEquals(html.includes('value="by_clpid"'), false);
  assertEquals(html.includes('value="by_reviewer"'), false);
});

Deno.test("buildSearchTypeOptions(records) includes All Records options and excludes review_queue_* options and browse", () => {
  const html = buildSearchTypeOptions("records");
  assertStringIncludes(html, 'value="by_name"');
  assertStringIncludes(html, 'value="by_clpid"');
  assertStringIncludes(html, 'value="by_reviewer"');
  assertEquals(html.includes("review_queue_browse"), false);
  assertEquals(html.includes("review_queue_by_reviewer"), false);
});
