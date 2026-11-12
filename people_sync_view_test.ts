/**
 * people_sync_view_test.ts tests the page logic of the COLD/RDM people sync
 * (cold#122, DR-0032, plan Phase 5): what state the user is shown, whether the
 * button may be pressed, and how an item row becomes something a person can act
 * on. These are pure functions; the rendering is tested separately.
 */
import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import * as view from "./people_sync_view.ts";
import {
  type ItemRow,
  itemView,
  latestSyncRequest,
  personHref,
  personOutcomeText,
  reviewCount,
  type RunRow,
  startRequest,
  type SyncRequest,
  syncView,
  targetText,
} from "./people_sync_view.ts";

function run(over: Partial<RunRow> = {}): RunRow {
  return {
    run_id: "20261110230511-aaaa1111",
    request_id: "",
    trigger: "human",
    scope: "all",
    rdm_url: "https://authors.example.test",
    mode: "apply",
    state: "completed",
    started: "2026-11-10 23:05:11",
    finished: "2026-11-10 23:05:39",
    counts: { applied: 3, info: 8000, people: 9000 },
    ...over,
  };
}

function req(status: string, over: Partial<SyncRequest> = {}): SyncRequest {
  return {
    id: "run_people_sync",
    report_name: "run_people_sync",
    status,
    updated: "2026-11-10 23:05:00",
    link: "",
    ...over,
  };
}

// ---- what state the user sees ------------------------------------------------

Deno.test("state: no run and no request is never", () => {
  const v = syncView(undefined, undefined);
  assertEquals(v.state, "never");
  assertEquals(v.canStart, true);
});

Deno.test("state: a requested request is pending and blocks the button", () => {
  const v = syncView(req("requested"), run());
  assertEquals(v.state, "pending");
  assertEquals(v.canStart, false);
});

Deno.test("state: a processing request is running and blocks the button", () => {
  const v = syncView(req("processing"), run());
  assertEquals(v.state, "running");
  assertEquals(v.canStart, false);
});

Deno.test("state: a failed request is an error, and the button is allowed again", () => {
  const v = syncView(req("error"), run());
  assertEquals(v.state, "error");
  assertEquals(v.canStart, true);
});

Deno.test("state: a failed request shows the reason the run recorded, when that run belongs to the request", () => {
  const request = req("error", {
    requested: "2026-11-11T00:10:12.270Z",
    updated: "2026-11-11T00:10:35.565Z",
  });
  const failed = run({
    state: "error",
    started: "2026-11-11 00:10:20",
    error:
      "the preflight on rdm.example.test failed (exit 255): ssh: connect timed out",
  });
  const v = syncView(request, failed);
  assertEquals(v.state, "error");
  assertStringIncludes(v.headline, "ssh: connect timed out");
});

Deno.test("state: a failed request does not borrow an older run's reason or its success", () => {
  const request = req("error", { requested: "2026-11-11T00:10:12.270Z" });
  const old = run({
    state: "error",
    started: "2026-11-10 08:00:00",
    error: "an old failure",
  });
  const v = syncView(request, old);
  assertEquals(v.headline.includes("an old failure"), false);
  assertStringIncludes(v.headline.toLowerCase(), "before it recorded a run");
  const okRun = run({ state: "completed", started: "2026-11-10 08:00:00" });
  assertStringIncludes(
    syncView(request, okRun).headline.toLowerCase(),
    "before it recorded a run",
  );
});

Deno.test("state: a run that started just before the request's timestamp (clock skew of a second) still counts", () => {
  const request = req("error", { requested: "2026-11-11T00:10:12.900Z" });
  const failed = run({
    state: "error",
    started: "2026-11-11 00:10:12",
    error: "boom",
  });
  assertStringIncludes(syncView(request, failed).headline, "boom");
});

Deno.test("state: an unknown report status is an error, not silence", () => {
  assertEquals(
    syncView(req("aborting, unknown report"), undefined).state,
    "error",
  );
});

Deno.test("state: a run that failed is an error and shows its reason", () => {
  const v = syncView(
    req("completed"),
    run({ state: "error", error: "the connection failed" }),
  );
  assertEquals(v.state, "error");
  assertStringIncludes(v.headline, "the connection failed");
});

Deno.test("state: a run row left running with nothing active is stalled, not running", () => {
  const v = syncView(req("completed"), run({ state: "running", finished: "" }));
  assertEquals(v.state, "stalled");
  assertEquals(v.canStart, true);
  assertStringIncludes(v.headline, "2026-11-10 23:05:11");
});

