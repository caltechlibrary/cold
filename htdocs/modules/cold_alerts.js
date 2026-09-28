// cold_alerts.ts
function filterActiveAlerts(reports) {
  return reports.filter((r) => typeof r.report_name === "string" && r.report_name.startsWith("alert_") && r.status === "completed");
}
var DISMISSED_KEY = "cold_alerts_dismissed";
function readDismissed() {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function rememberDismissed(reportName) {
  try {
    const dismissed = readDismissed();
    dismissed.add(reportName);
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([
      ...dismissed
    ]));
  } catch {
  }
}
var ColdAlertsUI = class {
  mountElement;
  constructor(options) {
    this.mountElement = options.mountElement;
    this.init();
  }
  async init() {
    let reports;
    try {
      const resp = await fetch("/api/reports.ds/report_list");
      reports = await resp.json();
    } catch (err) {
      console.log("ERROR: failed to fetch report_list for alerts", err);
      return;
    }
    const dismissed = readDismissed();
    const active = filterActiveAlerts(reports).filter((r) => !dismissed.has(r.report_name));
    if (active.length === 0) {
      return;
    }
    this.render(active);
  }
  render(active) {
    const summary = document.createElement("button");
    summary.type = "button";
    summary.className = "cold-alerts-summary";
    summary.setAttribute("aria-expanded", "false");
    summary.textContent = active.length === 1 ? "1 alert active \u2014 click for details" : `${active.length} alerts active \u2014 click for details`;
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
      since.textContent = ` \u2014 firing since ${r.updated}`;
      const dismissBtn = document.createElement("button");
      dismissBtn.type = "button";
      dismissBtn.textContent = "Dismiss";
      dismissBtn.setAttribute("aria-label", `Dismiss alert ${r.report_name}`);
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
    this.mountElement.appendChild(summary);
    this.mountElement.appendChild(details);
  }
};
export {
  ColdAlertsUI,
  filterActiveAlerts
};
