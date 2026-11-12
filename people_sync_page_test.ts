/**
 * people_sync_page_test.ts checks the structure the sync page builds, without a
 * browser: a minimal fake DOM stands in for `document` and `fetch` is stubbed.
 * It checks what a screen reader and keyboard user depend on (the live region,
 * the table's caption and header cells, aria-disabled instead of disabled, text
 * not markup) and what a click sends. It does not replace a real screen-reader
 * pass, which the plan keeps as a manual step.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";

class FakeText {
  constructor(public text: string) {}
  get textContent(): string {
    return this.text;
  }
}

class FakeEl {
  children: (FakeEl | FakeText)[] = [];
  attrs = new Map<string, string>();
  dataset: Record<string, string> = {};
  listeners: Record<string, (() => void)[]> = {};
  constructor(public tagName: string) {}
  get textContent(): string {
    return this.children.map((c) => c.textContent).join("");
  }
  set textContent(v: string) {
    this.children = v === "" ? [] : [new FakeText(v)];
  }
  append(...nodes: (FakeEl | FakeText | string)[]) {
    for (const n of nodes) {
      this.children.push(typeof n === "string" ? new FakeText(n) : n);
    }
  }
  replaceChildren(...nodes: (FakeEl | FakeText | string)[]) {
    this.children = [];
    this.append(...nodes);
  }
  setAttribute(k: string, v: string) {
    this.attrs.set(k, v);
    if (k === "id") ids.set(v, this);
  }
  getAttribute(k: string) {
    return this.attrs.get(k) ?? null;
  }
  addEventListener(t: string, f: () => void) {
    (this.listeners[t] ??= []).push(f);
  }
  click() {
    for (const f of this.listeners["click"] ?? []) f();
  }
  find(pred: (e: FakeEl) => boolean): FakeEl[] {
    const out: FakeEl[] = [];
    for (const c of this.children) {
      if (c instanceof FakeEl) {
        if (pred(c)) out.push(c);
        out.push(...c.find(pred));
      }
    }
    return out;
  }
  tag(name: string) {
    return this.find((e) => e.tagName === name);
  }
}

const ids = new Map<string, FakeEl>();

const RUN = {
  run_id: "r-full",
  request_id: "",
  trigger: "human",
  scope: "all",
  rdm_url: "https://authors.example.test",
  mode: "dry-run",
  state: "completed",
  started: "2026-11-10 23:05:11",
  finished: "2026-11-10 23:05:39",
  counts: {
    people: 100,
    needs_human: 1,
    needs_repair: 1,
    warning: 1,
    applied: 1,
    info: 96,
  },
  program_hash: "4914890d4e7713c1eafab13562a2e686",
  irdmtools_version: "0.1.0",
};

const ITEMS = [
  {
    run_id: "r-full",
    clpid: "Doe-Jane",
    rdm_id: "abcde-12345",
    action: "conflict",
    outcome: "needs_human",
    message: "<img src=x onerror=alert(1)> orcid differs",
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
  },
  {
    run_id: "r-full",
    clpid: "Nobody-Z",
    rdm_id: "zzzzz-99999",
    action: "orphan_clpid",
    outcome: "warning",
    message: "not a COLD clpid",
    scheme: "",
    value: "",
    recorded: "2026-11-10 23:05:30",
    detail: {
      fix: "rdm",
      cold: {},
      rdm: {
        ids: ["zzzzz-99999"],
        clpids: ["Nobody-Z"],
        orcids: [],
        isnis: [],
      },
    },
  },
  {
    run_id: "r-full",
    clpid: "New-Ann",
    rdm_id: null,
    action: "create",
    outcome: "applied",
    message: "create RDM entry New-Ann",
    scheme: "clpid",
    value: "",
    recorded: "2026-11-10 23:05:30",
    status: "would_create",
    detail: {},
  },
];

interface World {
  posts: { url: string; body: string }[];
  intervals: number;
  fetches: string[];
  /** fire a document event, such as "visibilitychange" */
  fire: (type: string) => void;
  /** what document.visibilityState says */
  visibility: string;
  restore: () => void;
}

/** world installs the fake DOM and a fetch that answers like COLD's API. */
interface Extra {
  /** what /rdm/people_sync/target answers: this body, with targetStatus (default 200) */
  target?: unknown;
  targetStatus?: number;
  /** what the per-person run query and the per-person latest item query return */
  runFor?: unknown[];
  latestItem?: unknown[];
  /** the runs the run queries return (default: the one full run) */
  runs?: unknown[];
}

