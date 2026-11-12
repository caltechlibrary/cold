/**
 * people_sync_view.ts is the logic behind COLD's people sync page and person
 * action (cold#122, DR-0032, plan Phase 5). It decides what state a user is
 * shown, whether the button may be pressed, and how a stored item becomes a row
 * a person can act on. It has no browser or Deno dependency so it is tested
 * directly; people_sync_page.ts renders it.
 *
 * COLD is the authority for identity and RDM v13's names routes are GET only, so
 * a person cannot correct an RDM entry by hand: fixes are made in COLD and the
 * sync is rerun for that person. Nothing here writes a decision back.
 */
import { isValidClpid } from "./validator.ts";

/** The report names the sync's buttons file (cold_reports.yaml). */
export const SYNC_REPORT_NAMES = ["run_people_sync", "run_people_sync_person"];

/** SyncRequest is a row of the report list, as the reports API returns it. */
export interface SyncRequest {
  id: string;
  report_name: string;
  status: string;
  requested?: string;
  updated: string;
  link?: string;
}

/** RunRow is a row of people_sync_runs.ds. */
export interface RunRow {
  run_id: string;
  request_id: string;
  trigger: string;
  scope: string;
  rdm_url: string;
  mode: string;
  state: string;
  started: string;
  finished: string;
  counts: Record<string, unknown>;
  error?: string;
  program_hash?: string;
  irdmtools_version?: string;
}

/** Detail is the structured part of an item (irdmtools people_rdm_match.py). */
export interface Detail {
  fix?: "cold" | "rdm";
  cold?: Record<string, { orcid: string; isni: string }>;
  rdm?: {
    ids: string[];
    clpids: string[];
    orcids: string[];
    isnis: string[];
  };
}

/** ItemRow is a row of people_sync_items.ds. */
export interface ItemRow {
  run_id: string;
  clpid: string;
  rdm_id: string | null;
  action: string;
  outcome: string;
  message: string;
  scheme: string;
  value: string;
  recorded: string;
  status?: string;
  detail?: Detail;
}

/** SyncState is what the page shows the user. */
export type SyncState =
  | "never"
  | "pending"
  | "running"
  | "error"
  | "stalled"
  | "completed_review"
  | "completed_clean";

/** SyncView is the state of the page, with the words to show for it. */
export interface SyncView {
  state: SyncState;
  headline: string;
  canStart: boolean;
  dryRun: boolean;
  reviewCount: number;
}

/** reviewCount counts the items in a run that need a person: needs_human,
 * needs_repair and warning.
 *
 * @param run {RunRow|undefined} the run
 * @returns {number} how many items need a person; 0 for no run or no counts
 * @example
 * reviewCount(run); // 9
 */
export function reviewCount(run: RunRow | undefined): number {
  const c = run?.counts ?? {};
  return ["needs_human", "needs_repair", "warning"].reduce(
    (n, k) => n + (typeof c[k] === "number" ? c[k] as number : 0),
    0,
  );
}

/** latestSyncRequest picks the newest sync request from the report list.
 *
 * @param reports {SyncRequest[]} the report list (any reports)
 * @returns {SyncRequest|undefined} the newest request filed through a sync button, if any
 * @example
 * const latest = latestSyncRequest(await (await fetch("/api/reports.ds/report_list")).json());
 */
export function latestSyncRequest(
  reports: SyncRequest[],
): SyncRequest | undefined {
  return reports
    .filter((r) => SYNC_REPORT_NAMES.includes(r.report_name))
    .sort((a, b) => String(b.updated).localeCompare(String(a.updated)))[0];
}

/** ownRunError returns the failure reason of the run a request started, or
 * "" when the latest run is not that run: one recorded before the request was
 * filed is some earlier sync's, and must not be shown as this one's reason.
 * A second of clock skew between the report runner and the run row is allowed.
 *
 * @param request {SyncRequest} the failed request
 * @param run {RunRow|undefined} the latest run
 * @returns {string} the run's recorded error, or ""
 * @example
 * ownRunError(request, run); // "the preflight on … failed (exit 255): …"
 */
function ownRunError(
  request: SyncRequest | undefined,
  run: RunRow | undefined,
): string {
  if (
    !request || !run || run.state !== "error" || !run.error ||
    !request.requested
  ) {
    return "";
  }
  const asked = Date.parse(request.requested);
  const started = Date.parse(`${run.started.replace(" ", "T")}Z`);
  return Number.isFinite(asked) && Number.isFinite(started) &&
      started >= asked - 1000
    ? run.error
    : "";
}

