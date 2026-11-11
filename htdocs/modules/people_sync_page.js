// client_api.ts
var ClientAPI = class {
  baseUrl = "../";
  constructor(baseUrl) {
    baseUrl === void 0 ? "" : this.baseUrl = baseUrl;
  }
  joinUrlPath(baseUrl, path) {
    const url = typeof baseUrl === "string" && !/^([a-z]+:)?\/\//i.test(baseUrl) ? new URL(baseUrl, window.location.href) : new URL(baseUrl);
    const normalizedPath = path.replace(/^\/+/, "");
    const combinedPath = `${url.pathname}/${normalizedPath}`.replace(/\/\/+/g, "/");
    const newUrl = new URL(url.origin + combinedPath);
    return newUrl.toString();
  }
  async getStringList(c_name, query_name, params) {
    const base_url = this.joinUrlPath(this.baseUrl, `/api/${c_name}/${query_name}`);
    let uri = base_url;
    let resp;
    if (params !== void 0) {
      uri = `${base_url}?${params}`;
    }
    try {
      resp = await fetch(uri, {
        headers: {
          "Content-Type": "application/json"
        },
        method: "GET"
      });
    } catch (err) {
      return [];
    }
    if (resp.ok) {
      const src = await resp.text();
      if (src !== void 0 && src !== "") {
        let l = [];
        try {
          l = JSON.parse(src);
        } catch (err) {
          return [];
        }
        return l;
      }
    }
    return [];
  }
  getParamNames(params) {
    return params ? Array.from(params.keys()) : [];
  }
  async getList(c_name, query_name, params) {
    const fieldList = this.getParamNames(params);
    const base_url = this.joinUrlPath(this.baseUrl, `/api/${c_name}/${query_name}`);
    let uri = base_url;
    if (fieldList.length > 0) {
      uri = `${base_url}/${fieldList.join("/")}?${params.toString()}`;
    }
    try {
      const resp = await fetch(uri, {
        headers: {
          "Content-Type": "application/json"
        },
        method: "GET"
      });
      if (!resp.ok) {
        return [];
      }
      const src = await resp.text();
      if (src !== void 0 && src !== "") {
        try {
          return JSON.parse(src);
        } catch (err) {
          return [];
        }
      }
    } catch (err) {
      console.log(`ERROR: fetching ${uri}, ${err}`);
      return [];
    }
    return [];
  }
  /**
   * getGroupsList returns an array of clgid and group names.  If list can't be retrieved
   * then an empty list is return.
   * @returns an array of objects consisting of clgid and group name.
   */
  async getGroupsList() {
    const c_name = "groups";
    const query_name = "group_names";
    return await this.getList(c_name, query_name);
  }
  /**
   * getPeopleList returns an array of clpid and group names.  If list can't be retrieved
   * then an empty list is return.
   * @returns an array of objects consisting of clgid and group name.
   */
  async getPeopleList() {
    const c_name = "people";
    const query_name = "people_names";
    return await this.getList(c_name, query_name);
  }
  async lookupGroupName(name) {
    const c_name = "groups.ds";
    const query_name = "lookup_name";
    let params = new URLSearchParams();
    params.append("q", name + "%");
    params.append("alternate", name + "%");
    return await this.getList(c_name, query_name, params);
  }
  async lookupGroupMembership(clgid) {
    const c_name = "people.ds";
    const query_name = "lookup_clgid";
    let params = new URLSearchParams();
    params.append("q", clgid);
    return await this.getList(c_name, query_name, params);
  }
  async getROR(ror) {
    const c_name = "ror.ds";
    const query_name = "get_ror";
    let params = new URLSearchParams();
    params.append("q", ror);
    return await this.getList(c_name, query_name, params);
  }
  async lookupRORByName(funder_name) {
    const c_name = "ror.ds";
    const query_name = "lookup_ror_by_name";
    let params = new URLSearchParams();
    params.append("q", funder_name);
    return await this.getList(c_name, query_name, params);
  }
  async lookupRORByAcronym(acronym) {
    const c_name = "ror.ds";
    const query_name = "lookup_ror_by_acronym";
    let params = new URLSearchParams();
    params.append("q", acronym);
    return await this.getList(c_name, query_name, params);
  }
  async lookupPeopleName(clpid) {
    const params = new URLSearchParams();
    params.append("clpid", clpid);
    return await this.getList("people.ds", "lookup_people_name", params);
  }
  async lookupPersonByClpid(clpid) {
    const params = new URLSearchParams();
    params.append("clpid", clpid);
    return await this.getList("people.ds", "lookup_person_by_clpid", params);
  }
  async validateClpid(clpid) {
    const params = new URLSearchParams();
    params.append("clpid", clpid);
    const results = await this.getList("people.ds", "validate_clpid", params);
    return results.length > 0;
  }
  async validateClgid(clgid) {
    const params = new URLSearchParams();
    params.append("clgid", clgid);
    const results = await this.getList("groups.ds", "validate_clgid", params);
    return results.length > 0;
  }
};