const TARGET = {
  mode: "dry-run",
  rdm_url: "https://authors.example.test",
  transport: "ssm",
};

function world(
  requests: unknown[],
  items: unknown[] = ITEMS,
  extra: Extra = {},
): World {
  ids.clear();
  const listeners: Record<string, (() => void)[]> = {};
  const w: World = {
    posts: [],
    intervals: 0,
    fetches: [],
    visibility: "visible",
    fire: (type) => (listeners[type] ?? []).forEach((f) => f()),
    restore: () => {},
  };
  const g = globalThis as Record<string, unknown>;
  const saved = {
    document: g.document,
    fetch: g.fetch,
    setInterval: g.setInterval,
    clearInterval: g.clearInterval,
    setTimeout: g.setTimeout,
  };
  g.document = {
    createElement: (t: string) => new FakeEl(t),
    getElementById: () => null,
    addEventListener: (type: string, f: () => void) => {
      (listeners[type] ??= []).push(f);
    },
    get visibilityState() {
      return w.visibility;
    },
  };
  g.setInterval = () => {
    w.intervals++;
    return w.intervals;
  };
  g.clearInterval = () => {
    w.intervals--;
  };
  g.setTimeout = () => 0;
  g.fetch = (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    w.fetches.push(url);
    if (init?.method === "POST") {
      w.posts.push({ url, body: String(init.body) });
      return Promise.resolve(new Response("{}", { status: 200 }));
    }
    const json = (v: unknown) =>
      Promise.resolve(new Response(JSON.stringify(v), { status: 200 }));
    if (url.includes("rdm/people_sync/target")) {
      // a fresh Response per call, as fetch gives: a body can only be read once
      return Promise.resolve(
        new Response(JSON.stringify(extra.target ?? TARGET), {
          status: extra.targetStatus ?? 200,
        }),
      );
    }
    if (url.includes("report_list")) return json(requests);
    if (url.includes("people_sync_latest_run_for")) {
      return json(extra.runFor ?? [RUN]);
    }
    if (url.includes("people_sync_latest_item")) {
      return json(extra.latestItem ?? []);
    }
    if (url.includes("people_sync_latest_full_run")) {
      return json(extra.runs ?? [RUN]);
    }
    if (url.includes("people_sync_latest_run")) {
      return json(extra.runs ?? [RUN]);
    }
    if (url.includes("people_sync_run_items")) return json(items);
    return Promise.resolve(new Response("[]", { status: 200 }));
  };
  w.restore = () => Object.assign(g, saved);
  return w;
}

async function page(
  requests: unknown[] = [],
  items: unknown[] = ITEMS,
  extra: Extra = {},
) {
  const w = world(requests, items, extra);
  const { PeopleSyncUI } = await import("./people_sync_page.ts");
  const mount = new FakeEl("div");
  const ui = new PeopleSyncUI({
    mountElement: mount as unknown as HTMLElement,
    baseUrl: "http://localhost:8111/",
    peopleBase: "./people/",
  });
  await ui.refresh();
  return { w, mount, ui };
}

const idle = [{
  id: "run_people_sync",
  report_name: "run_people_sync",
  status: "completed",
  updated: "2026-11-10 23:05:40",
}];
const busy = [{
  id: "run_people_sync",
  report_name: "run_people_sync",
  status: "processing",
  updated: "2026-11-10 23:06:00",
}];

Deno.test("page: the status is one polite live region with the headline in words", async () => {
  const { w, mount } = await page(idle);
  try {
    const regions = mount.find((e) => e.getAttribute("role") === "status");
    assertEquals(regions.length, 1);
    assertEquals(regions[0].getAttribute("aria-live"), "polite");
    assertStringIncludes(regions[0].textContent, "Dry run completed");
    assertStringIncludes(regions[0].textContent, "3 items need a person");
  } finally {
    w.restore();
  }
});

Deno.test("page: the table has a caption, six column headers and a row header per row", async () => {
  const { w, mount } = await page(idle);
  try {
    const tables = mount.tag("table");
    assertEquals(tables.length, 1);
    assertEquals(tables[0].tag("caption").length, 1);
    const cols = tables[0].tag("th").filter((h) =>
      h.getAttribute("scope") === "col"
    );
    assertEquals(cols.map((c) => c.textContent), [
      "Person",
      "Outcome",
      "What was found",
      "In COLD",
      "In RDM",
      "What to do",
    ]);
    const rows = tables[0].tag("tbody")[0].tag("tr");
    assertEquals(rows.length, 3);
    for (const r of rows) {
      const first = r.children[0] as FakeEl;
      assertEquals(first.tagName, "th");
      assertEquals(first.getAttribute("scope"), "row");
    }
  } finally {
    w.restore();
  }
});

