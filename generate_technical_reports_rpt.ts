/**
 * generate_technical_reports_rpt.ts generates the technical reports report —
 * a metadata triage tool for CaltechAUTHORS technical reports and the records
 * that ought to be them, as CSV on standard output.
 *
 * Requested in https://github.com/caltechlibrary/cold/issues/105.
 *
 * The selection is the UNION of every record typed
 * `publication-technicalnote` and every record carrying any of the four custom
 * series fields (DR-0011). The union is not a convenience: the report's second
 * use is finding records *misclassified* as another type, and a
 * type-restricted query cannot surface those by definition. It follows that
 * `resource_type` varies across the output — 16 distinct types, the two
 * largest of which are not Technical Reports at all.
 *
 * Roughly 1,256 rows carry no series metadata whatsoever. Every one of them is
 * typed `publication-technicalnote`, and they are in the report only because
 * of the union's first half. That is the design — it is what the first use,
 * "technical reports with incomplete metadata", asks for — and not a defect.
 *
 * The data comes from `rdm_requests.ds` through datasetd, not from the
 * CaltechAUTHORS API (DR-0012). SQLite has no result window, so the
 * slice-and-page machinery DR-0011 designed for the API's 10,000-result limit
 * is gone entirely. One consequence carries: the report is only as fresh as
 * the last harvest.
 *
 * Records fixing this program's behaviour:
 *   DR-0001  a report writes to stdout; the runner owns placement and status
 *   DR-0008  columns, column order, sort
 *   DR-0009  zero rows is success — header-only CSV, exit 0
 *   DR-0011  the union selection, and why it is a union
 *   DR-0012  source from rdm_requests.ds via a datasetd named query
 *   DR-0022  filter record_state, NOT is_latest
 *
 * Design brief and plan:
 *   agents/projects/cold/design/technical_reports_report.md
 *   agents/projects/cold/plans/technical_reports_report_plan.md
 */
import { parseArgs } from "@std/cli";
import { stringify } from "@std/csv";

import { apiPort, Dataset } from "./deps.ts";
import { licenseText, releaseDate, releaseHash, version } from "./version.ts";
import { fmtHelp, generateTechnicalReportsRptHelpText } from "./helptext.ts";

const appName = "generate_technical_reports_rpt";

const COLLECTION = "rdm_requests.ds";

/**
 * The named query in `cold_api.yaml` that owns the selection. The whole of
 * DR-0011's union lives there as SQL, which is why this program builds no
 * query and takes no parameters — it maps and formats rows, nothing more.
 */
const QUERY_NAME = "technical_reports_selection";

const ds = new Dataset(apiPort, COLLECTION);

/**
 * The report's columns, in the order fixed by DR-0008. `resource_type` is not
 * constant in this report — it is the column that makes a misclassified record
 * visible, which is the point of the union.
 */
