/**
 * generate_country_collaboration_rpt_test.ts
 *
 * Unit tests for buildBatchQueryUrl() run without any network access.
 *
 * Run:
 *   deno test generate_country_collaboration_rpt_test.ts
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildBatchQueryUrl } from "./generate_country_collaboration_rpt.ts";

Deno.test("buildBatchQueryUrl matches creators, contributors and funders for one ROR id", () => {
    const q = new URL(buildBatchQueryUrl(["05dxps055"])).searchParams.get("q") ??
        "";
    assertStringIncludes(q, "metadata.creators.affiliations.id:05dxps055");
    assertStringIncludes(q, "metadata.contributors.affiliations.id:05dxps055");
    assertStringIncludes(q, "metadata.funding.funder.id:05dxps055");
});

Deno.test("buildBatchQueryUrl ORs a batch of ROR ids together", () => {
    const q = new URL(buildBatchQueryUrl(["05dxps055", "01an7q238"]))
        .searchParams.get("q") ?? "";
    assertStringIncludes(q, "05dxps055");
    assertStringIncludes(q, "01an7q238");
    assertStringIncludes(q, " OR ");
});

Deno.test("buildBatchQueryUrl requests a full page of results", () => {
    const url = new URL(buildBatchQueryUrl(["05dxps055"]));
    assertEquals(url.searchParams.get("size"), "1000");
});

Deno.test("buildBatchQueryUrl does not send the undocumented all=1 parameter (DR-0007)", () => {
    // Verified live 2026-08-25 on this exact query shape: 61,739 records with
    // and without the parameter, identical ids. `all` is unrecognised and
    // silently ignored. Removing it is a no-op at runtime, so this assertion is
    // the only durable evidence it stayed gone.
    const url = new URL(buildBatchQueryUrl(["05dxps055"]));
    assertEquals(url.searchParams.get("all"), null);
});