Deno.test("page: the scrollable table region is focusable and named", async () => {
  const { w, mount } = await page(idle);
  try {
    const region = mount.find((e) =>
      e.getAttribute("class") === "ps-scroll"
    )[0];
    assertEquals(region.getAttribute("tabindex"), "0");
    assertEquals(region.getAttribute("role"), "region");
    assert((region.getAttribute("aria-label") ?? "").length > 0);
  } finally {
    w.restore();
  }
});

Deno.test("page: people link to their COLD page, and an RDM-only item has no link", async () => {
  const { w, mount } = await page(idle);
  try {
    const rows = mount.tag("table")[0].tag("tbody")[0].tag("tr");
    // the person cell only: the RDM cell now has its own link
    const links = (r: FakeEl) =>
      (r.children[0] as FakeEl).tag("a").map((a) => a.getAttribute("href"));
    assertEquals(links(rows[0]), ["./people/Doe-Jane"]);
    assertEquals(links(rows[1]), []);
    assertEquals(rows[1].children[0].textContent, "Nobody-Z");
  } finally {
    w.restore();
  }
});

Deno.test("page: both sides are shown in words and the matcher's text stays text", async () => {
  const { w, mount } = await page(idle);
  try {
    const row = mount.tag("table")[0].tag("tbody")[0].tag("tr")[0];
    assertStringIncludes(
      row.children[3].textContent,
      "Doe-Jane: ORCID 0000-0002-0000-0001, no ISNI",
    );
    assertStringIncludes(
      row.children[4].textContent,
      "ORCID 0000-0002-0000-0002",
    );
    assertStringIncludes(
      row.children[2].textContent,
      "<img src=x onerror=alert(1)>",
    );
    assertEquals(mount.tag("img").length, 0);
  } finally {
    w.restore();
  }
});

Deno.test("page: the RDM entry id is a link to that entry on the run's target; an item with none has no link", async () => {
  const { w, mount } = await page(idle);
  try {
    const rows = mount.tag("table")[0].tag("tbody")[0].tag("tr");
    const rdmCell = rows[0].children[4] as FakeEl;
    const links = rdmCell.tag("a");
    assertEquals(links.map((a) => a.textContent), ["abcde-12345"]);
    assertEquals(links.map((a) => a.getAttribute("href")), [
      "https://authors.example.test/api/names/abcde-12345",
    ]);
    assertStringIncludes(rdmCell.textContent, "Entry abcde-12345");
    const anchor = links[0];
    for (const attr of ["aria-label", "title"]) {
      const v = anchor.getAttribute(attr) ?? "";
      assertStringIncludes(v, "abcde-12345");
      assertStringIncludes(v, "JSON API");
      assertStringIncludes(v, "not a metadata record");
    }
    // the other lines are still there as text
    assertStringIncludes(rdmCell.textContent, "ORCID 0000-0002-0000-0002");
    // the orphan item's entry links too; the applied create has no entry and so no link
    assertEquals((rows[1].children[4] as FakeEl).tag("a").length, 1);
    assertEquals((rows[2].children[4] as FakeEl).tag("a").length, 0);
  } finally {
    w.restore();
  }
});

Deno.test("page: every outcome is stated in words, not only by position or colour", async () => {
  const { w, mount } = await page(idle);
  try {
    const rows = mount.tag("table")[0].tag("tbody")[0].tag("tr");
    assertStringIncludes(
      rows[0].children[1].textContent,
      "Needs a person to decide",
    );
    assertStringIncludes(rows[1].children[1].textContent, "Warning");
    assertStringIncludes(
      rows[2].children[1].textContent,
      "Would be created (dry run)",
    );
  } finally {
    w.restore();
  }
});

// ---- the next run's target ------------------------------------------------------------

/** fact reads one dt/dd pair from the status area's list. */
function fact(mount: FakeEl, name: string): string | undefined {
  const dl = mount.tag("dl")[0];
  const i = dl.children.findIndex((c) => c.textContent === name);
  return i < 0 ? undefined : dl.children[i + 1].textContent;
}

Deno.test("page: the next run's target and mode are shown, labelled as the next run", async () => {
  const { w, mount } = await page(idle);
  try {
    const text = fact(mount, "Next run")!;
    assertStringIncludes(text, "Dry run");
    assertStringIncludes(text, "https://authors.example.test");
    assertStringIncludes(text, "ssm");
  } finally {
    w.restore();
  }
});

