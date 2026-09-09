/**
 * generate_collaborator_rpt_test.ts
 *
 * Unit tests for buildRecordsQueryUrl() run without any network access.
 *
 * Run:
 *   deno test generate_collaborator_rpt_test.ts
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildRecordsQueryUrl } from "./generate_collaborator_rpt.ts";

Deno.test("buildRecordsQueryUrl includes the clpid identifier filter", () => {
  const url = buildRecordsQueryUrl("Doiel-R-S", "2021-08-12");
  const q = new URL(url).searchParams.get("q") ?? "";
  assertStringIncludes(
    q,
    'metadata.creators.person_or_org.identifiers.identifier:"Doiel-R-S"',
  );
});

Deno.test("buildRecordsQueryUrl restricts results to the last 48 months (issue #106)", () => {
  const url = buildRecordsQueryUrl("Doiel-R-S", "2021-08-12");
  const q = new URL(url).searchParams.get("q") ?? "";
  assertStringIncludes(
    q,
    "metadata.publication_date:[2021-08-12 TO *]",
  );
});

Deno.test("buildRecordsQueryUrl combines both filters with AND", () => {
  const url = buildRecordsQueryUrl("Doiel-R-S", "2021-08-12");
  const q = new URL(url).searchParams.get("q");
  assertStringIncludes(q ?? "", " AND ");
});

Deno.test("buildRecordsQueryUrl does not send the undocumented all=1 parameter (DR-0007)", () => {
  // Verified live 2026-08-25: `all` is unrecognised and silently ignored, and
  // behaves identically to an invented parameter. Removing it is a no-op at
  // runtime, so this assertion is the only durable evidence it stayed gone.
  const url = buildRecordsQueryUrl("Doiel-R-S", "2021-08-12");
  assertEquals(new URL(url).searchParams.get("all"), null);
});