Deno.test("state: a completed run with items to review says how many", () => {
  const v = syncView(
    req("completed"),
    run({
      counts: {
        needs_human: 2,
        needs_repair: 3,
        warning: 4,
        applied: 9,
        info: 100,
      },
    }),
  );
  assertEquals(v.state, "completed_review");
  assertEquals(v.reviewCount, 9);
  assertStringIncludes(v.headline, "9");
});

Deno.test("state: a clean completed run is completed_clean", () => {
  const v = syncView(req("completed"), run());
  assertEquals(v.state, "completed_clean");
  assertEquals(v.reviewCount, 0);
  assertEquals(v.canStart, true);
});

Deno.test("state: with no request at all the run row decides", () => {
  assertEquals(syncView(undefined, run()).state, "completed_clean");
  assertEquals(syncView(undefined, run({ state: "error" })).state, "error");
});

Deno.test("state: a dry run says so, so a librarian does not think RDM changed", () => {
  const dry = syncView(req("completed"), run({ mode: "dry-run" }));
  assertEquals(dry.dryRun, true);
  assertStringIncludes(dry.headline.toLowerCase(), "dry run");
  assertEquals(
    syncView(req("completed"), run({ mode: "apply" })).dryRun,
    false,
  );
});

Deno.test("state: every state has distinct words, so nothing rests on colour alone", () => {
  const heads = new Set([
    syncView(undefined, undefined).headline,
    syncView(req("requested"), undefined).headline,
    syncView(req("processing"), undefined).headline,
    syncView(req("error"), undefined).headline,
    syncView(req("completed"), run({ state: "running" })).headline,
    syncView(req("completed"), run({ counts: { warning: 1 } })).headline,
    syncView(req("completed"), run()).headline,
  ]);
  assertEquals(heads.size, 7);
});

Deno.test("reviewCount counts only the outcomes that need a person, and survives missing counts", () => {
  assertEquals(
    reviewCount(
      run({
        counts: {
          needs_human: 1,
          needs_repair: 2,
          warning: 3,
          applied: 50,
          info: 99,
        },
      }),
    ),
    6,
  );
  assertEquals(reviewCount(run({ counts: {} })), 0);
  assertEquals(reviewCount(undefined), 0);
});

// ---- which request counts ---------------------------------------------------------

Deno.test("latestSyncRequest keeps only the sync reports and picks the newest", () => {
  const list: SyncRequest[] = [
    req("completed", {
      id: "a",
      report_name: "alert_rdm_harvest_stale",
      updated: "2026-11-10 23:59:00",
    }),
    req("completed", { id: "b", updated: "2026-11-10 22:00:00" }),
    req("processing", {
      id: "c",
      report_name: "run_people_sync_person",
      updated: "2026-11-10 23:00:00",
    }),
    req("completed", {
      id: "d",
      report_name: "run_collaborator_report",
      updated: "2026-11-10 23:30:00",
    }),
  ];
  assertEquals(latestSyncRequest(list)?.id, "c");
  assertEquals(latestSyncRequest([list[0], list[3]]), undefined);
  assertEquals(latestSyncRequest([]), undefined);
});

// ---- starting a run ------------------------------------------------------------------

Deno.test("startRequest: a batch request names the report and says a person started it", () => {
  assertEquals(
    startRequest().toString(),
    "report_name=run_people_sync&trigger=human",
  );
});

Deno.test("startRequest: a one-person request carries the clpid, encoded", () => {
  const body = startRequest("O'Brien-Pat(Jr.)");
  assertEquals(body.get("report_name"), "run_people_sync_person");
  assertEquals(body.get("clpid"), "O'Brien-Pat(Jr.)");
  assertEquals(body.get("trigger"), "human");
});

Deno.test("startRequest: a clpid COLD would not accept is refused before anything is sent", () => {
  assertThrows(() => startRequest("two words"), Error, "clpid");
  assertThrows(() => startRequest(""), Error, "clpid");
});

// ---- links to the People area ---------------------------------------------------------

Deno.test("personHref points at the person's page and encodes awkward clpids", () => {
  assertEquals(personHref("./people/", "Doe-Jane"), "./people/Doe-Jane");
  assertEquals(personHref("./people", "Doe-Jane"), "./people/Doe-Jane");
  assertEquals(
    personHref("../people/", "O'Brien-Pat(Jr.)"),
    `../people/${encodeURIComponent("O'Brien-Pat(Jr.)")}`,
  );
  assert(!personHref("./people/", "a/b?c#d").includes("?"));
  assert(!personHref("./people/", "a/b?c#d").includes("#"));
});