Deno.test("page: an apply target says it will write", async () => {
  const { w, mount } = await page(idle, ITEMS, {
    target: {
      mode: "apply",
      rdm_url: "https://authors.library.caltech.edu",
      transport: "ssh",
    },
  });
  try {
    const text = fact(mount, "Next run")!;
    assertStringIncludes(text, "Apply");
    assertStringIncludes(text.toLowerCase(), "write");
    assertStringIncludes(text, "https://authors.library.caltech.edu");
  } finally {
    w.restore();
  }
});

Deno.test("page: a target that cannot be read is said as unknown with the reason, and the rest of the page still draws", async () => {
  const { w, mount } = await page(idle, ITEMS, {
    target: { error: "PEOPLE_SYNC_ENV is not set for this process" },
    targetStatus: 503,
  });
  try {
    const text = fact(mount, "Next run")!;
    assertStringIncludes(text.toLowerCase(), "unknown");
    assertStringIncludes(text, "PEOPLE_SYNC_ENV");
    assertEquals(mount.tag("table").length, 1);
  } finally {
    w.restore();
  }
});

Deno.test("page: the next run's target is shown even before any run is recorded", async () => {
  const { w, mount } = await page(idle, [], { runs: [] });
  try {
    assertStringIncludes(fact(mount, "Next run")!, "Dry run");
  } finally {
    w.restore();
  }
});

Deno.test("page: a target request that never answers does not stop the rest of the page drawing", async () => {
  const w = world(idle);
  const g = globalThis as Record<string, unknown>;
  const real = g.fetch as typeof fetch;
  // the target route hangs (for instance a permission prompt in the server's terminal);
  // the abort signal is the only way out, as with a real fetch
  g.fetch = (input: string | URL | Request, init?: RequestInit) => {
    if (String(input).includes("rdm/people_sync/target")) {
      return new Promise((_, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(init.signal!.reason),
        );
      });
    }
    return real(input, init);
  };
  try {
    const { PeopleSyncUI } = await import("./people_sync_page.ts");
    const mount = new FakeEl("div");
    const ui = new PeopleSyncUI({
      mountElement: mount as unknown as HTMLElement,
      baseUrl: "http://localhost:8111/",
      peopleBase: "./people/",
      targetTimeoutMs: 50,
    });
    await ui.refresh();
    assertStringIncludes(fact(mount, "Next run")!.toLowerCase(), "unknown");
    assertEquals(mount.tag("table").length, 1);
  } finally {
    w.restore();
  }
});

Deno.test("page: the target is a fact beside the latest run's own mode, so a person can tell them apart", async () => {
  const { w, mount } = await page(idle);
  try {
    assert(fact(mount, "Mode") !== undefined);
    assert(fact(mount, "Next run") !== undefined);
  } finally {
    w.restore();
  }
});

// ---- the push's items (cold DR-0037) ------------------------------------------------------

const PUSH_ITEMS = [
  {
    run_id: "r-full",
    clpid: "Doe-Jane",
    rdm_id: "id-old",
    action: "replace",
    outcome: "applied",
    message: "remove legacy entry id-old, replaced by Doe-Jane",
    scheme: "",
    value: "",
    recorded: "2026-11-12 09:00:00",
    status: "replaced",
    result_message: "delete raised X; the entry is gone",
    before: { name: "Doe, J." },
    detail: {
      replaced_by: "Doe-Jane",
      persons: ["Doe-Jane"],
      changes: ["name"],
      names: { "Doe-Jane": "<b>Doe, Jane</b>" },
    },
  },
  {
    run_id: "r-full",
    clpid: "Roe-Rich",
    rdm_id: "Roe-Rich",
    action: "update",
    outcome: "applied",
    message: "update entry Roe-Rich: orcid",
    scheme: "clpid",
    value: "Roe-Rich",
    recorded: "2026-11-12 09:00:00",
    status: "updated",
    before: { name: "Roe, Rich" },
    after: { name: "Roe, Rich" },
    detail: { changes: ["orcid"] },
  },
  {
    run_id: "r-full",
    clpid: "Gone-G",
    rdm_id: "Gone-G",
    action: "remove",
    outcome: "applied",
    message: "remove entry Gone-G: it is not a COLD person's entry",
    scheme: "",
    value: "",
    recorded: "2026-11-12 09:00:00",
    status: "removed",
    before: { name: "Gone, G." },
  },
  {
    run_id: "r-full",
    clpid: "Bad-Bo",
    rdm_id: null,
    action: "malformed_identifier",
    outcome: "warning",
    message: "COLD isni '3626 6637' is not well formed; not written",
    scheme: "isni",
    value: "3626 6637",
    recorded: "2026-11-12 09:00:00",
  },
];