// validator.ts
function isValidClpid(clpid) {
  const pattern = /^[^\s]+(?:-[^\s]+)*(?:-|\.)?$/u;
  return pattern.test(clpid);
}

// people_sync_view.ts
var SYNC_REPORT_NAMES = [
  "run_people_sync",
  "run_people_sync_person"
];
function reviewCount(run) {
  const c = run?.counts ?? {};
  return [
    "needs_human",
    "needs_repair",
    "warning"
  ].reduce((n, k) => n + (typeof c[k] === "number" ? c[k] : 0), 0);
}
function latestSyncRequest(reports) {
  return reports.filter((r) => SYNC_REPORT_NAMES.includes(r.report_name)).sort((a, b) => String(b.updated).localeCompare(String(a.updated)))[0];
}
function ownRunError(request, run) {
  if (!request || !run || run.state !== "error" || !run.error || !request.requested) {
    return "";
  }
  const asked = Date.parse(request.requested);
  const started = Date.parse(`${run.started.replace(" ", "T")}Z`);
  return Number.isFinite(asked) && Number.isFinite(started) && started >= asked - 1e3 ? run.error : "";
}
function syncView(request, run) {
  const dryRun = run?.mode === "dry-run";
  const n = reviewCount(run);
  const view = (state, headline, canStart) => ({
    state,
    headline,
    canStart,
    dryRun,
    reviewCount: n
  });
  switch (request?.status) {
    case "requested":
      return view("pending", "A sync is waiting to start.", false);
    case "processing":
      return view("running", "A sync is running.", false);
    case void 0:
    case "completed":
      break;
    default: {
      const reason = ownRunError(request, run);
      return view("error", reason ? `The last sync request failed: ${reason}.` : "The last sync request failed before it recorded a run. See the reports list for details.", true);
    }
  }
  if (run === void 0) {
    return view("never", "No sync has run yet.", true);
  }
  if (run.state === "running") {
    return view("stalled", `The sync that started ${run.started} did not finish.`, true);
  }
  if (run.state === "error") {
    return view("error", `The last sync failed: ${run.error || "no reason was recorded"}.`, true);
  }
  const prefix = dryRun ? "Dry run completed" : "Completed";
  if (n > 0) {
    return view("completed_review", `${prefix} ${run.finished}: ${n} ${n === 1 ? "item needs" : "items need"} a person.`, true);
  }
  return view("completed_clean", `${prefix} ${run.finished}: nothing needs review.`, true);
}
function startRequest(clpid) {
  if (clpid === void 0) {
    return new URLSearchParams({
      report_name: "run_people_sync"
    });
  }
  if (!isValidClpid(clpid)) {
    throw new Error(`${JSON.stringify(clpid)} is not a valid clpid`);
  }
  return new URLSearchParams({
    report_name: "run_people_sync_person",
    clpid
  });
}
function personHref(base, clpid) {
  return `${base.replace(/\/*$/, "/")}${encodeURIComponent(clpid)}`;
}
function rdmLinkText(id) {
  const text = `${id}, JSON API entry for a person in RDM, not a metadata record`;
  return {
    label: text,
    title: text
  };
}
function rdmEntryHref(base, id) {
  return /^https?:\/\/[^\s/]/i.test(base) ? `${base.replace(/\/+$/, "")}/api/names/${encodeURIComponent(id)}` : "";
}
var OUTCOME_LABEL = {
  needs_human: "Needs a person to decide",
  needs_repair: "Needs repair in RDM",
  warning: "Warning",
  applied: "Applied change"
};
var STATUS_LABEL = {
  would_create: "Would be created (dry run)",
  would_update: "Would be updated (dry run)",
  created: "Created in RDM",
  updated: "Updated in RDM",
  skipped: "Skipped: RDM changed since the plan was made",
  error: "Failed",
  not_attempted: "Not attempted"
};
function itemView(item, peopleBase, rdmBase = "") {
  const base = {
    outcome: item.outcome,
    outcomeLabel: OUTCOME_LABEL[item.outcome] ?? item.outcome,
    statusLabel: item.status ? STATUS_LABEL[item.status] ?? item.status : "",
    action: item.action,
    message: item.message,
    clpid: item.clpid,
    people: [],
    cold: [],
    rdm: null,
    rdmLinks: [],
    rerun: [],
    fixInCold: false,
    fixNote: ""
  };
  if (item.outcome === "applied") {
    return {
      ...base,
      people: [
        {
          clpid: item.clpid,
          href: personHref(peopleBase, item.clpid)
        }
      ]
    };
  }
  const d = item.detail;
  if (d === void 0 || d.fix === void 0) {
    return {
      ...base,
      fixNote: "No detail was recorded for this item (it predates the detail field); rerun the sync to record it."
    };
  }
  const clpids = Object.keys(d.cold ?? {}).sort();
  const fixInCold = d.fix === "cold";
  return {
    ...base,
    people: clpids.map((c) => ({
      clpid: c,
      href: personHref(peopleBase, c)
    })),
    cold: clpids.map((c) => ({
      clpid: c,
      ...d.cold[c]
    })),
    rdm: d.rdm && Object.keys(d.rdm).length > 0 ? d.rdm : null,
    rdmLinks: (d.rdm?.ids ?? []).flatMap((id) => {
      const href = rdmEntryHref(rdmBase, id);
      return href ? [
        {
          id,
          href,
          ...rdmLinkText(id)
        }
      ] : [];
    }),
    rerun: fixInCold ? clpids : [],
    fixInCold,
    fixNote: fixInCold ? "Fix this in COLD, then rerun the sync for the person. If the RDM value is the wrong one, correcting it is outside COLD." : "The fix is outside COLD: the entry lives in RDM, and this stays listed until it is corrected there."
  };
}