/** syncView turns the newest sync request and the latest run into the state
 * shown to the user. The request says whether a sync is waiting, running or
 * failed to run; the run row says what it found. State has these two sources
 * only (DR-0032 decision 5).
 *
 * @param request {SyncRequest|undefined} the newest sync request
 * @param run {RunRow|undefined} the latest run
 * @returns {SyncView} the state, its words, and whether the button may be pressed
 * @example
 * const v = syncView(latestSyncRequest(reports), latestRun);
 */
export function syncView(
  request: SyncRequest | undefined,
  run: RunRow | undefined,
): SyncView {
  const dryRun = run?.mode === "dry-run";
  const n = reviewCount(run);
  const view = (
    state: SyncState,
    headline: string,
    canStart: boolean,
  ): SyncView => ({ state, headline, canStart, dryRun, reviewCount: n });
  switch (request?.status) {
    case "requested":
      return view("pending", "A sync is waiting to start.", false);
    case "processing":
      return view("running", "A sync is running.", false);
    case undefined:
    case "completed":
      break;
    default: {
      // The runner keeps only "exited with code N"; the reason is on the run
      // the request started, if it got as far as recording one.
      const reason = ownRunError(request, run);
      return view(
        "error",
        reason
          ? `The last sync request failed: ${reason}.`
          : "The last sync request failed before it recorded a run. See the reports list for details.",
        true,
      );
    }
  }
  if (run === undefined) {
    return view("never", "No sync has run yet.", true);
  }
  if (run.state === "running") {
    return view(
      "stalled",
      `The sync that started ${run.started} did not finish.`,
      true,
    );
  }
  if (run.state === "error") {
    return view(
      "error",
      `The last sync failed: ${run.error || "no reason was recorded"}.`,
      true,
    );
  }
  const prefix = dryRun ? "Dry run completed" : "Completed";
  if (n > 0) {
    return view(
      "completed_review",
      `${prefix} ${run.finished}: ${n} ${
        n === 1 ? "item needs" : "items need"
      } a person.`,
      true,
    );
  }
  return view(
    "completed_clean",
    `${prefix} ${run.finished}: nothing needs review.`,
    true,
  );
}

/** startRequest builds the form body that files a sync request through
 * POST /reports. A clpid selects the one-person sync; it must be one COLD
 * would accept. The request says a person started it (`trigger=human`), which
 * the report runner records on the run; a bare POST, as cron sends, is `cron`.
 *
 * @param clpid {string|undefined} the person, or undefined for everyone
 * @returns {URLSearchParams} the request body
 * @example
 * startRequest("Doe-Jane").toString();
 * // "report_name=run_people_sync_person&clpid=Doe-Jane&trigger=human"
 */
export function startRequest(clpid?: string): URLSearchParams {
  if (clpid === undefined) {
    return new URLSearchParams({
      report_name: "run_people_sync",
      trigger: "human",
    });
  }
  if (!isValidClpid(clpid)) {
    throw new Error(`${JSON.stringify(clpid)} is not a valid clpid`);
  }
  return new URLSearchParams({
    report_name: "run_people_sync_person",
    clpid,
    trigger: "human",
  });
}

/** personHref links to one person's page in COLD's People area.
 *
 * @param base {string} the People area, relative to the page, such as "./people/"
 * @param clpid {string} the person
 * @returns {string} the link, with the clpid encoded
 * @example
 * personHref("./people/", "Doe-Jane"); // "./people/Doe-Jane"
 */
export function personHref(base: string, clpid: string): string {
  return `${base.replace(/\/*$/, "/")}${encodeURIComponent(clpid)}`;
}

/** ItemView is one item as the page shows it. Every field is text or a list
 * of text; the page must render it as text, never as markup. */
export interface ItemView {
  outcome: string;
  outcomeLabel: string;
  statusLabel: string;
  action: string;
  message: string;
  clpid: string;
  people: { clpid: string; href: string }[];
  cold: { clpid: string; orcid: string; isni: string }[];
  rdm: NonNullable<Detail["rdm"]> | null;
  rdmLinks: { id: string; href: string; label: string; title: string }[];
  rerun: string[];
  fixInCold: boolean;
  fixNote: string;
}