const PUSH_RUN = {
  ...RUN,
  mode: "apply",
  counts: {
    people: 9238,
    warning: 1,
    applied: 9300,
    actions: { create: 9238, update: 1, replace: 8797, remove: 28 },
    index: { status: "rebuilt", message: "" },
    results: {},
  },
};

Deno.test("page: a replace shows the old name in RDM and COLD's name in COLD, as text, and no link to a removed entry", async () => {
  const { w, mount } = await page(idle, PUSH_ITEMS);
  try {
    const row = mount.tag("table")[0].tag("tbody")[0].tag("tr")[0];
    assertStringIncludes(row.children[3].textContent, "<b>Doe, Jane</b>");
    assertStringIncludes(row.children[4].textContent, "Doe, J.");
    assertEquals((row.children[4] as FakeEl).tag("a").length, 0);
    assertStringIncludes(row.children[1].textContent, "Legacy entry removed");
    assertStringIncludes(row.children[2].textContent, "Replace a legacy entry");
    assertStringIncludes(row.children[2].textContent, "the entry is gone");
    assertEquals(mount.tag("b").length, 0);
  } finally {
    w.restore();
  }
});

Deno.test("page: an updated entry links to the entry in RDM and says what changed", async () => {
  const { w, mount } = await page(idle, PUSH_ITEMS);
  try {
    const row = mount.tag("table")[0].tag("tbody")[0].tag("tr")[1];
    const links = (row.children[4] as FakeEl).tag("a");
    assertEquals(links.map((a) => a.getAttribute("href")), [
      "https://authors.example.test/api/names/Roe-Rich",
    ]);
    assertStringIncludes(
      links[0].getAttribute("aria-label") ?? "",
      "signed in",
    );
    assertStringIncludes(row.children[2].textContent, "Update the entry");
    assertStringIncludes(row.children[2].textContent, "orcid");
  } finally {
    w.restore();
  }
});

Deno.test("page: no row ever says there is 'no COLD person'; a removal says it is an RDM entry and a malformed identifier links its person", async () => {
  const { w, mount } = await page(idle, [...PUSH_ITEMS, ...ITEMS]);
  try {
    const table = mount.tag("table")[0];
    assert(!table.textContent.includes("no COLD person"), "misleading wording");
    const rows = table.tag("tbody")[0].tag("tr");
    const who = (clpid: string) =>
      rows.find((r) => r.children[0].textContent.includes(clpid))!
        .children[0] as FakeEl;
    assertEquals(who("Gone-G").textContent, "RDM entry Gone-G");
    assertEquals(who("Gone-G").tag("a").length, 0);
    const bad = who("Bad-Bo");
    assertEquals(bad.tag("a").map((a) => a.getAttribute("href")), [
      "./people/Bad-Bo",
    ]);
    assertEquals(bad.tag("a").map((a) => a.textContent), ["Bad-Bo"]);
  } finally {
    w.restore();
  }
});

Deno.test("page: a removal and a malformed identifier read in words, and the malformed one offers the rerun", async () => {
  const { w, mount } = await page(idle, PUSH_ITEMS);
  try {
    const rows = mount.tag("table")[0].tag("tbody")[0].tag("tr");
    assertStringIncludes(rows[2].children[1].textContent, "Removed from RDM");
    assertStringIncludes(rows[2].children[0].textContent, "Gone-G");
    assertEquals((rows[2].children[4] as FakeEl).tag("a").length, 0);
    assertEquals(
      (rows[3].children[5] as FakeEl).tag("button").map((b) => b.textContent),
      ["Rerun for Bad-Bo"],
    );
  } finally {
    w.restore();
  }
});

Deno.test("page: the counts line gives the actions and the index, and never mentions repairs or nothing-to-do people", async () => {
  const { w, mount } = await page(idle, PUSH_ITEMS);
  w.restore();
  void mount;
  const { countsText } = await import("./people_sync_page.ts");
  const text = countsText(PUSH_RUN);
  assertStringIncludes(text, "9238 people examined");
  assertStringIncludes(text, "9238 created");
  assertStringIncludes(text, "8797 legacy entries replaced");
  assertStringIncludes(text, "28 removed");
  assertStringIncludes(text, "1 updated");
  assertStringIncludes(text, "index rebuilt");
  assert(!text.includes("repair"));
  assert(!text.includes("nothing to do"));
});

