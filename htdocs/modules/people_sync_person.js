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

// people_sync_person.ts
var PeopleSyncPersonUI = class {
  client;
  clpid;
  mount;
  button;
  status;
  outcome;
  timer;
  constructor(options) {
    this.mount = options.mountElement;
    this.clpid = options.clpid;
    this.client = new SyncClient(options.baseUrl);
    const h = document.createElement("h2");
    h.textContent = "RDM sync";
    h.id = "ps-person-h";
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.textContent = `Sync ${this.clpid} to RDM`;
    this.status = document.createElement("p");
    this.status.setAttribute("role", "status");
    this.status.setAttribute("aria-live", "polite");
    this.outcome = document.createElement("p");
    this.mount.setAttribute("aria-labelledby", "ps-person-h");
    this.mount.replaceChildren(h, this.button, this.status, this.outcome);
    this.button.addEventListener("click", () => {
      if (this.button.getAttribute("aria-disabled") === "true") return;
      this.start();
    });
    this.refresh();
  }
  /** refresh reads the latest request and this person's latest outcome. */
  async refresh() {
    try {
      const [request, run, item] = await Promise.all([
        this.client.latestRequest(),
        this.client.latestRun(),
        this.client.latestItem(this.clpid)
      ]);
      const view = syncView(request, run);
      const busy = view.state === "pending" || view.state === "running";
      this.button.setAttribute("aria-disabled", String(busy));
      const text = busy || view.state === "error" || view.state === "stalled" ? view.headline : "";
      if (this.status.textContent !== text) this.status.textContent = text;
      const line = item === void 0 ? "No sync outcome is recorded for this person (a person with nothing to report has none)." : (() => {
        const v = itemView(item, "./");
        return `Latest outcome (${item.recorded}): ${v.outcomeLabel}${v.statusLabel ? `, ${v.statusLabel}` : ""}. ${v.message}`;
      })();
      if (this.outcome.textContent !== line) this.outcome.textContent = line;
      if (busy && this.timer === void 0) {
        this.timer = setInterval(() => this.refresh(), 5e3);
      }
      if (!busy && this.timer !== void 0) {
        clearInterval(this.timer);
        this.timer = void 0;
      }
    } catch (err) {
      this.status.textContent = `The sync status could not be read: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  /** start files the one-person sync. */
  async start() {
    this.button.setAttribute("aria-disabled", "true");
    this.status.textContent = `Requesting a sync for ${this.clpid}\u2026`;
    try {
      await this.client.start(this.clpid);
    } catch (err) {
      this.status.textContent = err instanceof Error ? err.message : String(err);
      this.button.setAttribute("aria-disabled", "false");
      return;
    }
    this.status.textContent = "Sync requested. It waits for the report runner.";
    setTimeout(() => this.refresh(), 1500);
    if (this.timer === void 0) {
      this.timer = setInterval(() => this.refresh(), 5e3);
    }
  }
};
var mount = typeof document !== "undefined" ? document.getElementById("people-sync-person") : null;
if (mount && mount.dataset.clpid) {
  window.addEventListener("DOMContentLoaded", () => {
    new PeopleSyncPersonUI({
      mountElement: mount,
      baseUrl: "../",
      clpid: mount.dataset.clpid
    });
  });
}
export {
  PeopleSyncPersonUI
};