// ---- a person's latest outcome (the person page) ---------------------------------------------

Deno.test("personOutcomeText: an item from the latest run covering the person is their outcome", () => {
  const text = personOutcomeText(
    pushItem({
      run_id: "r2",
      outcome: "warning",
      action: "malformed_identifier",
      rdm_id: null,
      status: undefined,
      detail: undefined,
    }),
    run({ run_id: "r2" }),
  );
  assertStringIncludes(text, "Latest outcome (2026-11-12 09:00:00)");
  assertStringIncludes(text, "Warning");
  assertStringIncludes(text, "update entry Doe-Jane: name");
});

Deno.test("personOutcomeText: an item from an OLDER run is not their outcome once a newer run covered them and reported nothing", () => {
  // The person's ISNI was fixed in COLD: the newer run reports nothing, so no item row exists for it.
  const text = personOutcomeText(
    pushItem({
      run_id: "r1",
      message: "COLD isni '3626 6637' is not well formed",
    }),
    run({ run_id: "r2", mode: "dry-run", started: "2026-11-12 18:42:52" }),
  );
  assertStringIncludes(text, "2026-11-12 18:42:52");
  assertStringIncludes(text.toLowerCase(), "nothing to report");
  assertStringIncludes(text.toLowerCase(), "dry run");
  assert(!text.includes("not well formed"), "the stale item is still shown");
});

Deno.test("personOutcomeText: no item at all, but a run covered them: nothing to report, said with the run's time and mode", () => {
  const dry = personOutcomeText(
    undefined,
    run({ mode: "dry-run", started: "2026-11-12 18:42:52" }),
  );
  assertStringIncludes(dry, "2026-11-12 18:42:52");
  assertStringIncludes(dry.toLowerCase(), "nothing to report");
  assertStringIncludes(dry.toLowerCase(), "dry run");
  const applied = personOutcomeText(
    undefined,
    run({ mode: "apply", started: "2026-11-12 18:42:52" }),
  );
  assertStringIncludes(applied.toLowerCase(), "applied");
  assert(!applied.toLowerCase().includes("dry run"));
});

Deno.test("personOutcomeText: never covered by any run, it says so", () => {
  const text = personOutcomeText(undefined, undefined);
  assertStringIncludes(text.toLowerCase(), "not been covered");
});

Deno.test("personOutcomeText: a run that failed says it failed, with its reason, instead of an older item", () => {
  const text = personOutcomeText(
    pushItem({ run_id: "r1" }),
    run({
      run_id: "r2",
      state: "error",
      error: "ssh: connect timed out",
      started: "2026-11-12 18:42:52",
    }),
  );
  assertStringIncludes(text.toLowerCase(), "failed");
  assertStringIncludes(text, "ssh: connect timed out");
  assert(!text.includes("update entry"), "an older item hides the failure");
});

Deno.test("personOutcomeText: a run still going is said as going, not as nothing to report", () => {
  const text = personOutcomeText(
    undefined,
    run({ state: "running", finished: "" }),
  );
  assertStringIncludes(text.toLowerCase(), "running");
  assert(!text.toLowerCase().includes("nothing to report"));
});

Deno.test("personOutcomeText: text from the program stays text", () => {
  const text = personOutcomeText(
    pushItem({ run_id: "r2", message: "<img src=x onerror=alert(1)>" }),
    run({ run_id: "r2" }),
  );
  assertStringIncludes(text, "<img src=x onerror=alert(1)>");
});

// ---- the next run's target (plan Phase 5 decision 3) --------------------------------------

Deno.test("targetText: a dry run says nothing will change, and where it will look", () => {
  const text = targetText({
    mode: "dry-run",
    rdm_url: "https://authors.example.test",
    transport: "ssm",
  });
  assertStringIncludes(text, "Dry run");
  assertStringIncludes(text, "https://authors.example.test");
  assertStringIncludes(text, "ssm");
  assertStringIncludes(text.toLowerCase(), "change nothing");
});

Deno.test("targetText: an apply says it will write, and where", () => {
  const text = targetText({
    mode: "apply",
    rdm_url: "https://authors.library.caltech.edu",
    transport: "ssh",
  });
  assertStringIncludes(text, "Apply");
  assertStringIncludes(text.toLowerCase(), "write");
  assertStringIncludes(text, "https://authors.library.caltech.edu");
});

Deno.test("targetText: the two modes read differently, so nothing rests on colour or position", () => {
  const a = targetText({ mode: "dry-run", rdm_url: "u", transport: "ssh" });
  const b = targetText({ mode: "apply", rdm_url: "u", transport: "ssh" });
  assert(a !== b);
});