Deno.test("page: the counts line of an older run still reports its repairs", async () => {
  const { countsText } = await import("./people_sync_page.ts");
  const text = countsText({ ...RUN, counts: { people: 3, needs_repair: 2 } });
  assertStringIncludes(text, "2 need repair in RDM");
});

Deno.test("page: the counts line says how many removed entries were restored, and says nothing when none were", async () => {
  const { countsText } = await import("./people_sync_page.ts");
  const applied = countsText({
    ...PUSH_RUN,
    counts: {
      people: 5,
      actions: { create: 1, update: 0, revive: 2, replace: 0, remove: 0 },
    },
  });
  assertStringIncludes(applied, "2 restored");
  const dry = countsText({
    ...PUSH_RUN,
    mode: "dry-run",
    counts: { people: 5, actions: { revive: 2 } },
  });
  assertStringIncludes(dry, "2 to restore");
  assert(
    !countsText(PUSH_RUN).includes("restore"),
    "mentioned a restore when there were none",
  );
});

Deno.test("page: a failed index rebuild is said in the counts line", async () => {
  const { countsText } = await import("./people_sync_page.ts");
  const text = countsText({
    ...PUSH_RUN,
    counts: { people: 1, index: { status: "error", message: "queue is down" } },
  });
  assertStringIncludes(text, "index rebuild failed");
});

Deno.test("page: only a COLD-fixable item offers a rerun, labelled with the person", async () => {
  const { w, mount } = await page(idle);
  try {
    const rows = mount.tag("table")[0].tag("tbody")[0].tag("tr");
    const labels = (r: FakeEl) => r.tag("button").map((b) => b.textContent);
    assertEquals(labels(rows[0]), ["Rerun for Doe-Jane"]);
    assertEquals(labels(rows[1]), []);
    assertStringIncludes(
      rows[1].children[5].textContent.toLowerCase(),
      "outside cold",
    );
  } finally {
    w.restore();
  }
});

// ---- items stored by an earlier build (cold DR-0036: alternate names are out of scope) -------

const CANDIDATES = [
  {
    run_id: "r-full",
    clpid: "Doe-Jane",
    rdm_id: "abcde-12345",
    action: "alt_name_candidate",
    outcome: "info",
    message: "RDM name form 'Doe, J.' could be an alt_name of Doe-Jane",
    scheme: "alt_name",
    value: "Doe, J.",
    recorded: "2026-11-10 23:05:30",
    detail: {
      fix: "cold",
      cold: { "Doe-Jane": { orcid: "0000-0002-0000-0001", isni: "" } },
      rdm: {
        ids: ["abcde-12345"],
        clpids: ["Doe-Jane"],
        orcids: [],
        isnis: [],
      },
    },
  },
  {
    run_id: "r-full",
    clpid: "Roe-Rae",
    rdm_id: "fghij-67890",
    action: "alt_name_candidate",
    outcome: "info",
    message: "RDM name form 'Roe, R.' could be an alt_name of Roe-Rae",
    scheme: "alt_name",
    value: "Roe, R.",
    recorded: "2026-11-10 23:05:30",
    detail: {
      fix: "cold",
      cold: { "Roe-Rae": { orcid: "", isni: "" } },
      rdm: { ids: ["fghij-67890"], clpids: ["Roe-Rae"], orcids: [], isnis: [] },
    },
  },
];

Deno.test("page: an alt_name_candidate row from an earlier build is one more row in the one table, with no second heading", async () => {
  const { w, mount } = await page(idle, [...ITEMS, ...CANDIDATES]);
  try {
    assertEquals(mount.tag("table").length, 1);
    assertEquals(mount.tag("h3").length, 0);
    assertEquals(mount.tag("table")[0].tag("tbody")[0].tag("tr").length, 5);
    const lead = mount.find((e) =>
      e.tagName === "p" && e.textContent.includes("items from the run started")
    );
    assertStringIncludes(lead[0].textContent, "5 items from the run started");
  } finally {
    w.restore();
  }
});

Deno.test("page: there is one table and no second heading", async () => {
  const { w, mount } = await page(idle);
  try {
    assertEquals(mount.tag("table").length, 1);
    assertEquals(mount.tag("h3").length, 0);
  } finally {
    w.restore();
  }
});

