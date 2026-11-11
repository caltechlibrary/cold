/**
 * people_sync_page.ts renders the COLD/RDM people sync page (cold#122, DR-0032,
 * plan Phase 5) and the shared client the person-page action also uses.
 *
 * What the page decides lives in people_sync_view.ts and is tested there. This
 * file only fetches and draws. Everything from the matcher or from COLD is put
 * on the page as text, never as markup.
 *
 * Accessibility: the status is one polite live region; the button keeps focus
 * when it cannot be pressed (aria-disabled, not disabled) and says why; the
 * result table has a caption and real header cells; every outcome is named in
 * words, not only by colour; every control is a native button or link.
 */
import { ClientAPI } from "./client_api.ts";
import {
  type ItemRow,
  type ItemView,
  itemView,
  latestSyncRequest,
  personHref,
  type RunRow,
  splitItems,
  startRequest,
  type SyncRequest,
  type SyncView,
  syncView,
} from "./people_sync_view.ts";

/** SyncClient talks to COLD's browser API and report queue. */
export class SyncClient {
  api: ClientAPI;
  constructor(baseUrl: string | URL) {
    this.api = new ClientAPI(String(baseUrl));
  }

  private url(path: string): string {
    return this.api.joinUrlPath(this.api.baseUrl, path);
  }

  private async getJSON<T>(path: string): Promise<T> {
    const resp = await fetch(this.url(path), {
      headers: { "Accept": "application/json" },
    });
    if (!resp.ok) throw new Error(`${path}: HTTP ${resp.status}`);
    return await resp.json() as T;
  }

  /** latestRun returns the latest run, of any scope, or undefined. */
  async latestRun(): Promise<RunRow | undefined> {
    const rows = await this.getJSON<RunRow[]>(
      "api/people_sync_runs.ds/people_sync_latest_run",
    );
    return Array.isArray(rows) ? rows[0] : undefined;
  }

  /** latestFullRun returns the latest run covering everyone, or undefined. */
  async latestFullRun(): Promise<RunRow | undefined> {
    const rows = await this.getJSON<RunRow[]>(
      "api/people_sync_runs.ds/people_sync_latest_full_run",
    );
    return Array.isArray(rows) ? rows[0] : undefined;
  }

  /** runItems returns a run's items, those needing a person first. */
  async runItems(runId: string): Promise<ItemRow[]> {
    const rows = await this.getJSON<ItemRow[]>(
      `api/people_sync_items.ds/people_sync_run_items/run_id?run_id=${
        encodeURIComponent(runId)
      }`,
    );
    return Array.isArray(rows) ? rows : [];
  }

  /** latestItem returns the newest item recorded for one person, or undefined. */
  async latestItem(clpid: string): Promise<ItemRow | undefined> {
    const rows = await this.getJSON<ItemRow[]>(
      `api/people_sync_items.ds/people_sync_latest_item/clpid?clpid=${
        encodeURIComponent(clpid)
      }`,
    );
    return Array.isArray(rows) ? rows[0] : undefined;
  }

  /** latestRequest returns the newest sync request in the report queue. */
  async latestRequest(): Promise<SyncRequest | undefined> {
    const rows = await this.getJSON<SyncRequest[]>(
      "api/reports.ds/report_list",
    );
    return Array.isArray(rows) ? latestSyncRequest(rows) : undefined;
  }

  /** start files a sync request: everyone, or one person. Throws with a
   * message fit to show the user when the request is refused. */
  async start(clpid?: string): Promise<void> {
    const body = startRequest(clpid);
    const resp = await fetch(this.url("reports"), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: body.toString(),
    });
    if (!resp.ok) {
      await resp.body?.cancel();
      throw new Error(`the sync request was refused (HTTP ${resp.status})`);
    }
    await resp.body?.cancel();
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = "",
  attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (text !== "") e.textContent = text;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

/** setIfChanged sets an element's text only when it differs, so a live region
 * is not re-announced by a refresh that found nothing new. */
function setIfChanged(e: HTMLElement, text: string): void {
  if (e.textContent !== text) e.textContent = text;
}

/** coldText describes what COLD holds for one person, in words. */
function coldText(c: { clpid: string; orcid: string; isni: string }): string {
  const parts = [
    c.orcid ? `ORCID ${c.orcid}` : "no ORCID",
    c.isni ? `ISNI ${c.isni}` : "no ISNI",
  ];
  return `${c.clpid}: ${parts.join(", ")}`;
}

/** rdmText describes what the RDM entries hold, in words. */
function rdmText(r: NonNullable<ItemView["rdm"]>): string[] {
  const lines = [`Entry ${r.ids.join(", ")}`];
  if (r.clpids.length) lines.push(`clpid ${r.clpids.join(", ")}`);
  if (r.orcids.length) lines.push(`ORCID ${r.orcids.join(", ")}`);
  if (r.isnis.length) lines.push(`ISNI ${r.isnis.join(", ")}`);
  return lines;
}

/** PeopleSyncUI draws the sync page into one element. */
export class PeopleSyncUI {
  client: SyncClient;
  mount: HTMLElement;
  peopleBase: string;
  status!: HTMLElement;
  facts!: HTMLElement;
  button!: HTMLButtonElement;
  reason!: HTMLElement;
  results!: HTMLElement;
  view: SyncView | undefined;
  timer: number | undefined;
  lastFinished = "";

