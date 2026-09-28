/**
 * cold_alerts.ts implements the browser-side dashboard element for the
 * alerting facility (cold DR-0028). One fetch of the reports API on
 * DOMContentLoaded, filtered client-side for completed alert_* reports --
 * no polling, since idle tabs left open on the dashboard must not
 * generate traffic.
 */

export interface ReportListItem {
  id: string;
  report_name: string;
  status: string;
  link: string;
  updated: string;
}

/**
 * filterActiveAlerts keeps only completed alert_* reports -- an alert
 * that errored or is still processing is not "firing" from a librarian's
 * point of view.
 */
export function filterActiveAlerts(
  reports: ReportListItem[],
): ReportListItem[] {
  return reports.filter((r) =>
    typeof r.report_name === "string" &&
    r.report_name.startsWith("alert_") &&
    r.status === "completed"
  );
}

const DISMISSED_KEY = "cold_alerts_dismissed";

function readDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    // sessionStorage unavailable (e.g. private browsing) -- dismissal
    // just will not persist this session, which is a safe failure mode.
    return new Set();
  }
}

function rememberDismissed(reportName: string): void {
  try {
    const dismissed = readDismissed();
    dismissed.add(reportName);
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
  } catch {
    // Same fallback as readDismissed -- nothing to do if storage is unavailable.
  }
}

export class ColdAlertsUI {
  mountElement: HTMLElement;

  constructor(options: { mountElement: HTMLElement }) {
    this.mountElement = options.mountElement;
    this.init();
  }

  async init(): Promise<void> {
    let reports: ReportListItem[];
    try {
      const resp = await fetch("/api/reports.ds/report_list");
      reports = await resp.json();
    } catch (err) {
      console.log("ERROR: failed to fetch report_list for alerts", err);
      return;
    }
    const dismissed = readDismissed();
    const active = filterActiveAlerts(reports).filter((r) =>
      !dismissed.has(r.report_name)
    );
    if (active.length === 0) {
      return;
    }
    this.render(active);
  }

  render(active: ReportListItem[]): void {
    // The container ships empty in the page's own markup with
    // role="status" aria-live="polite" already set -- content is added
    // here, after the live region is already registered, never at the
    // same moment it is created.
    const summary = document.createElement("button");
    summary.type = "button";
    summary.className = "cold-alerts-summary";
    summary.setAttribute("aria-expanded", "false");
    summary.textContent = active.length === 1
      ? "1 alert active — click for details"
      : `${active.length} alerts active — click for details`;

    const details = document.createElement("div");
    details.className = "cold-alerts-details";
    details.hidden = true;

    for (const r of active) {
      const item = document.createElement("div");
      item.className = "cold-alerts-item";

      const link = document.createElement("a");
      link.href = r.link;
      link.target = "_blank";
      link.textContent = r.report_name;

      const since = document.createElement("span");
      since.textContent = ` — firing since ${r.updated}`;

      const dismissBtn = document.createElement("button");
      dismissBtn.type = "button";
      dismissBtn.textContent = "Dismiss";
      dismissBtn.setAttribute(
        "aria-label",
        `Dismiss alert ${r.report_name}`,
      );
      dismissBtn.addEventListener("click", () => {
        rememberDismissed(r.report_name);
        item.remove();
        if (details.childElementCount === 0) {
          summary.remove();
          details.remove();
        }
      });

      item.appendChild(link);
      item.appendChild(since);
      item.appendChild(dismissBtn);
      details.appendChild(item);
    }

    summary.addEventListener("click", () => {
      const expanded = summary.getAttribute("aria-expanded") === "true";
      summary.setAttribute("aria-expanded", expanded ? "false" : "true");
      details.hidden = expanded;
    });

    // Deliberately not calling .focus() anywhere -- mounting must not
    // steal focus from wherever the page already put it.
    this.mountElement.appendChild(summary);
    this.mountElement.appendChild(details);
  }
}