Deno.test("targetText: an unknown mode is said as unknown, never as a dry run", () => {
  const text = targetText({ mode: "banana", rdm_url: "u", transport: "ssh" });
  assert(!text.includes("Dry run"));
  assertStringIncludes(text, "banana");
  assertStringIncludes(text.toLowerCase(), "unknown");
});

Deno.test("targetText: a failure to read the target is said, with the reason", () => {
  const text = targetText({
    error: "PEOPLE_SYNC_ENV is not set for this process",
  });
  assertStringIncludes(text.toLowerCase(), "unknown");
  assertStringIncludes(text, "PEOPLE_SYNC_ENV");
});

Deno.test("targetText: text from the server stays text, never markup", () => {
  assertEquals(
    targetText({ error: "<img src=x onerror=alert(1)>" }).includes(
      "<img src=x onerror=alert(1)>",
    ),
    true,
  );
});

// ---- items of the push (cold DR-0037) ----------------------------------------------------

const BASE = "https://authors.example.test";

function pushItem(over: Partial<ItemRow> = {}): ItemRow {
  return {
    run_id: "r1",
    clpid: "Doe-Jane",
    rdm_id: "Doe-Jane",
    action: "update",
    outcome: "applied",
    message: "update entry Doe-Jane: name",
    scheme: "",
    value: "",
    recorded: "2026-11-12 09:00:00",
    status: "updated",
    before: { name: "Doe, J." },
    after: { name: "Doe, Jane" },
    detail: { changes: ["name"] },
    ...over,
  };
}

Deno.test("push item: an update links the person and the entry, and shows the name before and after", () => {
  const v = itemView(pushItem(), "./people/", BASE);
  assertEquals(v.people, [{ clpid: "Doe-Jane", href: "./people/Doe-Jane" }]);
  assertEquals(v.nameChange, { from: "Doe, J.", to: "Doe, Jane" });
  assertEquals(v.rdmLinks.map((l) => l.href), [`${BASE}/api/names/Doe-Jane`]);
  assertEquals(v.rerun, []);
  assertEquals(v.statusLabel, "Updated in RDM");
  assertEquals(v.actionLabel, "Update the entry");
});

Deno.test("push item: an update that changes no name shows no name change", () => {
  const v = itemView(
    pushItem({ detail: { changes: ["orcid"] }, after: { name: "Doe, J." } }),
    "./people/",
    BASE,
  );
  assertEquals(v.nameChange, null);
});

Deno.test("push item: a link to a names entry says it needs a signed-in RDM user", () => {
  const link = itemView(pushItem(), "./people/", BASE).rdmLinks[0];
  for (const text of [link.label, link.title]) {
    assertStringIncludes(text, "Doe-Jane");
    assertStringIncludes(text, "JSON API");
    assertStringIncludes(text, "not a metadata record");
    assertStringIncludes(text, "signed in");
  }
  assertEquals(link.label.startsWith("Doe-Jane"), true);
});

Deno.test("push item: a created entry links to the entry, a would-be one does not", () => {
  const made = itemView(
    pushItem({ action: "create", status: "created", before: null }),
    "./people/",
    BASE,
  );
  assertEquals(made.rdmLinks.length, 1);
  const would = itemView(
    pushItem({ action: "create", status: "would_create", before: null }),
    "./people/",
    BASE,
  );
  assertEquals(would.rdmLinks, []);
  assertStringIncludes(would.statusLabel.toLowerCase(), "would");
});

Deno.test("push item: a revive says the entry was restored, links the person and the entry, and offers no rerun", () => {
  const revived = itemView(
    pushItem({
      action: "revive",
      status: "revived",
      before: null,
      detail: { changes: ["restored"] },
    }),
    "./people/",
    BASE,
  );
  assertEquals(revived.actionLabel, "Restore a removed entry");
  assertEquals(revived.statusLabel, "Entry restored in RDM");
  assertEquals(revived.people, [{
    clpid: "Doe-Jane",
    href: "./people/Doe-Jane",
  }]);
  assertEquals(revived.rdmLinks.map((l) => l.href), [
    `${BASE}/api/names/Doe-Jane`,
  ]);
  assertEquals(revived.rerun, []);
  assertEquals(revived.nameChange, null);
  const would = itemView(
    pushItem({ action: "revive", status: "would_revive", before: null }),
    "./people/",
    BASE,
  );
  assertStringIncludes(would.statusLabel.toLowerCase(), "would");
  assertEquals(would.rdmLinks, []); // the entry is still a removed one in a dry run
});

