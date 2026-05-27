/**
 * generate_collaborator_affiliations_rpt_test.ts
 *
 * Unit tests for extractCountry() run without any network access.
 * Integration tests for lookupRorCountry() auto-skip when datasetd is not
 * running on the configured port (8112).
 *
 * Run unit tests only:
 *   deno test generate_collaborator_affiliations_rpt_test.ts
 *
 * Run all tests (including integration, requires datasetd + ror.ds data):
 *   deno test --allow-net generate_collaborator_affiliations_rpt_test.ts
 */

import { assertEquals } from "@std/assert";
import {
  extractCountry,
  lookupRorCountry,
} from "./generate_collaborator_affiliations_rpt.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// ROR v2 record — locations[].geonames_details (current format as of ROR v2)
const rorV2US = {
  id: "https://ror.org/05dxps055",
  locations: [{
    geonames_id: 5326473,
    geonames_details: {
      country_code: "US",
      country_name: "United States",
      name: "Pasadena",
    },
  }],
};

const rorV2Germany = {
  id: "https://ror.org/03sry2h30",
  locations: [{
    geonames_id: 2921044,
    geonames_details: {
      country_code: "DE",
      country_name: "Germany",
      name: "Germany",
    },
  }],
};

// ROR v1 record — country.country_name
const rorV1CountryName = {
  id: "https://ror.org/05dxps055",
  country: { country_name: "United States", country_code: "US" },
};

// ROR v1 record — country.name (as seen in quick-test sample data)
const rorV1Name = {
  id: "https://ror.org/03sry2h30",
  country: { name: "Germany", code: "DE" },
};

// Pre-v1 record — addresses[].country_name
const rorAddressFallback = {
  id: "https://ror.org/00000000",
  addresses: [{ country_name: "Japan", country_code: "JP" }],
};

// ---------------------------------------------------------------------------
// Unit tests — extractCountry (no network required)
// ---------------------------------------------------------------------------

Deno.test("extractCountry - ROR v2 geonames_details.country_name", () => {
  assertEquals(extractCountry(rorV2US), "United States");
});

Deno.test("extractCountry - ROR v2 Germany", () => {
  assertEquals(extractCountry(rorV2Germany), "Germany");
});

Deno.test("extractCountry - ROR v1 country.country_name", () => {
  assertEquals(extractCountry(rorV1CountryName), "United States");
});

Deno.test("extractCountry - ROR v1 country.name", () => {
  assertEquals(extractCountry(rorV1Name), "Germany");
});

Deno.test("extractCountry - addresses fallback country_name", () => {
  assertEquals(extractCountry(rorAddressFallback), "Japan");
});

Deno.test("extractCountry - empty object returns empty string", () => {
  assertEquals(extractCountry({}), "");
});

Deno.test("extractCountry - empty locations array returns empty string", () => {
  assertEquals(extractCountry({ locations: [] }), "");
});

Deno.test("extractCountry - null country field returns empty string", () => {
  assertEquals(extractCountry({ country: null }), "");
});

Deno.test("extractCountry - ROR v2 with geonames_details.country fallback", () => {
  const rec = {
    locations: [{ geonames_details: { country: "France" } }],
  };
  assertEquals(extractCountry(rec), "France");
});

Deno.test("extractCountry - location with country_code only falls back to code", () => {
  const rec = { locations: [{ country_code: "AU" }] };
  assertEquals(extractCountry(rec), "AU");
});

// ---------------------------------------------------------------------------
// Integration tests — lookupRorCountry (require datasetd on port 8112)
// ---------------------------------------------------------------------------

async function isDatasetdAvailable(): Promise<boolean> {
  try {
    const resp = await fetch("http://localhost:8112/api/ror.ds/keys");
    resp.body?.cancel();
    return resp.ok;
  } catch {
    return false;
  }
}

Deno.test("lookupRorCountry - Caltech (05dxps055)", async () => {
  if (!await isDatasetdAvailable()) {
    console.log("  skipping: datasetd not available on port 8112");
    return;
  }
  const result = await lookupRorCountry("05dxps055");
  assertEquals(result.rorUrl, "https://ror.org/05dxps055");
  assertEquals(result.country, "United States");
});

Deno.test("lookupRorCountry - accepts full URL prefix", async () => {
  if (!await isDatasetdAvailable()) {
    console.log("  skipping: datasetd not available on port 8112");
    return;
  }
  const result = await lookupRorCountry("https://ror.org/05dxps055");
  assertEquals(result.rorUrl, "https://ror.org/05dxps055");
  assertEquals(result.country, "United States");
});

Deno.test("lookupRorCountry - unknown key returns empty country", async () => {
  if (!await isDatasetdAvailable()) {
    console.log("  skipping: datasetd not available on port 8112");
    return;
  }
  const result = await lookupRorCountry("00000000");
  assertEquals(result.rorUrl, "https://ror.org/00000000");
  assertEquals(result.country, "");
});
