import { assertEquals } from "@std/assert";
import { filterActiveAlerts, ReportListItem } from "./cold_alerts.ts";

const sample: ReportListItem[] = [
  {
    id: "1",
    report_name: "alert_rdm_harvest_stale",
    status: "completed",
    link: "rpt/alert_rdm_harvest_stale.txt",
    updated: "2026-09-28T10:00:00Z",
  },
  {
    id: "2",
    report_name: "alert_caltechthesis_harvest_stale",
    status: "requested",
    link: "",
    updated: "2026-09-28T10:00:00Z",
  },
  {
    id: "3",
    report_name: "alert_caltechthesis_harvest_stale",
    status: "error",
    link: "error://something went wrong",
    updated: "2026-09-28T10:00:00Z",
  },
  {
    id: "4",
    report_name: "run_people_csv",
    status: "completed",
    link: "rpt/people.csv",
    updated: "2026-09-28T10:00:00Z",
  },
];

Deno.test("filterActiveAlerts keeps only completed alert_* reports", () => {
  const active = filterActiveAlerts(sample);
  assertEquals(active.length, 1);
  assertEquals(active[0].id, "1");
});

Deno.test("filterActiveAlerts returns empty for no matches", () => {
  assertEquals(filterActiveAlerts([]), []);
  assertEquals(
    filterActiveAlerts([
      {
        id: "5",
        report_name: "run_groups_csv",
        status: "completed",
        link: "rpt/groups.csv",
        updated: "2026-09-28T10:00:00Z",
      },
    ]),
    [],
  );
});