Deno.test("push item: a replace lists its people, shows the old name against COLD's, and links no entry", () => {
  const v = itemView(
    pushItem({
      action: "replace",
      rdm_id: "abcde-12345",
      status: "replaced",
      before: { name: "Doe, J." },
      after: null,
      detail: {
        replaced_by: "Beta-B",
        persons: ["Beta-B", "Alpha-A"],
        changes: ["Alpha-A: name"],
        names: { "Alpha-A": "Alpha, Ann", "Beta-B": "Beta, Bo" },
      },
    }),
    "./people/",
    BASE,
  );
  assertEquals(v.people.map((p) => p.clpid), ["Alpha-A", "Beta-B"]);
  assertEquals(v.nameChange, { from: "Doe, J.", to: "Alpha, Ann; Beta, Bo" });
  assertEquals(v.rdmLinks, []);
  assertEquals(v.statusLabel, "Legacy entry removed in RDM");
  assertEquals(v.rerun, []);
});

Deno.test("push item: a replace that changes no name shows no name change", () => {
  const v = itemView(
    pushItem({
      action: "replace",
      detail: {
        replaced_by: "Doe-Jane",
        persons: ["Doe-Jane"],
        changes: ["orcid"],
        names: { "Doe-Jane": "Doe, Jane" },
      },
    }),
    "./people/",
  );
  assertEquals(v.nameChange, null);
});

Deno.test("push item: a removal names the entry, links no COLD person and no entry", () => {
  const v = itemView(
    pushItem({
      action: "remove",
      clpid: "Gone-G",
      rdm_id: "Gone-G",
      status: "removed",
      detail: undefined,
    }),
    "./people/",
    BASE,
  );
  assertEquals(v.people, []);
  assertEquals(v.rdmLinks, []);
  assertEquals(v.statusLabel, "Removed from RDM");
  assertEquals(v.clpid, "Gone-G");
});

Deno.test("push item: a malformed identifier is fixed in COLD and the person can be pushed again", () => {
  const v = itemView(
    pushItem({
      action: "malformed_identifier",
      outcome: "warning",
      rdm_id: null,
      status: undefined,
      detail: undefined,
    }),
    "./people/",
  );
  assertEquals(v.fixInCold, true);
  assertEquals(v.rerun, ["Doe-Jane"]);
  assertStringIncludes(v.fixNote, "COLD");
  assertEquals(v.people.length, 1);
});

Deno.test("push item: a deleted id needs a person and offers no rerun", () => {
  const v = itemView(
    pushItem({
      action: "id_deleted",
      outcome: "needs_human",
      status: undefined,
      detail: { legacy_ids: [] },
    }),
    "./people/",
    BASE,
  );
  assertEquals(v.fixInCold, false);
  assertEquals(v.rerun, []);
  assertStringIncludes(v.fixNote.toLowerCase(), "removed entry");
  assertEquals(v.people.length, 1);
});

Deno.test("push item: an entry with stale keys links the entry and says the fix is outside COLD", () => {
  const v = itemView(
    pushItem({
      action: "stale_entry",
      outcome: "needs_human",
      status: undefined,
      detail: undefined,
    }),
    "./people/",
    BASE,
  );
  assertEquals(v.rdmLinks.length, 1);
  assertEquals(v.fixInCold, false);
  assertStringIncludes(v.fixNote.toLowerCase(), "outside cold");
});

Deno.test("push item: a person COLD does not hold is not linked and the note says when a deletion reaches RDM", () => {
  const v = itemView(
    pushItem({
      action: "not_in_cold",
      outcome: "needs_human",
      rdm_id: null,
      status: undefined,
      detail: undefined,
    }),
    "./people/",
  );
  assertEquals(v.people, []);
  assertEquals(v.rerun, []);
  assertStringIncludes(v.fixNote.toLowerCase(), "next full");
});