Deno.test("page: the start button keeps focus when blocked (aria-disabled, never disabled) and says why", async () => {
  const blocked = await page(busy);
  try {
    const b = blocked.mount.tag("button").find((x) =>
      x.getAttribute("id") === "ps-start"
    )!;
    assertEquals(b.getAttribute("aria-disabled"), "true");
    assertEquals(b.attrs.has("disabled"), false);
    const why = blocked.mount.find((e) =>
      e.getAttribute("id") === "ps-reason"
    )[0];
    assertStringIncludes(why.textContent, "already waiting or running");
    assertEquals(b.getAttribute("aria-describedby"), "ps-reason");
  } finally {
    blocked.w.restore();
  }
  const free = await page(idle);
  try {
    const b = free.mount.tag("button").find((x) =>
      x.getAttribute("id") === "ps-start"
    )!;
    assertEquals(b.getAttribute("aria-disabled"), "false");
  } finally {
    free.w.restore();
  }
});

Deno.test("page: a click files the batch request; a click while blocked sends nothing", async () => {
  const free = await page(idle);
  try {
    const b = free.mount.tag("button").find((x) =>
      x.getAttribute("id") === "ps-start"
    )!;
    b.click();
    await new Promise((r) => queueMicrotask(() => r(null)));
    await new Promise((r) => queueMicrotask(() => r(null)));
    assertEquals(free.w.posts.length, 1);
    assertEquals(
      free.w.posts[0].body,
      "report_name=run_people_sync&trigger=human",
    );
    assertStringIncludes(free.w.posts[0].url, "/reports");
  } finally {
    free.w.restore();
  }
  const blocked = await page(busy);
  try {
    blocked.mount.tag("button").find((x) =>
      x.getAttribute("id") === "ps-start"
    )!.click();
    await new Promise((r) => queueMicrotask(() => r(null)));
    assertEquals(blocked.w.posts.length, 0);
  } finally {
    blocked.w.restore();
  }
});

Deno.test("page: a rerun click while a sync is running sends nothing and says why", async () => {
  const { w, mount } = await page(busy);
  try {
    const rerun = mount.tag("button").find((x) =>
      x.textContent === "Rerun for Doe-Jane"
    )!;
    rerun.click();
    await new Promise((r) => queueMicrotask(() => r(null)));
    assertEquals(w.posts.length, 0);
    const status = mount.find((e) => e.getAttribute("role") === "status")[0];
    assertStringIncludes(status.textContent, "already waiting or running");
  } finally {
    w.restore();
  }
});

Deno.test("page: a rerun click files the one-person request for that clpid", async () => {
  const { w, mount } = await page(idle);
  try {
    const rerun = mount.tag("button").find((x) =>
      x.textContent === "Rerun for Doe-Jane"
    )!;
    rerun.click();
    await new Promise((r) => queueMicrotask(() => r(null)));
    await new Promise((r) => queueMicrotask(() => r(null)));
    assertEquals(w.posts.map((p) => p.body), [
      "report_name=run_people_sync_person&clpid=Doe-Jane&trigger=human",
    ]);
  } finally {
    w.restore();
  }
});

Deno.test("page: it polls only while a sync is pending or running, so an idle tab sends nothing", async () => {
  const quiet = await page(idle);
  try {
    assertEquals(quiet.w.intervals, 0);
  } finally {
    quiet.w.restore();
  }
  const active = await page(busy);
  try {
    assertEquals(active.w.intervals, 1);
  } finally {
    active.w.restore();
  }
});

Deno.test("person action: a failed request's reason is shown on the person page, not hidden", async () => {
  const failedRequest = [{
    id: "x",
    report_name: "run_people_sync",
    status: "error",
    requested: "2026-11-11T00:10:12.270Z",
    updated: "2026-11-11T00:10:35.565Z",
  }];
  const w = world(failedRequest);
  const failedRun = {
    ...RUN,
    state: "error",
    started: "2026-11-11 00:10:20",
    finished: "2026-11-11 00:10:35",
    error: "ssh: connect timed out",
  };
  const base = (globalThis as Record<string, unknown>).fetch as typeof fetch;
  (globalThis as Record<string, unknown>).fetch = (
    i: string | URL | Request,
    init?: RequestInit,
  ) =>
    String(i).includes("people_sync_latest_run") && !String(i).includes("full")
      ? Promise.resolve(
        new Response(JSON.stringify([failedRun]), { status: 200 }),
      )
      : base(i, init);
  try {
    const { PeopleSyncPersonUI } = await import("./people_sync_person.ts");
    const mount = new FakeEl("div");
    const ui = new PeopleSyncPersonUI({
      mountElement: mount as unknown as HTMLElement,
      baseUrl: "http://localhost:8111/",
      clpid: "Doe-Jane",
    });
    await ui.refresh();
    const status = mount.find((e) => e.getAttribute("role") === "status")[0];
    assertStringIncludes(status.textContent, "ssh: connect timed out");
    const b = mount.tag("button")[0];
    assertEquals(b.getAttribute("aria-disabled"), "false"); // a failed run does not block a retry
  } finally {
    w.restore();
  }
});

