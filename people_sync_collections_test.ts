/**
 * people_sync_collections_test.ts tests the two COLD collections behind the
 * COLD/RDM people sync (cold#122, DR-0032, plan Phase 3): `people_sync_runs.ds`
 * and `people_sync_items.ds`, and their named queries in cold_api.yaml.
 *
 * The test starts its OWN `datasetd` on a free port, in a scratch directory,
 * with fresh collections and a copy of cold_api.yaml cut down to the collections
 * under test. It never touches a running COLD, so it needs nothing started
 * first. It does need `dataset` and `datasetd` on the PATH, as COLD itself does.
 */
import { assert, assertEquals } from "@std/assert";
import {
  Api,
  ITEMS,
  PEOPLE,
  RUNS,
  startServer,
} from "./people_sync_testing.ts";

/** runRow builds a run row as the COLD-side wrapper will write it.
 *
 * @param id {string} run id, also the object key
 * @param scope {string} "all" or "clpid:<id>"
 * @param started {string} start time, "YYYY-MM-DD HH:MM:SS"
 * @returns {Record<string, unknown>} the run row
 * @example
 * const row = runRow("r1", "all", "2026-11-10 09:00:00");
 */
function runRow(id: string, scope: string, started: string) {
  return {
    run_id: id,
    request_id: `req-${id}`,
    trigger: "human",
    scope,
    rdm_url: "https://authors.example.test",
    state: "completed",
    started,
    finished: started,
    counts: { applied: 1, needs_human: 1, info: 5000 },
  };
}

/** itemRow builds an item row as the wrapper will write it.
 *
 * @param run_id {string} the run the item belongs to
 * @param clpid {string} the person
 * @param outcome {string} applied, needs_human or warning
 * @param recorded {string} when the item was recorded
 * @returns {Record<string, unknown>} the item row
 * @example
 * const row = itemRow("r1", "Doe-Jane", "needs_human", "2026-11-10 09:00:01");
 */
function itemRow(
  run_id: string,
  clpid: string,
  outcome: string,
  recorded: string,
) {
  return {
    run_id,
    clpid,
    rdm_id: `rdm-${clpid}`,
    action: "update",
    outcome,
    message: `${outcome} for ${clpid}`,
    before: {},
    after: {},
    recorded,
  };
}