const HEADERS = [
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

/**
 * One harvested row, in the shape the named query projects: flat `rdmid`,
 * `title` and `publication_date`, `resource_type` as the RDM object it is
 * stored as, and `custom_fields` verbatim. This is NOT the CaltechAUTHORS
 * API's nested `metadata` envelope — the shape changed with DR-0012, and the
 * query deliberately projects the harvested field names unaltered so that the
 * mapping below reads the same paths the collection uses.
 *
 * `resource_type` and `custom_fields` are optional because a row missing
 * either must yield empty cells rather than `"undefined"` or a thrown error.
 * Neither is actually absent from the harvest today — verified across all
 * 19,431 rows — so both are guards, not described shapes.
 *
 * Every custom series field is a single string, never an array.
 * `caltech:groups` is the only array among them.
 */
export interface HarvestedRecord {
  rdmid: string;
  title: string;
  publication_date: string;
  resource_type?: { id?: string };
  custom_fields?: {
    "caltech:series"?: string;
    "caltech:series_number"?: string;
    "caltech:other_num_name"?: string;
    "caltech:other_num_id"?: string;
    "caltech:groups"?: Array<{ id?: string }>;
  };
}

/**
 * recordToRow maps one harvested row to one CSV row in the DR-0008 column
 * order.
 *
 * Every cell is a string, never undefined — 1,256 rows have no series metadata
 * at all, and an undefined cell would render as "undefined" in the output.
 * Values are passed through verbatim: `publication_date` is free-form in RDM
 * (year, year-month or full date, all three present in the data) and must not
 * be reformatted or parsed as a Date, and embedded newlines and commas are
 * left for the CSV writer to quote rather than stripped here.
 *
 * `resource_type` is read as `.id` out of the object. Reading the field itself
 * would put "[object Object]" in the cell — the same trap the named query has
 * to avoid one layer down (DR-0022).
 */
export function recordToRow(record: HarvestedRecord): string[] {
  const cf = record.custom_fields ?? {};
  // No group id anywhere in the 19,431 selected rows contains a semicolon
  // (re-verified 2026-09-18 at this scale), which is what makes ";" safe.
  const groups = (cf["caltech:groups"] ?? [])
    .map((g) => g.id ?? "")
    .filter((id) => id !== "")
    .join(";");

  return [
    record.rdmid ?? "",
    record.title ?? "",
    record.publication_date ?? "",
    record.resource_type?.id ?? "",
    cf["caltech:series"] ?? "",
    cf["caltech:series_number"] ?? "",
    cf["caltech:other_num_name"] ?? "",
    cf["caltech:other_num_id"] ?? "",
    groups,
  ];
}

/**
 * compareRows orders rows by series, then series_number, then title (DR-0008).
 *
 * Rows with no series sort last. A plain string sort would put the empty string
 * first and bury every series-numbered row beneath ~1,256 blanks, which defeats
 * the point of a report about report series.
 *
 * `series_number` compares as a string, so "10" precedes "9". DR-0008 accepted
 * that rather than adding a natural sort; it is asserted in the test suite so
 * it reads as a decision rather than an undiscovered defect.
 */
function compareRows(a: string[], b: string[]): number {
  const aSeries = a[4];
  const bSeries = b[4];
  if (aSeries === "" && bSeries !== "") return 1;
  if (aSeries !== "" && bSeries === "") return -1;

  const bySeries = aSeries.localeCompare(bSeries);
  if (bySeries !== 0) return bySeries;

  const byNumber = a[5].localeCompare(b[5]);
  if (byNumber !== 0) return byNumber;

  return a[1].localeCompare(b[1]);
}

/**
 * buildCsv renders the records as CSV text: the header row followed by one
 * sorted row per record.
 *
 * An empty record list yields a header-only CSV rather than an empty string or
 * an error (DR-0009). A COLD report is not a search tool — zero rows is a
 * successful result, and the requester should receive a file that opens and
 * shows column names rather than a zero-byte download indistinguishable from a
 * truncation bug.
 *
 * The sort is stable over the query's `ORDER BY rdmid`, so the same harvest
 * produces a byte-identical report.
 *
 * The returned text is complete and ready to write verbatim: CRLF-terminated
 * per RFC 4180 (what `@std/csv` emits and what spreadsheets expect), ending
 * with exactly one terminator and no trailing blank record.
 */
export function buildCsv(records: HarvestedRecord[]): string {
  const rows = records.map(recordToRow).sort(compareRows);
  return stringify([HEADERS, ...rows]);
}

/**
 * run_report queries the collection and writes the CSV to stdout.
 *
 * The undefined check is not defensive clutter — it is the difference between
 * DR-0009 and a silent failure. `Dataset.query()` returns `undefined` for any
 * non-ok response and swallows the cause, while a genuinely empty result comes
 * back as `[]` with HTTP 200 (both verified against datasetd on 2026-09-18).
 * Conflating them would emit a header-only CSV and exit 0 when datasetd is
 * down or the query is missing — the runner would mark the report completed
 * and hand the requester an empty file. Zero rows is success; a failed request
 * is not.
 *
 * Progress goes to stderr so that stdout carries nothing but CSV — the runner
 * reads stdout (DR-0001).
 *
 * The CSV is written to stdout directly rather than with console.log, which
 * would append a bare LF after the CSV's own trailing CRLF and leave the file
 * ending in a malformed blank record.
 */
export async function run_report(): Promise<void> {
  console.error(`Querying ${COLLECTION} for ${QUERY_NAME}...`);

  const results = await ds.query(QUERY_NAME, [], {});
  if (results === undefined) {
    throw new Error(
      `query "${QUERY_NAME}" on ${COLLECTION} failed; ` +
        `is datasetd running on port ${apiPort} and does cold_api.yaml ` +
        `define the query? See the datasetd log for the cause.`,
    );
  }

  const records = (results ?? []) as HarvestedRecord[];
  console.error(`Retrieved ${records.length} records.`);

  await Deno.stdout.write(new TextEncoder().encode(buildCsv(records)));
}

async function main() {
  const app = parseArgs(Deno.args, {
    alias: { help: "h", license: "l", version: "v" },
    default: { help: false, version: false, license: false },
  });

  if (app.help) {
    console.log(
      fmtHelp(
        generateTechnicalReportsRptHelpText,
        appName,
        version,
        releaseDate,
        releaseHash,
      ),
    );
    Deno.exit(0);
  }
  if (app.version) {
    console.log(`${appName} ${version} ${releaseHash}`);
    Deno.exit(0);
  }
  if (app.license) {
    console.log(licenseText);
    Deno.exit(0);
  }

  // This report takes no arguments, so it has no usage-error path. Per
  // DR-0009 it exits 0 whenever it ran to completion — including on an empty
  // result set, which is a successful outcome and not a failure the runner
  // should report as one. A non-zero exit here means the query genuinely
  // failed; 2 is the workspace convention's code for an I/O error, which
  // DR-0009 left in force.
  try {
    await run_report();
  } catch (err) {
    console.error(
      `${appName}: ${err instanceof Error ? err.message : String(err)}`,
    );
    Deno.exit(2);
  }
}

if (import.meta.main) await main();