/** The real timer, captured before any world() replaces the global one with a no-op. */
const realSetTimeout = globalThis.setTimeout;

/** flush lets the fake fetches and the redraw that follows them settle. */
const flush = () => new Promise<void>((r) => realSetTimeout(r, 20));

// ---- the person page's latest outcome stays current ------------------------------------------

const OLD_WARNING = {
  run_id: "r-old",
  clpid: "Doe-Jane",
  rdm_id: null,
  action: "malformed_identifier",
  outcome: "warning",
  message: "COLD isni '3626 6637' is not well formed; not written",
  scheme: "isni",
  value: "3626 6637",
  recorded: "2026-11-12 18:31:23",
};

/** personPage mounts the person page's sync action over the fake world. */
async function personPage(extra: Extra) {
  const w = world(idle, ITEMS, extra);
  const { PeopleSyncPersonUI } = await import("./people_sync_person.ts");
  const mount = new FakeEl("div");
  const ui = new PeopleSyncPersonUI({
    mountElement: mount as unknown as HTMLElement,
    baseUrl: "http://localhost:8111/",
    clpid: "Doe-Jane",
  });
  await ui.refresh();
  const outcome = () => mount.tag("p").at(-1)!.textContent;
  return { w, mount, ui, outcome };
}

Deno.test("person page: once a newer sync covered the person and found nothing, the old warning is not shown as their outcome", async () => {
  const { w, outcome } = await personPage({
    runFor: [{
      ...RUN,
      run_id: "r-new",
      mode: "dry-run",
      started: "2026-11-12 18:42:52",
    }],
    latestItem: [OLD_WARNING],
  });
  try {
    assertStringIncludes(outcome().toLowerCase(), "nothing to report");
    assertStringIncludes(outcome(), "2026-11-12 18:42:52");
    assert(!outcome().includes("not well formed"), outcome());
  } finally {
    w.restore();
  }
});

Deno.test("person page: an item from the latest run covering the person is still shown", async () => {
  const { w, outcome } = await personPage({
    runFor: [{ ...RUN, run_id: "r-old" }],
    latestItem: [OLD_WARNING],
  });
  try {
    assertStringIncludes(outcome(), "not well formed");
    assertStringIncludes(outcome(), "Latest outcome (2026-11-12 18:31:23)");
  } finally {
    w.restore();
  }
});

Deno.test("person page: it asks for the run that covered this person, by clpid", async () => {
  const { w } = await personPage({ runFor: [RUN] });
  try {
    const asked = w.fetches.filter((u) =>
      u.includes("people_sync_latest_run_for")
    );
    assertEquals(asked.length >= 1, true);
    assertStringIncludes(asked[0], "clpid=Doe-Jane");
  } finally {
    w.restore();
  }
});

Deno.test("person page: coming back to the tab refreshes the outcome without a reload, and a hidden tab sends nothing", async () => {
  const { w, outcome } = await personPage({
    runFor: [{ ...RUN, run_id: "r-old" }],
    latestItem: [OLD_WARNING],
  });
  try {
    const before = w.fetches.length;
    w.visibility = "hidden";
    w.fire("visibilitychange");
    await flush();
    assertEquals(w.fetches.length, before, "a hidden tab must send nothing");
    w.visibility = "visible";
    w.fire("visibilitychange");
    await flush();
    assert(w.fetches.length > before, "returning to the tab must refresh");
    assertStringIncludes(outcome(), "not well formed");
  } finally {
    w.restore();
  }
});

Deno.test("sync page: coming back to the tab refreshes it too, and a hidden tab sends nothing", async () => {
  const { w } = await page(idle);
  try {
    const before = w.fetches.length;
    w.visibility = "hidden";
    w.fire("visibilitychange");
    await flush();
    assertEquals(w.fetches.length, before);
    w.visibility = "visible";
    w.fire("visibilitychange");
    await flush();
    assert(w.fetches.length > before);
  } finally {
    w.restore();
  }
});