// people_sync_page.ts
var SyncClient = class {
  api;
  constructor(baseUrl) {
    this.api = new ClientAPI(String(baseUrl));
  }
  url(path) {
    return this.api.joinUrlPath(this.api.baseUrl, path);
  }
  async getJSON(path) {
    const resp = await fetch(this.url(path), {
      headers: {
        "Accept": "application/json"
      }
    });
    if (!resp.ok) throw new Error(`${path}: HTTP ${resp.status}`);
    return await resp.json();
  }
  /** latestRun returns the latest run, of any scope, or undefined. */
  async latestRun() {
    const rows = await this.getJSON("api/people_sync_runs.ds/people_sync_latest_run");
    return Array.isArray(rows) ? rows[0] : void 0;
  }
  /** latestFullRun returns the latest run covering everyone, or undefined. */
  async latestFullRun() {
    const rows = await this.getJSON("api/people_sync_runs.ds/people_sync_latest_full_run");
    return Array.isArray(rows) ? rows[0] : void 0;
  }
  /** runItems returns a run's items, those needing a person first. */
  async runItems(runId) {
    const rows = await this.getJSON(`api/people_sync_items.ds/people_sync_run_items/run_id?run_id=${encodeURIComponent(runId)}`);
    return Array.isArray(rows) ? rows : [];
  }
  /** latestItem returns the newest item recorded for one person, or undefined. */
  async latestItem(clpid) {
    const rows = await this.getJSON(`api/people_sync_items.ds/people_sync_latest_item/clpid?clpid=${encodeURIComponent(clpid)}`);
    return Array.isArray(rows) ? rows[0] : void 0;
  }
  /** latestRequest returns the newest sync request in the report queue. */
  async latestRequest() {
    const rows = await this.getJSON("api/reports.ds/report_list");
    return Array.isArray(rows) ? latestSyncRequest(rows) : void 0;
  }
  /** start files a sync request: everyone, or one person. Throws with a
   * message fit to show the user when the request is refused. */
  async start(clpid) {
    const body = startRequest(clpid);
    const resp = await fetch(this.url("reports"), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: body.toString()
    });
    if (!resp.ok) {
      await resp.body?.cancel();
      throw new Error(`the sync request was refused (HTTP ${resp.status})`);
    }
    await resp.body?.cancel();
  }
};
function el(tag, text = "", attrs = {}) {
  const e = document.createElement(tag);
  if (text !== "") e.textContent = text;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
function setIfChanged(e, text) {
  if (e.textContent !== text) e.textContent = text;
}
function coldText(c) {
  const parts = [
    c.orcid ? `ORCID ${c.orcid}` : "no ORCID",
    c.isni ? `ISNI ${c.isni}` : "no ISNI"
  ];
  return `${c.clpid}: ${parts.join(", ")}`;
}
function rdmText(r) {
  const lines = [
    `Entry ${r.ids.join(", ")}`
  ];
  if (r.clpids.length) lines.push(`clpid ${r.clpids.join(", ")}`);
  if (r.orcids.length) lines.push(`ORCID ${r.orcids.join(", ")}`);
  if (r.isnis.length) lines.push(`ISNI ${r.isnis.join(", ")}`);
  return lines;
}
var PeopleSyncUI = class {
  client;
  mount;
  peopleBase;
  status;
  facts;
  button;
  reason;
  results;
  view;
  timer;
  lastFinished = "";
  constructor(options) {
    this.mount = options.mountElement;
    this.client = new SyncClient(options.baseUrl);
    this.peopleBase = options.peopleBase ?? "./people/";
    this.build();
    this.refresh();
  }
  build() {
    this.mount.replaceChildren();
    const status = el("section", "", {
      "aria-labelledby": "ps-status-h"
    });
    status.append(el("h2", "Status", {
      id: "ps-status-h"
    }));
    this.status = el("p", "Loading the latest sync\u2026", {
      role: "status",
      "aria-live": "polite",
      id: "ps-status"
    });
    this.facts = el("dl", "", {
      id: "ps-facts"
    });
    this.button = el("button", "Sync all people now", {
      type: "button",
      "aria-describedby": "ps-reason",
      id: "ps-start"
    });
    this.reason = el("p", "", {
      id: "ps-reason"
    });
    this.button.addEventListener("click", () => {
      if (this.button.getAttribute("aria-disabled") === "true") return;
      this.start();
    });
    status.append(this.status, this.facts, this.button, this.reason);
    this.results = el("section", "", {
      "aria-labelledby": "ps-items-h"
    });
    this.mount.append(status, this.results);
  }
  /** refresh reads the request queue and the latest runs and redraws. */
  async refresh() {
    let request, latest, full;
    try {
      [request, latest, full] = await Promise.all([
        this.client.latestRequest(),
        this.client.latestRun(),
        this.client.latestFullRun()
      ]);
    } catch (err) {
      setIfChanged(this.status, `The sync status could not be read: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    const view = syncView(request, latest);
    this.view = view;
    setIfChanged(this.status, view.headline);
    this.drawFacts(latest, full);
    this.setButton(view);
    await this.drawItems(latest, full);
    this.poll(view);
  }
  /** poll refreshes every few seconds while a sync is pending or running, and
   * stops when it is not, so an idle tab causes no traffic. */
  poll(view) {
    const active = view.state === "pending" || view.state === "running";
    if (active && this.timer === void 0) {
      this.timer = setInterval(() => this.refresh(), 5e3);
    }
    if (!active && this.timer !== void 0) {
      clearInterval(this.timer);
      this.timer = void 0;
    }
  }
  setButton(view) {
    this.button.setAttribute("aria-disabled", String(!view.canStart));
    setIfChanged(this.reason, view.canStart ? "Starts a sync of every person. It is queued, and its result appears here." : "A sync is already waiting or running, so another cannot be started.");
  }
  drawFacts(latest, full) {
    this.facts.replaceChildren();
    const add = (k, v) => {
      this.facts.append(el("dt", k), el("dd", v));
    };
    if (!latest) {
      add("Target", "no run recorded yet");
      return;
    }
    add("Target of the latest run", `${latest.rdm_url} (new runs use the target set in this COLD server's configuration)`);
    add("Mode", latest.mode === "dry-run" ? "Dry run: RDM was read and not changed" : "Apply: safe changes were written to RDM");
    add("Latest run", `${latest.scope === "all" ? "everyone" : latest.scope}, started ${latest.started}, ${latest.finished ? `finished ${latest.finished}` : "not finished"}, started by ${latest.trigger || "unknown"}`);
    if (full && full.run_id !== latest.run_id) {
      add("Last full sync", `started ${full.started}, ${full.state}`);
    }
    const c = latest.counts ?? {};
    const n = (k) => typeof c[k] === "number" ? c[k] : 0;
    add("Counts", `${n("people")} people examined; ${n("needs_human")} need a person, ${n("needs_repair")} need repair in RDM, ${n("warning")} warnings, ${n("applied")} changes, ${n("info")} with nothing to do`);
    if (latest.program_hash) {
      add("Program", `irdmtools ${latest.irdmtools_version || "(version unknown)"}, files ${latest.program_hash.slice(0, 12)}`);
    }
  }
  async drawItems(latest, full) {
    const shown = full ?? latest;
    if (!shown) {
      this.results.replaceChildren();
      return;
    }
    if (this.results.dataset.run === shown.run_id + shown.finished) return;
    let items;
    try {
      items = await this.client.runItems(shown.run_id);
    } catch (err) {
      this.results.replaceChildren(el("p", `The items could not be read: ${err instanceof Error ? err.message : String(err)}`));
      return;
    }
    this.results.dataset.run = shown.run_id + shown.finished;
    const h = el("h2", "Items from the last full sync", {
      id: "ps-items-h"
    });
    const lead = el("p", items.length === 0 ? "This run has nothing to list." : `${items.length} items from the run started ${shown.started}. Items that need a person come first. To correct one, follow the link to the person in COLD, fix it there, then use Rerun for that person.`);
    this.results.replaceChildren(h, lead);
    if (items.length > 0) this.results.append(this.table(items, shown));
    if (latest && full && latest.run_id !== full.run_id) {
      await this.drawScoped(latest);
    }
  }
  async drawScoped(run) {
    const items = await this.client.runItems(run.run_id).catch(() => []);
    const h = el("h2", `Latest one-person run: ${run.scope.replace(/^clpid:/, "")}`);
    this.results.append(h);
    this.results.append(items.length === 0 ? el("p", `Started ${run.started}: nothing to list for this person.`) : this.table(items, run));
  }
  table(items, run) {
    const wrap = el("div", "", {
      role: "region",
      "aria-label": `Items from the run started ${run.started}`,
      tabindex: "0",
      class: "ps-scroll"
    });
    const t = el("table", "", {
      class: "ps-items"
    });
    t.append(el("caption", `Sync items, run started ${run.started}`));
    const head = el("tr");
    for (const h of [
      "Person",
      "Outcome",
      "What was found",
      "In COLD",
      "In RDM",
      "What to do"
    ]) head.append(el("th", h, {
      scope: "col"
    }));
    const thead = el("thead");
    thead.append(head);
    t.append(thead);
    const body = el("tbody");
    for (const item of items) {
      body.append(this.row(itemView(item, this.peopleBase, run.rdm_url)));
    }
    t.append(body);
    wrap.append(t);
    return wrap;
  }
  row(v) {
    const tr = el("tr");
    const who = el("th", "", {
      scope: "row"
    });
    if (v.people.length === 0) {
      who.textContent = v.clpid ? `${v.clpid} (no COLD person)` : "(no COLD person)";
    }
    v.people.forEach((p, i) => {
      if (i > 0) who.append(", ");
      who.append(el("a", p.clpid, {
        href: p.href
      }));
    });
    const outcome = el("td", v.outcomeLabel);
    if (v.statusLabel) outcome.append(el("br"), v.statusLabel);
    const found = el("td", v.message);
    const cold = el("td");
    if (v.cold.length === 0) cold.textContent = "Nothing to show";
    v.cold.forEach((c, i) => {
      if (i > 0) cold.append(el("br"));
      cold.append(coldText(c));
    });
    const rdm = el("td");
    if (v.rdm === null) rdm.textContent = "Nothing to show";
    else {
      rdm.append("Entry ");
      v.rdm.ids.forEach((id, i) => {
        if (i > 0) rdm.append(", ");
        const link = v.rdmLinks.find((l) => l.id === id);
        rdm.append(link ? el("a", id, {
          href: link.href,
          "aria-label": link.label,
          title: link.title
        }) : id);
      });
      for (const line of rdmText(v.rdm).slice(1)) {
        rdm.append(el("br"), line);
      }
    }
    const todo = el("td", v.fixNote);
    for (const clpid of v.rerun) {
      const b = el("button", `Rerun for ${clpid}`, {
        type: "button"
      });
      b.addEventListener("click", () => {
        if (this.button.getAttribute("aria-disabled") === "true") {
          this.status.textContent = "A sync is already waiting or running, so another cannot be started.";
          return;
        }
        this.start(clpid);
      });
      todo.append(el("br"), b);
    }
    tr.append(who, outcome, found, cold, rdm, todo);
    return tr;
  }
  /** start files a request and then watches it. */
  async start(clpid) {
    this.button.setAttribute("aria-disabled", "true");
    this.status.textContent = clpid ? `Requesting a sync for ${clpid}\u2026` : "Requesting a sync of everyone\u2026";
    try {
      await this.client.start(clpid);
    } catch (err) {
      this.status.textContent = err instanceof Error ? err.message : String(err);
      this.button.setAttribute("aria-disabled", "false");
      return;
    }
    this.status.textContent = "Sync requested. It waits for the report runner.";
    this.view = {
      ...this.view,
      state: "pending",
      canStart: false
    };
    this.poll(this.view);
    setTimeout(() => this.refresh(), 1500);
  }
};
export {
  PeopleSyncUI,
  SyncClient,
  personHref
};