Deno.test("people sync collections and named queries", async (t) => {
  const { api, stop } = await startServer();
  try {
    await t.step("a run row and its items round-trip", async () => {
      await api.create(RUNS, "r1", runRow("r1", "all", "2026-11-10 09:00:00"));
      await api.create(
        ITEMS,
        "r1-00001",
        itemRow("r1", "Doe-Jane", "applied", "2026-11-10 09:00:01"),
      );
      const run = await api.read(RUNS, "r1");
      assertEquals(run.scope, "all");
      assertEquals(run.counts.info, 5000);
      const item = await api.read(ITEMS, "r1-00001");
      assertEquals(item.clpid, "Doe-Jane");
    });

    await t.step(
      "latest run and latest full run differ after a one-person run",
      async () => {
        await api.create(
          RUNS,
          "r2",
          runRow("r2", "clpid:Doe-Jane", "2026-11-10 10:00:00"),
        );
        const latest = await api.query(RUNS, "people_sync_latest_run");
        assertEquals(latest.length, 1);
        assertEquals(latest[0].run_id, "r2");
        const full = await api.query(RUNS, "people_sync_latest_full_run");
        assertEquals(full.length, 1);
        assertEquals(full[0].run_id, "r1");
      },
    );

    await t.step("no runs at all gives empty lists, not an error", async () => {
      // A second, empty scratch collection is not needed: the query shape is
      // covered by a scope nothing matches.
      const rows = await api.query(ITEMS, "people_sync_run_items", {
        run_id: "no-such-run",
      });
      assertEquals(rows, []);
    });

    await t.step(
      "items for a run list needs_human and needs_repair first",
      async () => {
        await api.create(
          RUNS,
          "r3",
          runRow("r3", "all", "2026-11-10 11:00:00"),
        );
        const rows: [string, string, string][] = [
          ["r3-00001", "Applied-One", "applied"],
          ["r3-00002", "Warn-One", "warning"],
          ["r3-00003", "Repair-One", "needs_repair"],
          ["r3-00004", "Human-One", "needs_human"],
          ["r3-00005", "Human-Two", "needs_human"],
        ];
        for (const [key, clpid, outcome] of rows) {
          await api.create(
            ITEMS,
            key,
            itemRow("r3", clpid, outcome, "2026-11-10 11:00:01"),
          );
        }
        const got = await api.query(ITEMS, "people_sync_run_items", {
          run_id: "r3",
        });
        assertEquals(got.map((i) => i.outcome), [
          "needs_human",
          "needs_human",
          "needs_repair",
          "warning",
          "applied",
        ]);
        // within an outcome, by clpid, so the table is stable between reloads
        assertEquals(got.slice(0, 2).map((i) => i.clpid), [
          "Human-One",
          "Human-Two",
        ]);
        // and only this run's items
        assert(got.every((i) => i.run_id === "r3"));
      },
    );

    await t.step(
      "the per-clpid query returns the newest item, across runs",
      async () => {
        await api.create(
          ITEMS,
          "r1-00002",
          itemRow("r1", "Seen-Twice", "warning", "2026-11-10 09:00:02"),
        );
        await api.create(
          ITEMS,
          "r3-00006",
          itemRow("r3", "Seen-Twice", "needs_human", "2026-11-10 11:00:02"),
        );
        const got = await api.query(ITEMS, "people_sync_latest_item", {
          clpid: "Seen-Twice",
        });
        assertEquals(got.length, 1);
        assertEquals(got[0].run_id, "r3");
        assertEquals(got[0].outcome, "needs_human");
        const none = await api.query(ITEMS, "people_sync_latest_item", {
          clpid: "Never-Seen",
        });
        assertEquals(none, []);
      },
    );

    await t.step(
      "the per-person query finds a replace that lists the person among its persons, not only by the item's own clpid",
      async () => {
        await api.create(ITEMS, "r4-00001", {
          ...itemRow("r4", "Rdm-Old-Id", "applied", "2026-11-10 12:00:00"),
          action: "replace",
          detail: {
            replaced_by: "Rdm-Old-Id",
            persons: ["Rdm-Old-Id", "Cold-Person"],
            changes: ["name"],
          },
        });
        const byCold = await api.query(ITEMS, "people_sync_latest_item", {
          clpid: "Cold-Person",
        });
        assertEquals(byCold.length, 1);
        assertEquals(byCold[0].clpid, "Rdm-Old-Id");
        // still found by the clpid the item carries, and not by a stranger's
        const byOwn = await api.query(ITEMS, "people_sync_latest_item", {
          clpid: "Rdm-Old-Id",
        });
        assertEquals(byOwn.length, 1);
        const none = await api.query(ITEMS, "people_sync_latest_item", {
          clpid: "Someone-Else",
        });
        assertEquals(none, []);
        // the newest of the two kinds wins
        await api.create(ITEMS, "r5-00001", {
          ...itemRow("r5", "Cold-Person", "warning", "2026-11-10 13:00:00"),
        });
        const newest = await api.query(ITEMS, "people_sync_latest_item", {
          clpid: "Cold-Person",
        });
        assertEquals(newest[0].run_id, "r5");
      },
    );

    await t.step(
      "items sort by severity, then clpid, so the table is stable between reloads",
      async () => {
        await api.create(
          RUNS,
          "r6",
          runRow("r6", "all", "2026-11-11 08:00:00"),
        );
        const rows: [string, string, string][] = [
          ["r6-00001", "Warn-Zed", "warning"],
          ["r6-00002", "Applied-Two", "applied"],
          ["r6-00003", "Warn-Abe", "warning"],
          ["r6-00004", "Human-Three", "needs_human"],
        ];
        for (const [key, clpid, outcome] of rows) {
          await api.create(ITEMS, key, {
            ...itemRow("r6", clpid, outcome, "2026-11-11 08:00:01"),
            action: "conflict",
          });
        }
        const got = await api.query(ITEMS, "people_sync_run_items", {
          run_id: "r6",
        });
        assertEquals(got.map((i) => i.outcome), [
          "needs_human",
          "warning",
          "warning",
          "applied",
        ]);
        assertEquals(got.slice(1, 3).map((i) => i.clpid), [
          "Warn-Abe",
          "Warn-Zed",
        ]);
      },
    );

    await t.step(
      "the newest run that covered one person is a full run or that person's own run, never another person's",
      async () => {
        const run = (id: string, scope: string, at: string) =>
          api.create(RUNS, id, runRow(id, scope, at));
        await run("c1", "all", "2026-12-01 09:00:00");
        await run("c2", "clpid:Cover-A", "2026-12-01 10:00:00");
        const own = await api.query(RUNS, "people_sync_latest_run_for", {
          clpid: "Cover-A",
        });
        assertEquals(own.map((r) => r.run_id), ["c2"]); // their own run is newer than the full one
        await run("c3", "all", "2026-12-01 11:00:00");
        const full = await api.query(RUNS, "people_sync_latest_run_for", {
          clpid: "Cover-A",
        });
        assertEquals(full.map((r) => r.run_id), ["c3"]); // a newer full run covers everyone
        await run("c4", "clpid:Cover-B", "2026-12-01 12:00:00");
        const other = await api.query(RUNS, "people_sync_latest_run_for", {
          clpid: "Cover-A",
        });
        assertEquals(other.map((r) => r.run_id), ["c3"]); // another person's run never counts
        const b = await api.query(RUNS, "people_sync_latest_run_for", {
          clpid: "Cover-B",
        });
        assertEquals(b.map((r) => r.run_id), ["c4"]);
      },
    );

    await t.step(
      "the per-person run query matches the whole clpid, not a prefix",
      async () => {
        await api.create(
          RUNS,
          "c5",
          runRow("c5", "clpid:Cover-ABC", "2026-12-02 09:00:00"),
        );
        const got = await api.query(RUNS, "people_sync_latest_run_for", {
          clpid: "Cover-AB",
        });
        assertEquals(got.map((r) => r.run_id).includes("c5"), false);
      },
    );

    await t.step(
      "a person with a needs_human item and a warning in the same run gets the needs_human item as their latest, whichever was stored first",
      async () => {
        // The warning is stored FIRST in one case and LAST in the other, so a
        // query that left ties to scan order could not pass both.
        const at = "2026-11-11 09:00:01";
        await api.create(ITEMS, "r7-00001", {
          ...itemRow("r7", "Both-One", "warning", at),
          action: "orphan_clpid",
        });
        await api.create(ITEMS, "r7-00002", {
          ...itemRow("r7", "Both-One", "needs_human", at),
          action: "conflict",
        });
        await api.create(ITEMS, "r7-00003", {
          ...itemRow("r7", "Both-Two", "needs_human", at),
          action: "conflict",
        });
        await api.create(ITEMS, "r7-00004", {
          ...itemRow("r7", "Both-Two", "warning", at),
          action: "orphan_clpid",
        });
        for (const clpid of ["Both-One", "Both-Two"]) {
          const got = await api.query(ITEMS, "people_sync_latest_item", {
            clpid,
          });
          assertEquals(got.length, 1);
          assertEquals(got[0].outcome, "needs_human", clpid);
        }
        // newest still wins over severity: a newer warning beats an older problem
        await api.create(ITEMS, "r8-00001", {
          ...itemRow("r8", "Both-One", "warning", "2026-11-11 10:00:00"),
          action: "orphan_clpid",
        });
        const newer = await api.query(ITEMS, "people_sync_latest_item", {
          clpid: "Both-One",
        });
        assertEquals(newer[0].run_id, "r8");
      },
    );

    await t.step(
      "a run over many no-ORCID people stores counts but no rows for them",
      async () => {
        // The wrapper's rule (plan Phase 3): only applied, needs_human,
        // needs_repair and warning get item rows. The run row carries the rest
        // as counts, and the page reads the count.
        const run = await api.read(RUNS, "r1");
        assertEquals(run.counts.info, 5000);
        const items = await api.query(ITEMS, "people_sync_run_items", {
          run_id: "r1",
        });
        assertEquals(
          items.filter((i) => i.outcome === "info").length,
          0,
        );
      },
    );

    await t.step(
      "the people export carries identity fields only",
      async () => {
        await api.create(PEOPLE, "Doe-Jane", {
          clpid: "Doe-Jane",
          family_name: "Doe",
          given_name: "Jane",
          orcid: "0000-0002-1825-0097",
          isni: "",
          thesis_id: "Doe-Jane",
          authors_id: "",
          advisors_id: "",
          ror: "https://ror.org/05dxps055",
          alt_name: [{ family_name: "Doe", given_name: "J." }], // stays in COLD
          email: "jane@example.test",
          bio: "must not leave COLD",
          internal_notes: "must not leave COLD",
        });
        await api.create(PEOPLE, "Roe-Rich", {
          clpid: "Roe-Rich",
          family_name: "Roe",
          given_name: "Rich",
          orcid: "",
          isni: "",
          thesis_id: "",
          authors_id: "",
          advisors_id: "",
          caltech: true,
          jpl: false,
        });
        const got = await api.query(PEOPLE, "people_sync_export");
        assertEquals(got.length, 2);
        const jane = got.find((p) => p.clpid === "Doe-Jane");
        assertEquals(jane.orcid, "0000-0002-1825-0097");
        assertEquals(Object.keys(jane).sort(), [
          "advisors_id",
          "authors_id",
          "caltech",
          "clpid",
          "family_name",
          "given_name",
          "isni",
          "jpl",
          "orcid",
          "ror",
          "thesis_id",
        ]);
        // the ROR is exported as COLD holds it, and drives the person's
        // affiliations (cold DR-0040); a person without one exports ""
        assertEquals(jane.ror, "https://ror.org/05dxps055");
        // the affiliation flags are exported (cold DR-0037); absent means false
        assertEquals(Boolean(jane.caltech), false);
        assertEquals(Boolean(jane.jpl), false);
        // alternate names are out of scope (cold DR-0036): never exported
        const roe = got.find((p) => p.clpid === "Roe-Rich");
        assert(!("alt_name" in roe));
        assertEquals(Boolean(roe.caltech), true);
        assertEquals(Boolean(roe.jpl), false);
        assertEquals(roe.ror, "");
      },
    );
  } finally {
    await stop();
  }
});
