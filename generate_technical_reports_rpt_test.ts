/**
 * generate_technical_reports_rpt_test.ts
 *
 * Unit tests for the technical reports report. No network access and no
 * datasetd — every test works against recordToRow() and buildCsv(), which are
 * pure.
 *
 * Implements the test plan in
 * agents/projects/cold/plans/technical_reports_report_plan.md, Phase C.
 * Behaviour under test is fixed by DR-0008 (columns, order, sort), DR-0009
 * (zero rows is success: header-only CSV), DR-0011 (the union selection) and
 * DR-0012 (the source is rdm_requests.ds via datasetd, not the API).
 *
 * The input shape is the harvested row as projected by the
 * `technical_reports_selection` named query in cold_api.yaml: flat `rdmid`,
 * `title` and `publication_date`, `resource_type` as the RDM object
 * {"id": ...}, and `custom_fields` verbatim. It is NOT the API's nested
 * `metadata` envelope — that changed with DR-0012.
 *
 * The fixtures are not invented. Each one reproduces a shape counted across
 * all 19,431 rows the named query returns, re-measured 2026-09-18 against
 * rdm_requests.ds as harvested 2026-09-09. The counts in the comments are from
 * that measurement, not from DR-0008's smaller API-era corpus.
 *
 * Run:
 *   deno test generate_technical_reports_rpt_test.ts
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { parse } from "@std/csv";

import {
  buildCsv,
  type HarvestedRecord,
  recordToRow,
} from "./generate_technical_reports_rpt.ts";

/** The column order fixed by DR-0008. Hardcoded here on purpose: asserting
 * against the module's own constant would be tautological. */
const EXPECTED_HEADERS = [
  "rdmid",
  "title",
  "publication_date",
  "resource_type",
  "series",
  "series_number",
  "other_num_name",
  "other_num_id",
  "groups",
];

const TECHNICAL_REPORT_TYPE = "publication-technicalnote";

/**
 * A harvested row, in the shape the named query projects. Overrides are flat —
 * there is no `metadata` envelope to nest through any more.
 */