Deno.test("whoLabel: a row with no COLD person says what it is, and never that there is 'no COLD person'", () => {
  const label = (over: Partial<ItemRow>) =>
    itemView(pushItem(over), "./people/").whoLabel;
  // a removed entry is an RDM entry; its clpid is not a COLD person's
  assertEquals(
    label({
      action: "remove",
      clpid: "Gone-G",
      rdm_id: "Gone-G",
      status: "removed",
    }),
    "RDM entry Gone-G",
  );
  assertEquals(
    label({ action: "remove", clpid: "Old-Id", rdm_id: "abcde-12345" }),
    "RDM entry abcde-12345",
  );
  // asked to push someone COLD does not hold: that is exactly what it is
  assertEquals(
    label({
      action: "not_in_cold",
      outcome: "needs_human",
      clpid: "Nobody-Z",
      rdm_id: null,
    }),
    "Nobody-Z (not in COLD)",
  );
  // an item from an earlier build: just the id it carries
  assertEquals(
    label({
      action: "orphan_clpid",
      outcome: "warning",
      clpid: "Nobody-Z",
      detail: { fix: "rdm" },
    }),
    "Nobody-Z",
  );
  assertEquals(
    label({
      action: "orphan_clpid",
      outcome: "warning",
      clpid: "",
      rdm_id: "abcde-12345",
      detail: { fix: "rdm" },
    }),
    "RDM entry abcde-12345",
  );
  assertEquals(
    label({
      action: "orphan_clpid",
      outcome: "warning",
      clpid: "",
      rdm_id: null,
      detail: { fix: "rdm" },
    }),
    "(no person named)",
  );
});

Deno.test("whoLabel: a row that links a COLD person has no label, and no label anywhere says 'no COLD person'", () => {
  const linked = itemView(
    pushItem({
      action: "malformed_identifier",
      outcome: "warning",
      rdm_id: null,
      detail: undefined,
    }),
    "./people/",
  );
  assertEquals(linked.people.length, 1);
  assertEquals(linked.whoLabel, "");
  for (
    const action of [
      "create",
      "update",
      "replace",
      "remove",
      "malformed_identifier",
      "id_deleted",
      "stale_entry",
      "not_in_cold",
      "conflict",
      "orphan_clpid",
    ]
  ) {
    for (const clpid of ["", "X-Y"]) {
      for (const rdm_id of [null, "r1"]) {
        const v = itemView(pushItem({ action, clpid, rdm_id }), "./people/");
        assert(
          !v.whoLabel.toLowerCase().includes("no cold person"),
          `${action}/${clpid}/${rdm_id}`,
        );
      }
    }
  }
});

Deno.test("push item: every action has its own words, and every status the push can report", () => {
  const actions = [
    "create",
    "update",
    "replace",
    "remove",
    "malformed_identifier",
    "id_deleted",
    "stale_entry",
    "not_in_cold",
  ];
  const labels = new Set(
    actions.map((a) =>
      itemView(pushItem({ action: a }), "./people/").actionLabel
    ),
  );
  assertEquals(labels.size, actions.length);
  const statuses = [
    "created",
    "updated",
    "replaced",
    "removed",
    "would_create",
    "would_update",
    "would_replace",
    "would_remove",
    "skipped",
    "error",
    "not_attempted",
  ];
  const words = new Set(
    statuses.map((s) =>
      itemView(pushItem({ status: s }), "./people/").statusLabel
    ),
  );
  assertEquals(words.size, statuses.length);
  for (const w of words) assert(w.length > 3);
});

Deno.test("push item: an action an older build stored keeps its own name as its label", () => {
  assertEquals(
    itemView(pushItem({ action: "conflict" }), "./people/").actionLabel,
    "conflict",
  );
});

Deno.test("push item: the result message is carried as text, and a name with markup stays text", () => {
  const v = itemView(
    pushItem({
      before: { name: "<b>x</b>" },
      result_message: "<img src=x>",
    } as Partial<ItemRow>),
    "./people/",
  );
  assertEquals(v.nameChange?.from, "<b>x</b>");
  assertEquals(v.resultMessage, "<img src=x>");
});

// ---- an item row a person can act on ------------------------------------------------------

function item(over: Partial<ItemRow> = {}): ItemRow {
  return {
    run_id: "r1",
    clpid: "Doe-Jane",
    rdm_id: "abcde-12345",
    action: "conflict",
    outcome: "needs_human",
    message:
      "orcid differs: RDM has 0000-0002-0000-0002, COLD (Doe-Jane) has 0000-0002-0000-0001",
    scheme: "",
    value: "",
    recorded: "2026-11-10 23:05:30",
    detail: {
      fix: "cold",
      cold: { "Doe-Jane": { orcid: "0000-0002-0000-0001", isni: "" } },
      rdm: {
        ids: ["abcde-12345"],
        clpids: ["Doe-Jane"],
        orcids: ["0000-0002-0000-0002"],
        isnis: [],
      },
    },
    ...over,
  };
}

