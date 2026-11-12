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

/** Detail is the structured part of an item (irdmtools people_rdm_match.py).
 * `fix`, `cold` and `rdm` belong to items an earlier build stored; the push
 * (cold DR-0037) records `changes`, and on a replace `persons`, `replaced_by`
 * and `names` (COLD's name form for each person). */
export interface Detail {
  changes?: string[];
  persons?: string[];
  replaced_by?: string;
  names?: Record<string, string>;
  legacy_ids?: string[];
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
  result_message?: string;
  /** the entry as it was, and as the push wrote it, where the action has one */
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
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

/** personOutcomeText says, for the person page, what the latest sync that
 * covered this person found. A person with nothing to report has no item row,
 * so an item can only be called their outcome when it belongs to the latest
 * run that covered them: an older item has been superseded by a run that
 * reported nothing (the person's problem was fixed), and showing it as current
 * would make a fixed record look broken.
 *
 * @param item {ItemRow|undefined} the newest item recorded for the person, if any
 * @param run {RunRow|undefined} the newest run that covered the person: a full run or their own
 * @returns {string} one sentence for the person page
 * @example
 * personOutcomeText(undefined, run); // "Latest sync (2026-11-12 18:42:52, dry run: RDM was not changed): nothing to report for this person."
 */
export function personOutcomeText(
  item: ItemRow | undefined,
  run: RunRow | undefined,
): string {
  if (!run) return "This person has not been covered by a sync yet.";
  if (run.state === "running") {
    return `A sync that covers this person is running (started ${run.started}).`;
  }
  if (run.state === "error") {
    return `The last sync that covered this person failed (${run.started}): ${
      run.error || "no reason was recorded"
    }.`;
  }
  if (item && item.run_id === run.run_id) {
    const v = itemView(item, "./");
    return `Latest outcome (${item.recorded}): ${v.outcomeLabel}${
      v.statusLabel ? `, ${v.statusLabel}` : ""
    }. ${v.message}`;
  }
  const how = run.mode === "dry-run"
    ? "dry run: RDM was not changed"
    : "applied";
  return `Latest sync (${run.started}, ${how}): nothing to report for this person.`;
}

/** NextTarget is what `/rdm/people_sync/target` answers: where the next run goes. */
export interface NextTarget {
  mode: string;
  rdm_url: string;
  transport: string;
}

/** targetText says in words where the next sync will go and whether it will
 * write, or that it cannot tell. Nothing rests on colour or position.
 *
 * @param t {NextTarget|{error: string}} the target, or why it could not be read
 * @returns {string} one sentence for the status area
 * @example
 * targetText({ mode: "dry-run", rdm_url: "https://a.test", transport: "ssm" });
 * // "Dry run: the next run will read RDM at https://a.test (over ssm) and change nothing"
 */
export function targetText(t: NextTarget | { error: string }): string {
  if ("error" in t) return `The next run's target is unknown: ${t.error}`;
  const where = `RDM at ${t.rdm_url} (over ${t.transport})`;
  if (t.mode === "dry-run") {
    return `Dry run: the next run will read ${where} and change nothing`;
  }
  if (t.mode === "apply") return `Apply: the next run will write to ${where}`;
  return `Unknown mode "${t.mode}" for the next run at ${where}; treat it as writing`;
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
  /** what the action does, in words (the stored action when it is not one of the push's) */
  actionLabel: string;
  /** the name RDM held and the name COLD gives, when the push changes a name */
  nameChange: { from: string; to: string } | null;
  /** the program's message about what happened to the item, as text */
  resultMessage: string;
  /** what the row is about when it links no COLD person (an RDM entry, say); "" when it links one */
  whoLabel: string;
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
    `${id}, JSON API entry for a person in RDM, not a metadata record; you must be signed in to RDM to read it`;
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
  applied: "Change made by the push",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Create the entry",
  update: "Update the entry",
  revive: "Restore a removed entry",
  replace: "Replace a legacy entry",
  remove: "Remove an entry COLD does not hold",
  malformed_identifier: "Malformed identifier in COLD",
  id_deleted: "Entry id used by a removed entry",
  stale_entry: "Entry has keys RDM rejects",
  not_in_cold: "Person not in COLD",
};

const STATUS_LABEL: Record<string, string> = {
  would_create: "Would be created (dry run)",
  would_update: "Would be updated (dry run)",
  would_revive: "Removed entry would be restored (dry run)",
  would_replace: "Legacy entry would be removed (dry run)",
  would_remove: "Would be removed (dry run)",
  created: "Created in RDM",
  updated: "Updated in RDM",
  revived: "Entry restored in RDM",
  replaced: "Legacy entry removed in RDM",
  removed: "Removed from RDM",
  skipped: "Skipped: RDM changed since the plan was made",
  error: "Failed",
  not_attempted: "Not attempted",
};

const HOW_TO_FIX: Record<string, { inCold: boolean; note: string }> = {
  malformed_identifier: {
    inCold: true,
    note:
      "Fix the ORCID or ISNI in COLD, then push the person again. Until then the value is not written to RDM.",
  },
  id_deleted: {
    inCold: false,
    note:
      "RDM holds a removed entry with this id, so the person cannot be written under it. A person has to decide: restore the entry in RDM or give the person a different id. This stays listed until then.",
  },
  stale_entry: {
    inCold: false,
    note:
      "The fix is outside COLD: the entry in RDM carries keys the service rejects, so it cannot be updated. This stays listed until it is corrected there.",
  },
  not_in_cold: {
    inCold: false,
    note:
      "COLD does not hold this person, so nothing was pushed. A person deleted in COLD leaves RDM at the next full push.",
  },
};

const PERSON_ACTIONS = [
  "create",
  "update",
  "malformed_identifier",
  "id_deleted",
  "stale_entry",
];

/** whoLabel says what a row is about when no COLD person is linked. It names
 * the thing the row really concerns and never suggests the person is missing
 * from COLD, which would send a reader to look for the problem in RDM.
 */
function whoLabel(item: ItemRow): string {
  if (item.action === "remove") return `RDM entry ${item.rdm_id ?? item.clpid}`;
  if (item.action === "not_in_cold") return `${item.clpid} (not in COLD)`;
  if (item.clpid) return item.clpid;
  if (item.rdm_id) return `RDM entry ${item.rdm_id}`;
  return "(no person named)";
}

function nameOf(rec: Record<string, unknown> | null | undefined): string {
  const n = rec?.name;
  return typeof n === "string" ? n : "";
}

/** nameChangeOf finds the name RDM held and the name COLD gives, when the
 * push changes one: an update has both, a replace has the legacy entry's name
 * and COLD's form for each person it names.
 */
function nameChangeOf(item: ItemRow): { from: string; to: string } | null {
  const changes = item.detail?.changes ?? [];
  const renames = changes.some((c) => c === "name" || c.endsWith(": name"));
  if (!renames) return null;
  if (item.action === "update") {
    return { from: nameOf(item.before), to: nameOf(item.after) };
  }
  if (item.action === "replace") {
    const names = item.detail?.names ?? {};
    const to = Object.keys(names).sort().map((c) => names[c]).join("; ");
    return { from: nameOf(item.before), to };
  }
  return null;
}

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
function itemViewCore(
  item: ItemRow,
  peopleBase: string,
  rdmBase = "",
): ItemView {
  const base: ItemView = {
    outcome: item.outcome,
    outcomeLabel: OUTCOME_LABEL[item.outcome] ?? item.outcome,
    statusLabel: item.status ? (STATUS_LABEL[item.status] ?? item.status) : "",
    action: item.action,
    actionLabel: ACTION_LABEL[item.action] ?? item.action,
    message: item.message,
    clpid: item.clpid,
    people: [],
    cold: [],
    rdm: null,
    rdmLinks: [],
    rerun: [],
    fixInCold: false,
    fixNote: "",
    nameChange: nameChangeOf(item),
    resultMessage: item.result_message ?? "",
    whoLabel: "",
  };
  const entryLink = (id: string | null) => {
    const href = id ? rdmEntryHref(rdmBase, id) : "";
    return id && href ? [{ id, href, ...rdmLinkText(id) }] : [];
  };
  if (item.outcome === "applied") {
    const persons = item.action === "replace"
      ? [...(item.detail?.persons ?? [item.clpid])].sort()
      : item.action === "remove"
      ? []
      : [item.clpid];
    const exists = item.action === "update" ||
      ((item.action === "create" || item.action === "revive") &&
        (item.status === "created" || item.status === "revived"));
    return {
      ...base,
      people: persons.map((c) => ({
        clpid: c,
        href: personHref(peopleBase, c),
      })),
      rdmLinks: exists ? entryLink(item.rdm_id) : [],
    };
  }
  const how = item.detail?.fix === undefined
    ? HOW_TO_FIX[item.action]
    : undefined;
  if (how !== undefined) {
    const person = PERSON_ACTIONS.includes(item.action) && item.clpid !== "";
    return {
      ...base,
      people: person
        ? [{ clpid: item.clpid, href: personHref(peopleBase, item.clpid) }]
        : [],
      rdmLinks: item.action === "stale_entry" ? entryLink(item.rdm_id) : [],
      rerun: how.inCold && person ? [item.clpid] : [],
      fixInCold: how.inCold,
      fixNote: how.note,
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

/** itemView turns a stored item into a row a person can act on (see itemViewCore
 * for the parts), and says what the row is about when it links no COLD person.
 *
 * @param item {ItemRow} the stored item
 * @param peopleBase {string} the People area relative to the page, such as "./people/"
 * @param rdmBase {string} the RDM instance the run targeted
 * @returns {ItemView} the row
 * @example
 * const v = itemView(item, "./people/", "https://authors.example.test");
 */
export function itemView(
  item: ItemRow,
  peopleBase: string,
  rdmBase = "",
): ItemView {
  const v = itemViewCore(item, peopleBase, rdmBase);
  return { ...v, whoLabel: v.people.length === 0 ? whoLabel(item) : "" };
}