/** rdmLinkText words an RDM entry link: what it opens, and what it is not.
 * The link goes to RDM's JSON API for a person (a names entry). It is not a
 * metadata record, which a librarian might otherwise expect. The accessible
 * name starts with the visible id so it matches what a sighted user reads.
 *
 * @param id {string} the names entry id
 * @returns {{label: string, title: string}} the aria-label and the hover title
 * @example
 * rdmLinkText("abcde-12345").label;
 * // "abcde-12345, JSON API entry for a person in RDM, not a metadata record"
 */
export function rdmLinkText(id: string): { label: string; title: string } {
  const text =
    `${id}, JSON API entry for a person in RDM, not a metadata record`;
  return { label: text, title: text };
}

/** rdmEntryHref links to one RDM names entry. RDM v13 serves a names entry
 * as JSON at /api/names/{id} and has no edit route for it, so the link takes a
 * person to the exact record, not to a form. Only an http(s) base is used: the
 * base comes from stored data and must never become a script URL.
 *
 * @param base {string} the instance's URL, such as "https://authors.example.test"
 * @param id {string} the names entry id
 * @returns {string} the link, or "" when the base is not an http(s) URL
 * @example
 * rdmEntryHref("https://authors.example.test", "abcde-12345");
 * // "https://authors.example.test/api/names/abcde-12345"
 */
export function rdmEntryHref(base: string, id: string): string {
  return /^https?:\/\/[^\s/]/i.test(base)
    ? `${base.replace(/\/+$/, "")}/api/names/${encodeURIComponent(id)}`
    : "";
}

const OUTCOME_LABEL: Record<string, string> = {
  needs_human: "Needs a person to decide",
  needs_repair: "Needs repair in RDM",
  warning: "Warning",
  applied: "Applied change",
};

const STATUS_LABEL: Record<string, string> = {
  would_create: "Would be created (dry run)",
  would_update: "Would be updated (dry run)",
  created: "Created in RDM",
  updated: "Updated in RDM",
  skipped: "Skipped: RDM changed since the plan was made",
  error: "Failed",
  not_attempted: "Not attempted",
};

/** itemView turns a stored item into a row a person can act on: the COLD
 * people to open, both sides of the disagreement, where the fix can be made
 * and which people can have the sync rerun.
 *
 * @param item {ItemRow} the stored item
 * @param peopleBase {string} the People area relative to the page, such as "./people/"
 * @param rdmBase {string} the RDM instance the run targeted (its `rdm_url`); with an http(s) URL each RDM entry id becomes a link to that entry
 * @returns {ItemView} the row
 * @example
 * const v = itemView(item, "./people/");
 */
export function itemView(
  item: ItemRow,
  peopleBase: string,
  rdmBase = "",
): ItemView {
  const base: ItemView = {
    outcome: item.outcome,
    outcomeLabel: OUTCOME_LABEL[item.outcome] ?? item.outcome,
    statusLabel: item.status ? (STATUS_LABEL[item.status] ?? item.status) : "",
    action: item.action,
    message: item.message,
    clpid: item.clpid,
    people: [],
    cold: [],
    rdm: null,
    rdmLinks: [],
    rerun: [],
    fixInCold: false,
    fixNote: "",
  };
  if (item.outcome === "applied") {
    // An applied item is about a COLD person by construction.
    return {
      ...base,
      people: [{ clpid: item.clpid, href: personHref(peopleBase, item.clpid) }],
    };
  }
  const d = item.detail;
  if (d === undefined || d.fix === undefined) {
    return {
      ...base,
      fixNote:
        "No detail was recorded for this item (it predates the detail field); rerun the sync to record it.",
    };
  }
  const clpids = Object.keys(d.cold ?? {}).sort();
  const fixInCold = d.fix === "cold";
  return {
    ...base,
    people: clpids.map((c) => ({ clpid: c, href: personHref(peopleBase, c) })),
    cold: clpids.map((c) => ({ clpid: c, ...d.cold![c] })),
    rdm: d.rdm && Object.keys(d.rdm).length > 0 ? d.rdm : null,
    rdmLinks: (d.rdm?.ids ?? []).flatMap((id) => {
      const href = rdmEntryHref(rdmBase, id);
      return href ? [{ id, href, ...rdmLinkText(id) }] : [];
    }),
    rerun: fixInCold ? clpids : [],
    fixInCold,
    fixNote: fixInCold
      ? "Fix this in COLD, then rerun the sync for the person. If the RDM value is the wrong one, correcting it is outside COLD."
      : "The fix is outside COLD: the entry lives in RDM, and this stays listed until it is corrected there.",
  };
}