Deno.test("item: a COLD-fixable problem links the COLD person, shows both sides and offers the rerun", () => {
  const v = itemView(item(), "./people/");
  assertEquals(v.people, [{ clpid: "Doe-Jane", href: "./people/Doe-Jane" }]);
  assertEquals(v.cold, [{
    clpid: "Doe-Jane",
    orcid: "0000-0002-0000-0001",
    isni: "",
  }]);
  assertEquals(v.rdm?.orcids, ["0000-0002-0000-0002"]);
  assertEquals(v.rdm?.ids, ["abcde-12345"]);
  assertEquals(v.rerun, ["Doe-Jane"]);
  assertStringIncludes(v.fixNote, "COLD");
  assertEquals(v.fixInCold, true);
});

// ---- alternate names are out of scope (cold DR-0036 decision 7) ------------------------

Deno.test("view: nothing sets alternate names apart any more", () => {
  assert(!("splitItems" in view));
  assert(!("isAltNameCandidate" in view));
});

Deno.test("item: an alt_name_candidate stored by an earlier build reads like any other item", () => {
  const v = itemView(
    item({ action: "alt_name_candidate", outcome: "info" }),
    "./people/",
  );
  assertEquals(v.outcomeLabel, "info");
  assert(!v.fixNote.toLowerCase().includes("alternate name"));
});

Deno.test("item: a problem that is only in RDM says the fix is outside COLD and offers no rerun", () => {
  const v = itemView(
    item({
      action: "orphan_clpid",
      outcome: "warning",
      detail: {
        fix: "rdm",
        cold: {},
        rdm: {
          ids: ["abcde-12345"],
          clpids: ["Nobody-Z"],
          orcids: [],
          isnis: [],
        },
      },
    }),
    "./people/",
  );
  assertEquals(v.people, []);
  assertEquals(v.rerun, []);
  assertEquals(v.fixInCold, false);
  assertStringIncludes(v.fixNote.toLowerCase(), "outside cold");
});

Deno.test("item: an RDM-side problem that still names a COLD person links that person but offers no rerun", () => {
  const v = itemView(
    item({
      action: "needs_repair",
      outcome: "needs_repair",
      detail: {
        fix: "rdm",
        cold: { "Doe-Jane": { orcid: "", isni: "" } },
        rdm: { ids: ["abcde-12345"], clpids: [], orcids: [], isnis: [] },
      },
    }),
    "./people/",
  );
  assertEquals(v.people.length, 1);
  assertEquals(v.rerun, []);
});

Deno.test("item: each RDM entry id links to that entry on the instance the run targeted", () => {
  const v = itemView(item(), "./people/", "https://authors.example.test");
  assertEquals(v.rdmLinks.map(({ id, href }) => ({ id, href })), [{
    id: "abcde-12345",
    href: "https://authors.example.test/api/names/abcde-12345",
  }]);
  // a trailing slash on the base does not double up
  assertEquals(
    itemView(item(), "./people/", "https://authors.example.test/").rdmLinks[0]
      .href,
    "https://authors.example.test/api/names/abcde-12345",
  );
});

Deno.test("item: an RDM link says it is the JSON API entry for a person and not a metadata record", () => {
  const link =
    itemView(item(), "./people/", "https://authors.example.test").rdmLinks[0];
  for (const text of [link.label, link.title]) {
    assertStringIncludes(text, "abcde-12345");
    assertStringIncludes(text, "JSON API");
    assertStringIncludes(text, "person");
    assertStringIncludes(text, "not a metadata record");
  }
  // the accessible name starts with the visible text, so what is read matches what is seen
  assertEquals(link.label.startsWith("abcde-12345"), true);
});

Deno.test("item: several RDM entries each get a link, in the order stored", () => {
  const v = itemView(
    item({
      detail: {
        fix: "rdm",
        cold: {},
        rdm: {
          ids: ["aaaaa-11111", "bbbbb-22222"],
          clpids: [],
          orcids: [],
          isnis: [],
        },
      },
    }),
    "./people/",
    "https://authors.example.test",
  );
  assertEquals(v.rdmLinks.map((l) => l.id), ["aaaaa-11111", "bbbbb-22222"]);
});

Deno.test("item: an entry id is encoded in its link", () => {
  const v = itemView(
    item({
      detail: {
        fix: "rdm",
        cold: {},
        rdm: { ids: ["a/b?c#d"], clpids: [], orcids: [], isnis: [] },
      },
    }),
    "./people/",
    "https://authors.example.test",
  );
  assertEquals(
    v.rdmLinks[0].href,
    `https://authors.example.test/api/names/${encodeURIComponent("a/b?c#d")}`,
  );
});

