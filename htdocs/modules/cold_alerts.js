// cold_alerts.ts
function filterActiveAlerts(reports) {
  return reports.filter((r) => typeof r.report_name === "string" && r.report_name.startsWith("alert_") && r.status === "completed");
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
    const active = filterActiveAlerts(reports);
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
      item.appendChild(link);
      item.appendChild(since);
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
