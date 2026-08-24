/**
 * publications_by_person_identifiers_test.ts
 *
 * Unit tests for buildRecordsQueryUrl() run without any network access.
 *
 * Run:
 *   deno test publications_by_person_identifiers_test.ts
 */

import { assertStringIncludes, assertThrows } from "@std/assert";
import { buildRecordsQueryUrl } from "./publications_by_person_identifiers.ts";

Deno.test("buildRecordsQueryUrl includes the clpid identifier filter", () => {
    const url = buildRecordsQueryUrl("Doiel-R-S", "");
    const q = new URL(url).searchParams.get("q") ?? "";
    assertStringIncludes(
        q,
        'metadata.creators.person_or_org.identifiers.identifier:"Doiel-R-S"',
    );
});

Deno.test("buildRecordsQueryUrl includes the orcid identifier filter, escaping hyphens", () => {
    const url = buildRecordsQueryUrl("", "0000-0001-2345-6789");
    const q = new URL(url).searchParams.get("q") ?? "";
    assertStringIncludes(
        q,
        'metadata.creators.person_or_org.identifiers.identifier:"0000\\-0001\\-2345\\-6789"',
    );
});

Deno.test("buildRecordsQueryUrl combines clpid and orcid with OR", () => {
    const url = buildRecordsQueryUrl("Doiel-R-S", "0000-0001-2345-6789");
    const q = new URL(url).searchParams.get("q") ?? "";
    assertStringIncludes(q, " OR ");
});

Deno.test("buildRecordsQueryUrl requests a page size of 1000 per request (pagination handles the rest)", () => {
    const url = buildRecordsQueryUrl("Doiel-R-S", "");
    assertStringIncludes(url, "size=1000");
});

Deno.test("buildRecordsQueryUrl throws if neither clpid nor orcid is provided", () => {
    assertThrows(() => buildRecordsQueryUrl("", ""));
});