function makeRecord(overrides: Partial<HarvestedRecord> = {}): HarvestedRecord {
  return {
    rdmid: "abc12-xyz34",
    title: "A Technical Report",
    publication_date: "1975",
    resource_type: { id: TECHNICAL_REPORT_TYPE },
    custom_fields: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// recordToRow — field extraction from the harvested shape
// ---------------------------------------------------------------------------

Deno.test("recordToRow emits one cell per column, in the DR-0008 order", () => {
  const row = recordToRow(makeRecord());
  assertEquals(row.length, EXPECTED_HEADERS.length);
});

Deno.test("recordToRow maps all four custom series fields when populated", () => {
  // Shape of the real record azap5-pte18: all four fields plus two groups.
  const row = recordToRow(makeRecord({
    rdmid: "azap5-pte18",
    title: "Seismotectonics of an evolving intracontinental plate boundary",
    publication_date: "2009",
    custom_fields: {
      "caltech:series": "Special papers (Geological Society of America)",
      "caltech:series_number": "447",
      "caltech:other_num_name": "Caltech Seismological Laboratory",
      "caltech:other_num_id": "10,001",
      "caltech:groups": [
        { id: "Seismological-Laboratory" },
        { id: "Division-of-Geological-and-Planetary-Sciences" },
      ],
    },
  }));

  assertEquals(row[0], "azap5-pte18");
  assertEquals(
    row[1],
    "Seismotectonics of an evolving intracontinental plate boundary",
  );
  assertEquals(row[2], "2009");
  assertEquals(row[3], TECHNICAL_REPORT_TYPE);
  assertEquals(row[4], "Special papers (Geological Society of America)");
  assertEquals(row[5], "447");
  assertEquals(row[6], "Caltech Seismological Laboratory");
  assertEquals(row[7], "10,001");
  assertEquals(
    row[8],
    "Seismological-Laboratory;Division-of-Geological-and-Planetary-Sciences",
  );
});

Deno.test("recordToRow reads rdmid, not the collection key", () => {
  // The collection is keyed by the SUBMITTED version and carries the current
  // version in `rdmid` (DR-0015); the two differ on about a third of the
  // collection. The report must report the record RDM currently serves, so
  // the id comes from the `rdmid` field. The named query does not project the
  // key at all, which makes reading the wrong one impossible here — this test
  // pins the intent so a later change to the projection cannot quietly
  // reintroduce the submitted version.
  const row = recordToRow(makeRecord({ rdmid: "myk7w-z4w06" }));
  assertEquals(row[0], "myk7w-z4w06");
});

Deno.test("recordToRow emits empty strings, not undefined, when no series field is populated", () => {
  // 1,256 of the 19,431 rows are this shape. The cells must be empty strings
  // so the CSV writer does not render "undefined" or "null".
  const row = recordToRow(makeRecord({ custom_fields: {} }));
  for (const i of [4, 5, 6, 7, 8]) {
    assertEquals(row[i], "", `column ${EXPECTED_HEADERS[i]} should be ""`);
    assert(
      typeof row[i] === "string",
      `column ${EXPECTED_HEADERS[i]} should be a string`,
    );
  }
});

Deno.test("recordToRow tolerates a missing custom_fields object entirely", () => {
  const record = makeRecord();
  delete record.custom_fields;
  const row = recordToRow(record);
  assertEquals(row.length, EXPECTED_HEADERS.length);
  assertEquals(row[4], "");
  assertEquals(row[8], "");
});

Deno.test("recordToRow leaves the groups cell empty when a record has no groups", () => {
  // 9,608 of the 19,431 rows have zero groups — half the report, not an edge
  // case.
  const row = recordToRow(makeRecord({
    custom_fields: { "caltech:groups": [] },
  }));
  assertEquals(row[8], "");
});

Deno.test("recordToRow joins multiple group ids with a semicolon, in source order", () => {
  // Group counts across the selection: 7,836 rows carry 1, 1,583 carry 2,
  // 280 carry 3, and the tail runs to 7. No group id anywhere in the 19,431
  // rows contains a semicolon, which is what keeps ";" a safe separator
  // (DR-0008, re-verified 2026-09-18 at the larger scale).
  const row = recordToRow(makeRecord({
    custom_fields: {
      "caltech:groups": [
        { id: "GALCIT" },
        { id: "Hypersonic-Research-Project" },
        { id: "Graduate-Aeronautical-Laboratories-(Fluid-Mechanics)" },
      ],
    },
  }));
  assertEquals(
    row[8],
    "GALCIT;Hypersonic-Research-Project;Graduate-Aeronautical-Laboratories-(Fluid-Mechanics)",
  );
});

Deno.test("recordToRow preserves a title containing an embedded newline", () => {
  // 271 rows have this. The cell must carry the newline through; it is the
  // CSV writer's job to quote it, not recordToRow's job to strip it.
  const title = "A Report Title\nWith An Embedded Newline";
  const row = recordToRow(makeRecord({ title, publication_date: "1968" }));
  assertEquals(row[1], title);
});

Deno.test("recordToRow preserves a series value containing a comma", () => {
  // 73 rows have this.
  const series = "Special papers, Geological Society of America";
  const row = recordToRow(makeRecord({
    custom_fields: { "caltech:series": series },
  }));
  assertEquals(row[4], series);
});

Deno.test("recordToRow passes each publication_date precision through verbatim", () => {
  // Counts across the selection: 9,256 YYYY-MM-DD, 6,614 YYYY-MM, 3,561
  // YYYY. Never reformatted, never parsed as a Date — the field is free-form
  // in RDM.
  for (const date of ["1975", "1975-06", "1975-06-15"]) {
    const row = recordToRow(makeRecord({ publication_date: date }));
    assertEquals(row[2], date);
  }
});

// ---------------------------------------------------------------------------
// resource_type — an object in the harvested shape, and no longer constant
// ---------------------------------------------------------------------------

Deno.test("recordToRow reads resource_type.id out of the object, not the object itself", () => {
  // DR-0022: the harvested field is the RDM object {"id": ...}, never a bare
  // id string. Reading `resource_type` directly would put "[object Object]"
  // in the cell — this is the test that catches it.
  const row = recordToRow(makeRecord());
  assertEquals(row[3], TECHNICAL_REPORT_TYPE);
  assert(!row[3].includes("object"), "must not stringify the whole object");
});

Deno.test("recordToRow reports the resource type id across every type the union admits", () => {
  // The column is no longer constant: DR-0011's union spans 16 distinct
  // resource types, and the two largest are not Technical Reports at all —
  // publication-section (7,830) and publication-article (7,152). The whole
  // point of use 2 is spotting a record whose type is wrong, so this column
  // must carry the real type rather than the type the report is named after.
  for (
    const id of [
      "publication-section",
      "publication-article",
      TECHNICAL_REPORT_TYPE,
      "publication-workingpaper",
      "conference-paper",
    ]
  ) {
    const row = recordToRow(makeRecord({ resource_type: { id } }));
    assertEquals(row[3], id);
  }
});

Deno.test("recordToRow emits an empty cell when resource_type is absent", () => {
  // No row in the harvest is missing resource_type today (verified: 0 of
  // 19,431). This is a guard, not a described shape — an absent type must not
  // become "undefined" in the CSV, and the report must not throw on it.
  const record = makeRecord();
  delete record.resource_type;
  const row = recordToRow(record);
  assertEquals(row[3], "");
});

// ---------------------------------------------------------------------------
// The union — both halves must reach the output (DR-0011)
// ---------------------------------------------------------------------------

Deno.test("buildCsv emits a Technical Report carrying no series metadata (union first half, use 1)", () => {
  // 1,256 rows are typed publication-technicalnote with all four series
  // fields empty. They are in the report ONLY because of the union's first
  // half — a series-field filter would drop every one of them — and they are
  // precisely what use 1 (technical reports with incomplete metadata) exists
  // to surface. This is the regression test for that half.
  const rows = parse(buildCsv([
    makeRecord({ rdmid: "bare-tn", custom_fields: {} }),
  ]));
  assertEquals(rows.length, 2, "the row must not be filtered out");
  assertEquals(rows[1][0], "bare-tn");
  assertEquals(rows[1][3], TECHNICAL_REPORT_TYPE);
  assertEquals(rows[1].slice(4), ["", "", "", "", ""]);
});

Deno.test("buildCsv emits a series-bearing record of another type (union second half, use 2)", () => {
  // 17,247 rows are in the report because they carry series metadata while
  // being typed as something else. A misclassified technical report can only
  // appear here, so a type-restricted report cannot serve use 2 at all.
  const rows = parse(buildCsv([
    makeRecord({
      rdmid: "misfiled",
      resource_type: { id: "publication-article" },
      custom_fields: {
        "caltech:other_num_name": "DOE-Caltech",
        "caltech:other_num_id": "0004993",
      },
    }),
  ]));
  assertEquals(rows.length, 2);
  assertEquals(rows[1][3], "publication-article");
  assertEquals(rows[1][6], "DOE-Caltech");
  assertEquals(rows[1][7], "0004993");
});

// ---------------------------------------------------------------------------
// buildCsv — header, sort, and DR-0009's empty case
// ---------------------------------------------------------------------------

Deno.test("buildCsv emits the DR-0008 header row", () => {
  const rows = parse(buildCsv([makeRecord()]));
  assertEquals(rows[0], EXPECTED_HEADERS);
});

Deno.test("buildCsv emits a header-only CSV for zero records and does not throw (DR-0009)", () => {
  // A correct empty result must not reach the runner as a failure, and must
  // still open in a spreadsheet. Header only, no data rows.
  const csv = buildCsv([]);
  const rows = parse(csv);
  assertEquals(rows.length, 1);
  assertEquals(rows[0], EXPECTED_HEADERS);
});

Deno.test("buildCsv sorts by series, then series_number, then title (DR-0008)", () => {
  const records = [
    makeRecord({
      rdmid: "c",
      title: "Zebra",
      publication_date: "1970",
      custom_fields: {
        "caltech:series": "EERL Report",
        "caltech:series_number": "1",
      },
    }),
    makeRecord({
      rdmid: "a",
      title: "Apple",
      publication_date: "1970",
      custom_fields: {
        "caltech:series": "ACM Technical Reports",
        "caltech:series_number": "5",
      },
    }),
    makeRecord({
      rdmid: "b",
      title: "Apple",
      publication_date: "1970",
      custom_fields: {
        "caltech:series": "EERL Report",
        "caltech:series_number": "1",
      },
    }),
  ];
  const rows = parse(buildCsv(records));
  // ACM sorts before EERL; within EERL/1, "Apple" before "Zebra".
  assertEquals(rows.slice(1).map((r) => r[0]), ["a", "b", "c"]);
});

Deno.test("buildCsv sorts series_number as a string, so 10 precedes 9 (DR-0008, accepted)", () => {
  // Documented rather than fixed: DR-0008 accepted string ordering instead
  // of adding a natural sort. This assertion exists so the behaviour reads
  // as a decision, not as an undiscovered defect.
  const records = ["9", "10"].map((n) =>
    makeRecord({
      rdmid: `n${n}`,
      custom_fields: {
        "caltech:series": "EERL Report",
        "caltech:series_number": n,
      },
    })
  );
  const rows = parse(buildCsv(records));
  assertEquals(rows.slice(1).map((r) => r[0]), ["n10", "n9"]);
});

Deno.test("buildCsv places records with no series after those with one", () => {
  // 1,256 rows have an empty series. Empty string sorts first by default,
  // which would bury the populated rows the report exists to show.
  const records = [
    makeRecord({ rdmid: "empty", custom_fields: {} }),
    makeRecord({
      rdmid: "populated",
      custom_fields: { "caltech:series": "EERL Report" },
    }),
  ];
  const rows = parse(buildCsv(records));
  assertEquals(rows.slice(1).map((r) => r[0]), ["populated", "empty"]);
});

Deno.test("buildCsv keeps each row's own resource_type through the sort", () => {
  // The sort reorders rows by series; resource_type must travel with its own
  // row. Mixing types is now the normal case rather than an edge one, and a
  // column that detached from its row would misreport exactly the
  // misclassification use 2 is looking for.
  const records = [
    makeRecord({
      rdmid: "sec",
      resource_type: { id: "publication-section" },
      custom_fields: { "caltech:series": "Z Series" },
    }),
    makeRecord({
      rdmid: "art",
      resource_type: { id: "publication-article" },
      custom_fields: { "caltech:series": "A Series" },
    }),
    makeRecord({
      rdmid: "tn",
      resource_type: { id: TECHNICAL_REPORT_TYPE },
      custom_fields: { "caltech:series": "M Series" },
    }),
  ];
  const rows = parse(buildCsv(records));
  assertEquals(
    rows.slice(1).map((r) => [r[0], r[3]]),
    [
      ["art", "publication-article"],
      ["tn", TECHNICAL_REPORT_TYPE],
      ["sec", "publication-section"],
    ],
  );
});

// ---------------------------------------------------------------------------
// CSV integrity — the real assertion behind the newline and comma fixtures
// ---------------------------------------------------------------------------

Deno.test("buildCsv round-trips a title with a newline and a series with a comma", () => {
  const title = "A Report Title\nWith An Embedded Newline";
  const series = "Special papers, Geological Society of America";
  const csv = buildCsv([
    makeRecord({
      rdmid: "round-trip",
      title,
      publication_date: "1975-06-15",
      custom_fields: {
        "caltech:series": series,
        "caltech:groups": [{ id: "GALCIT" }],
      },
    }),
  ]);

  const rows = parse(csv);
  assertEquals(rows.length, 2, "one header row plus one data row");
  const row = rows[1];
  assertEquals(row.length, EXPECTED_HEADERS.length, "no column shift");
  assertEquals(row[1], title, "newline survived quoting");
  assertEquals(row[4], series, "comma survived quoting");
  assertEquals(row[8], "GALCIT");
});

Deno.test("buildCsv ends with exactly one CRLF and no trailing blank record", () => {
  // The output is written to stdout verbatim, so its terminator is the
  // file's terminator. console.log would append a bare LF after this CRLF
  // and leave a malformed blank record at the end of the report.
  for (const records of [[], [makeRecord()]]) {
    const csv = buildCsv(records);
    assert(csv.endsWith("\r\n"), "should end with a CRLF");
    assert(!csv.endsWith("\r\n\r\n"), "should not end with a blank record");
    assert(!csv.endsWith("\n\n"), "should not end with a doubled newline");
  }
});

Deno.test("buildCsv parses back to exactly the rows it was given, with no phantom trailing row", () => {
  const rows = parse(
    buildCsv([makeRecord(), makeRecord({ rdmid: "second" })]),
  );
  assertEquals(rows.length, 3, "one header row plus two data rows");
});

Deno.test("buildCsv quotes the fields that need it rather than emitting them raw", () => {
  const csv = buildCsv([
    makeRecord({ title: "Line one\nLine two" }),
  ]);
  assertStringIncludes(csv, `"Line one\nLine two"`);
});
