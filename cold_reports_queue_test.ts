/**
 * cold_reports_queue_test.ts
 *
 * Tests for the report queue's `next_request` query in cold_api.yaml, run against a real
 * scratch `datasetd`. The runner reads a queued request through this query, so every
 * field the runner uses has to come back from it. `trigger` did not: a request filed
 * by the page's button (`trigger=human`) was stored with it, but the runner saw none and
 * recorded the run's trigger as "unknown".
 *
 * Run:
 *   deno test --allow-read --allow-write --allow-run --allow-net --allow-env cold_reports_queue_test.ts
 */
import { assertEquals } from "@std/assert";
import { REPORTS, startServer } from "./people_sync_testing.ts";

/** A request as ReportRequest.asObject() stores it. */
function request(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    report_name: "run_people_sync",
    options: {},
    inputs: [],
    emails: "",
    requested: "2026-11-12T18:28:36.788Z",
    updated: "2026-11-12T18:28:36.788Z",
    expire: "1",
    status: "requested",
    link: "",
    trigger: "human",
    ...over,
  };
}

Deno.test("next_request: a queued request comes back with the trigger it was filed with", async () => {
  const { api, stop } = await startServer([REPORTS]);
  try {
    await api.create(REPORTS, "r-human", request("r-human"));
    const got = await api.query(REPORTS, "next_request");
    assertEquals(got.length, 1);
    assertEquals(got[0].trigger, "human");
  } finally {
    await stop();
  }
});

Deno.test("next_request: cron's bare POST keeps its trigger, and a request stored before triggers existed has none", async () => {
  const { api, stop } = await startServer([REPORTS]);
  try {
    await api.create(REPORTS, "r-cron", request("r-cron", { trigger: "cron" }));
    const { trigger: _t, ...old } = request("r-old", {
      updated: "2026-11-12T18:30:00.000Z",
    });
    await api.create(REPORTS, "r-old", old);
    const got = await api.query(REPORTS, "next_request");
    assertEquals(got.map((r) => [r.id, r.trigger ?? null]), [
      ["r-cron", "cron"],
      ["r-old", null],
    ]);
  } finally {
    await stop();
  }
});

Deno.test("next_request: it still returns every field the runner reads", async () => {
  const { api, stop } = await startServer([REPORTS]);
  try {
    await api.create(
      REPORTS,
      "r-full",
      request("r-full", {
        emails: "a@example.test",
        inputs: [{ id: "clpid", value: "Doe-J" }],
      }),
    );
    const [r] = await api.query(REPORTS, "next_request");
    for (
      const k of [
        "id",
        "report_name",
        "emails",
        "status",
        "inputs",
        "requested",
        "updated",
        "link",
        "trigger",
      ]
    ) {
      assertEquals(Object.hasOwn(r, k), true, `missing ${k}`);
    }
    assertEquals(r.emails, "a@example.test");
    assertEquals(r.inputs, [{ id: "clpid", value: "Doe-J" }]);
  } finally {
    await stop();
  }
});

Deno.test("next_request: only requests still waiting are returned, oldest first", async () => {
  const { api, stop } = await startServer([REPORTS]);
  try {
    await api.create(
      REPORTS,
      "a",
      request("a", { updated: "2026-11-12T18:00:02.000Z" }),
    );
    await api.create(
      REPORTS,
      "b",
      request("b", { updated: "2026-11-12T18:00:01.000Z" }),
    );
    await api.create(REPORTS, "c", request("c", { status: "completed" }));
    const got = await api.query(REPORTS, "next_request");
    assertEquals(got.map((r) => r.id), ["b", "a"]);
  } finally {
    await stop();
  }
});