Deno.test("item: no usable target means no RDM link, and only http(s) targets are ever linked", () => {
  assertEquals(itemView(item(), "./people/").rdmLinks, []);
  assertEquals(itemView(item(), "./people/", "").rdmLinks, []);
  for (
    const bad of [
      "javascript:alert(1)",
      "data:text/html,x",
      "//evil.test",
      "ftp://x.test",
      "authors.example.test",
    ]
  ) {
    assertEquals(itemView(item(), "./people/", bad).rdmLinks, [], bad);
  }
  assertEquals(
    itemView(item(), "./people/", "http://localhost:8080").rdmLinks.length,
    1,
  );
});

Deno.test("item: an item with no RDM entry has no RDM link", () => {
  const v = itemView(
    item({ outcome: "applied", action: "create", rdm_id: null, detail: {} }),
    "./people/",
    "https://authors.example.test",
  );
  assertEquals(v.rdmLinks, []);
});

Deno.test("item: several COLD people are all linked, each with its own rerun", () => {
  const v = itemView(
    item({
      detail: {
        fix: "cold",
        cold: {
          "Beta-B": { orcid: "0000-0002-0000-0002", isni: "" },
          "Alpha-A": { orcid: "0000-0002-0000-0001", isni: "" },
        },
        rdm: { ids: ["r1"], clpids: [], orcids: [], isnis: [] },
      },
    }),
    "./people/",
  );
  assertEquals(v.people.map((p) => p.clpid), ["Alpha-A", "Beta-B"]);
  assertEquals(v.rerun, ["Alpha-A", "Beta-B"]);
});

Deno.test("item: people are listed in clpid order whatever order they were stored in", () => {
  const v = itemView(
    item({
      detail: {
        fix: "cold",
        cold: {
          "Gamma-C": { orcid: "", isni: "" },
          "Alpha-A": { orcid: "", isni: "" },
          "Beta-B": { orcid: "", isni: "" },
        },
        rdm: { ids: ["r1"], clpids: [], orcids: [], isnis: [] },
      },
    }),
    "./people/",
  );
  assertEquals(v.people.map((p) => p.clpid), ["Alpha-A", "Beta-B", "Gamma-C"]);
  assertEquals(v.rerun, ["Alpha-A", "Beta-B", "Gamma-C"]);
});

Deno.test("item: an empty detail on an item that needs a person is treated as no detail", () => {
  const v = itemView(item({ detail: {} }), "./people/");
  assertStringIncludes(v.fixNote.toLowerCase(), "no detail");
  assertEquals(v.rerun, []);
});

Deno.test("item: an item recorded without detail degrades safely: no links, no rerun, says so", () => {
  const { detail: _d, ...old } = item();
  const v = itemView(old as ItemRow, "./people/");
  assertEquals(v.people, []);
  assertEquals(v.rerun, []);
  assertStringIncludes(v.fixNote.toLowerCase(), "no detail");
});

Deno.test("item: every outcome is named in words", () => {
  const labels = new Set(
    ["needs_human", "needs_repair", "warning", "applied"].map((o) =>
      itemView(item({ outcome: o }), "./people/").outcomeLabel
    ),
  );
  assertEquals(labels.size, 4);
  for (const l of labels) assert(l.length > 3);
});

Deno.test("item: an applied item shows what happened, in words, and links the COLD person", () => {
  const would = itemView(
    item(
      {
        outcome: "applied",
        action: "create",
        detail: {},
        status: "would_create",
      } as Partial<ItemRow>,
    ),
    "./people/",
  );
  const done = itemView(
    item(
      {
        outcome: "applied",
        action: "create",
        detail: {},
        status: "created",
      } as Partial<ItemRow>,
    ),
    "./people/",
  );
  assertStringIncludes(would.statusLabel.toLowerCase(), "would");
  assertEquals(done.statusLabel.toLowerCase().includes("would"), false);
  assertEquals(would.people, [{
    clpid: "Doe-Jane",
    href: "./people/Doe-Jane",
  }]);
  assertEquals(would.rerun, []);
  const failed = itemView(
    item(
      { outcome: "applied", detail: {}, status: "error" } as Partial<ItemRow>,
    ),
    "./people/",
  );
  assertStringIncludes(failed.statusLabel.toLowerCase(), "fail");
});

Deno.test("item: text from the matcher is carried as text, never as markup", () => {
  const v = itemView(
    item({ message: "<img src=x onerror=alert(1)>" }),
    "./people/",
  );
  assertEquals(v.message, "<img src=x onerror=alert(1)>");
});