  constructor(
    options: {
      mountElement: HTMLElement;
      baseUrl: string | URL;
      peopleBase?: string;
    },
  ) {
    this.mount = options.mountElement;
    this.client = new SyncClient(options.baseUrl);
    this.peopleBase = options.peopleBase ?? "./people/";
    this.build();
    this.refresh();
  }

  private build(): void {
    this.mount.replaceChildren();
    const status = el("section", "", { "aria-labelledby": "ps-status-h" });
    status.append(el("h2", "Status", { id: "ps-status-h" }));
    this.status = el("p", "Loading the latest sync…", {
      role: "status",
      "aria-live": "polite",
      id: "ps-status",
    });
    this.facts = el("dl", "", { id: "ps-facts" });
    this.button = el("button", "Sync all people now", {
      type: "button",
      "aria-describedby": "ps-reason",
      id: "ps-start",
    });
    this.reason = el("p", "", { id: "ps-reason" });
    this.button.addEventListener("click", () => {
      if (this.button.getAttribute("aria-disabled") === "true") return;
      this.start();
    });
    status.append(this.status, this.facts, this.button, this.reason);
    this.results = el("section", "", { "aria-labelledby": "ps-items-h" });
    this.mount.append(status, this.results);
  }

  /** refresh reads the request queue and the latest runs and redraws. */
  async refresh(): Promise<void> {
    let request, latest, full;
    try {
      [request, latest, full] = await Promise.all([
        this.client.latestRequest(),
        this.client.latestRun(),
        this.client.latestFullRun(),
      ]);
    } catch (err) {
      setIfChanged(
        this.status,
        `The sync status could not be read: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
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
  private poll(view: SyncView): void {
    const active = view.state === "pending" || view.state === "running";
    if (active && this.timer === undefined) {
      this.timer = setInterval(() => this.refresh(), 5000) as unknown as number;
    }
    if (!active && this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private setButton(view: SyncView): void {
    this.button.setAttribute("aria-disabled", String(!view.canStart));
    setIfChanged(
      this.reason,
      view.canStart
        ? "Starts a sync of every person. It is queued, and its result appears here."
        : "A sync is already waiting or running, so another cannot be started.",
    );
  }

  private drawFacts(latest?: RunRow, full?: RunRow): void {
    this.facts.replaceChildren();
    const add = (k: string, v: string) => {
      this.facts.append(el("dt", k), el("dd", v));
    };
    if (!latest) {
      add("Target", "no run recorded yet");
      return;
    }
    add(
      "Target of the latest run",
      `${latest.rdm_url} (new runs use the target set in this COLD server's configuration)`,
    );
    add(
      "Mode",
      latest.mode === "dry-run"
        ? "Dry run: RDM was read and not changed"
        : "Apply: safe changes were written to RDM",
    );
    add(
      "Latest run",
      `${
        latest.scope === "all" ? "everyone" : latest.scope
      }, started ${latest.started}, ${
        latest.finished ? `finished ${latest.finished}` : "not finished"
      }, started by ${latest.trigger || "unknown"}`,
    );
    if (full && full.run_id !== latest.run_id) {
      add("Last full sync", `started ${full.started}, ${full.state}`);
    }
    const c = latest.counts ?? {};
    const n = (k: string) => (typeof c[k] === "number" ? c[k] as number : 0);
    add(
      "Counts",
      `${n("people")} people examined; ${n("needs_human")} need a person, ${
        n("needs_repair")
      } need repair in RDM, ${n("warning")} warnings, ${
        n("applied")
      } changes, ${n("info")} with nothing to do`,
    );
    if (latest.program_hash) {
      add(
        "Program",
        `irdmtools ${latest.irdmtools_version || "(version unknown)"}, files ${
          latest.program_hash.slice(0, 12)
        }`,
      );
    }
  }

  private async drawItems(latest?: RunRow, full?: RunRow): Promise<void> {
    const shown = full ?? latest;
    if (!shown) {
      this.results.replaceChildren();
      return;
    }
    // Only redraw the table when the run it shows has changed.
    if (this.results.dataset.run === shown.run_id + shown.finished) return;
    let items: ItemRow[];
    try {
      items = await this.client.runItems(shown.run_id);
    } catch (err) {
      this.results.replaceChildren(
        el(
          "p",
          `The items could not be read: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ),
      );
      return;
    }
    this.results.dataset.run = shown.run_id + shown.finished;
    const { action, candidates } = splitItems(items);
    const h = el("h2", "Items from the last full sync", { id: "ps-items-h" });
    const lead = el(
      "p",
      items.length === 0
        ? "This run has nothing to list."
        : action.length === 0
        ? `The run started ${shown.started} has nothing to act on.`
        : `${action.length} items from the run started ${shown.started}. ` +
          "Items that need a person come first. To correct one, follow the link to the " +
          "person in COLD, fix it there, then use Rerun for that person.",
    );
    this.results.replaceChildren(h, lead);
    this.drawTables(action, candidates, shown);
    if (latest && full && latest.run_id !== full.run_id) {
      await this.drawScoped(latest);
    }
  }

  private async drawScoped(run: RunRow): Promise<void> {
    const items = await this.client.runItems(run.run_id).catch(() => []);
    const h = el(
      "h2",
      `Latest one-person run: ${run.scope.replace(/^clpid:/, "")}`,
    );
    this.results.append(h);
    if (items.length === 0) {
      this.results.append(
        el("p", `Started ${run.started}: nothing to list for this person.`),
      );
      return;
    }
    const { action, candidates } = splitItems(items);
    this.drawTables(action, candidates, run);
  }

  /** drawTables adds the table of items to act on, then, apart from it under
   * its own heading, the table of possible alternate names. */
  private drawTables(
    action: ItemRow[],
    candidates: ItemRow[],
    run: RunRow,
  ): void {
    if (action.length > 0) this.results.append(this.table(action, run));
    if (candidates.length === 0) return;
    this.results.append(
      el("h3", `Possible alternate names (${candidates.length})`),
      el(
        "p",
        "RDM holds these name forms for the person and COLD does not. They are suggestions, " +
          "not problems; nothing was changed.",
      ),
      this.table(candidates, run, "Possible alternate names"),
    );
  }

  private table(
    items: ItemRow[],
    run: RunRow,
    kind = "Items",
  ): HTMLElement {
    const wrap = el("div", "", {
      role: "region",
      "aria-label": `${kind} from the run started ${run.started}`,
      tabindex: "0",
      class: "ps-scroll",
    });
    const t = el("table", "", { class: "ps-items" });
    t.append(
      el(
        "caption",
        kind === "Items"
          ? `Sync items, run started ${run.started}`
          : `${kind}, run started ${run.started}`,
      ),
    );
    const head = el("tr");
    for (
      const h of [
        "Person",
        "Outcome",
        "What was found",
        "In COLD",
        "In RDM",
        "What to do",
      ]
    ) head.append(el("th", h, { scope: "col" }));
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

  private row(v: ItemView): HTMLElement {
    const tr = el("tr");
    const who = el("th", "", { scope: "row" });
    if (v.people.length === 0) {
      who.textContent = v.clpid
        ? `${v.clpid} (no COLD person)`
        : "(no COLD person)";
    }
    v.people.forEach((p, i) => {
      if (i > 0) who.append(", ");
      who.append(el("a", p.clpid, { href: p.href }));
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
      // The entry ids link to the entry in RDM; the other lines are text.
      rdm.append("Entry ");
      v.rdm.ids.forEach((id, i) => {
        if (i > 0) rdm.append(", ");
        const link = v.rdmLinks.find((l) => l.id === id);
        rdm.append(
          link
            ? el("a", id, {
              href: link.href,
              "aria-label": link.label,
              title: link.title,
            })
            : id,
        );
      });
      for (const line of rdmText(v.rdm).slice(1)) {
        rdm.append(el("br"), line);
      }
    }
    const todo = el("td", v.fixNote);
    for (const clpid of v.rerun) {
      const b = el("button", `Rerun for ${clpid}`, { type: "button" });
      b.addEventListener("click", () => {
        if (this.button.getAttribute("aria-disabled") === "true") {
          this.status.textContent =
            "A sync is already waiting or running, so another cannot be started.";
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
  async start(clpid?: string): Promise<void> {
    this.button.setAttribute("aria-disabled", "true");
    this.status.textContent = clpid
      ? `Requesting a sync for ${clpid}…`
      : "Requesting a sync of everyone…";
    try {
      await this.client.start(clpid);
    } catch (err) {
      this.status.textContent = err instanceof Error
        ? err.message
        : String(err);
      this.button.setAttribute("aria-disabled", "false");
      return;
    }
    // The runner picks requests up on a ten second timer: poll until it is done.
    this.status.textContent = "Sync requested. It waits for the report runner.";
    this.view = {
      ...(this.view as SyncView),
      state: "pending",
      canStart: false,
    };
    this.poll(this.view);
    setTimeout(() => this.refresh(), 1500);
  }
}

export { personHref };
