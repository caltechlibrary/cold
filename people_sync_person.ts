/**
 * people_sync_person.ts is the person page's sync action (cold#122, DR-0032,
 * plan Phase 5): a button that files a one-person sync for the person being
 * viewed, and that person's latest recorded outcome. Browser code; the logic is
 * in people_sync_view.ts and the shared client in people_sync_page.ts.
 *
 * A person with nothing to report has no item row, so "no outcome recorded"
 * is a normal answer, not an error.
 */
import { SyncClient } from "./people_sync_page.ts";
import { itemView, syncView } from "./people_sync_view.ts";

/** PeopleSyncPersonUI fills one element with the sync action for one person. */
export class PeopleSyncPersonUI {
  client: SyncClient;
  clpid: string;
  mount: HTMLElement;
  button: HTMLButtonElement;
  status: HTMLElement;
  outcome: HTMLElement;
  timer: number | undefined;

  constructor(
    options: {
      mountElement: HTMLElement;
      baseUrl: string | URL;
      clpid: string;
    },
  ) {
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
  async refresh(): Promise<void> {
    try {
      const [request, run, item] = await Promise.all([
        this.client.latestRequest(),
        this.client.latestRun(),
        this.client.latestItem(this.clpid),
      ]);
      const view = syncView(request, run);
      const busy = view.state === "pending" || view.state === "running";
      this.button.setAttribute("aria-disabled", String(busy));
      // A failure is shown too: a quiet failure is the one nobody notices.
      const text = busy || view.state === "error" || view.state === "stalled"
        ? view.headline
        : "";
      if (this.status.textContent !== text) this.status.textContent = text;
      const line = item === undefined
        ? "No sync outcome is recorded for this person (a person with nothing to report has none)."
        : (() => {
          const v = itemView(item, "./");
          return `Latest outcome (${item.recorded}): ${v.outcomeLabel}${
            v.statusLabel ? `, ${v.statusLabel}` : ""
          }. ${v.message}`;
        })();
      if (this.outcome.textContent !== line) this.outcome.textContent = line;
      if (busy && this.timer === undefined) {
        this.timer = setInterval(
          () => this.refresh(),
          5000,
        ) as unknown as number;
      }
      if (!busy && this.timer !== undefined) {
        clearInterval(this.timer);
        this.timer = undefined;
      }
    } catch (err) {
      this.status.textContent = `The sync status could not be read: ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  }

  /** start files the one-person sync. */
  async start(): Promise<void> {
    this.button.setAttribute("aria-disabled", "true");
    this.status.textContent = `Requesting a sync for ${this.clpid}…`;
    try {
      await this.client.start(this.clpid);
    } catch (err) {
      this.status.textContent = err instanceof Error
        ? err.message
        : String(err);
      this.button.setAttribute("aria-disabled", "false");
      return;
    }
    this.status.textContent = "Sync requested. It waits for the report runner.";
    setTimeout(() => this.refresh(), 1500);
    if (this.timer === undefined) {
      this.timer = setInterval(() => this.refresh(), 5000) as unknown as number;
    }
  }
}

const mount = typeof document !== "undefined"
  ? document.getElementById("people-sync-person")
  : null;
if (mount && mount.dataset.clpid) {
  window.addEventListener("DOMContentLoaded", () => {
    new PeopleSyncPersonUI({
      mountElement: mount,
      baseUrl: "../",
      clpid: mount.dataset.clpid as string,
    });
  });
}
