/**
 * generate_country_collaboration_rpt.ts generates a country collaboration report.
 *
 * Given an ISO 3166-1 alpha-2 country code, it:
 *   1. Queries ror.ds for all organizations in that country.
 *   2. Pre-filters to only those ROR IDs already seen in rdm_review_queue.ds creator
 *      affiliations, avoiding thousands of fruitless API calls.
 *   3. Batch-queries CaltechAUTHORS for records where the surviving ROR IDs appear in
 *      creator affiliations, contributor affiliations, or funding entries.
 *
 * Output rows are sorted by publication year (descending), journal, then title.
 * Each Caltech author is listed with their affiliations. One row per (foreign org, record).
 */
import { parseArgs } from "@std/cli";
import { stringify } from "jsr:@std/csv";

import { apiPort, Dataset } from "./deps.ts";
import { licenseText, releaseDate, releaseHash, version } from "./version.ts";
import {
  fmtHelp,
  generateCountryCollaborationRptHelpText,
} from "./helptext.ts";

const appName = "generate_country_collaboration_rpt";
const dsRor = new Dataset(apiPort, "ror.ds");
const dsReviewQueue = new Dataset(apiPort, "rdm_review_queue.ds");

const CALTECH_ROR = "05dxps055";
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 1000;
const RATE_LIMIT_BACKOFF_S = 60;
const MAX_RETRIES = 3;

interface RorEntry {
  ror: string;
  name: string;
  country_code: string;
  country_name: string;
}

interface AdditionalDescription {
  description: string;
  type: { id?: string; en?: string; title?: { en?: string } };
  lang?: { id?: string };
}

function extractDescriptionsByType(
  descriptions: AdditionalDescription[] | undefined,
  typeName: string,
): string {
  if (!descriptions) return "";
  return descriptions
    .filter((d) => (d.type?.en ?? d.type?.title?.en ?? "") === typeName)
    .map((d) => d.description)
    .join("\n\n");
}

interface PersonOrOrg {
  name: string;
  type: string;
  identifiers?: Array<{ scheme: string; identifier: string }>;
}

interface AuthorEntry {
  person_or_org: PersonOrOrg;
  affiliations?: Array<{ id?: string; name?: string }>;
  role?: { id: string };
}

interface FundingEntry {
  funder: { id: string; name?: string };
}

interface RdmRecord {
  id: string;
  metadata: {
    title?: string;
    publication_date?: string;
    creators: AuthorEntry[];
    contributors?: AuthorEntry[];
    funding?: FundingEntry[];
    additional_descriptions?: AdditionalDescription[];
  };
  custom_fields?: {
    "journal:journal"?: { title?: string };
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCaltechAffiliated(author: AuthorEntry): boolean {
  if ((author.affiliations ?? []).some((aff) => aff.id === CALTECH_ROR)) {
    return true;
  }
  // A clpid identifier means the person is in CaltechPEOPLE
  return (author.person_or_org.identifiers ?? []).some(
    (id) => id.scheme === "clpid",
  );
}

function formatCaltechAuthor(author: AuthorEntry): string {
  const name = author.person_or_org.name;
  const ids = author.person_or_org.identifiers ?? [];
  const clpid = ids.find((id) => id.scheme === "clpid")?.identifier;
  const orcid = ids.find((id) => id.scheme === "orcid")?.identifier;
  const tag = clpid ?? orcid;
  const label = tag ? `${name} (${tag})` : name;
  const affs = (author.affiliations ?? [])
    .filter((aff) => aff.id !== CALTECH_ROR && aff.name)
    .map((aff) => aff.name!);
  return affs.length > 0 ? `${label} [${affs.join(", ")}]` : label;
}

function hasRorAffiliation(author: AuthorEntry, rorId: string): boolean {
  return (author.affiliations ?? []).some((aff) => aff.id === rorId);
}

function publicationYear(record: RdmRecord): string {
  return (record.metadata.publication_date ?? "").split("-")[0];
}

function publicationTitle(record: RdmRecord): string {
  return record.metadata.title ?? "";
}

function journalTitle(record: RdmRecord): string {
  return record.custom_fields?.["journal:journal"]?.title ?? "";
}

async function getRorsByCountry(countryCode: string): Promise<RorEntry[]> {
  const results = await dsRor.query(
    "ror_by_country_code",
    ["country_code"],
    { country_code: countryCode },
  ) as RorEntry[] | undefined;
  return results ?? [];
}

/**
 * Returns the set of ROR IDs that actually appear in rdm_review_queue.ds creator
 * affiliations. Used to pre-filter the country list before hitting the remote API.
 */
async function getUsedRorIds(): Promise<Set<string>> {
  const results = await dsReviewQueue.query(
    "unique_creator_ror_ids",
    [],
    {},
  ) as Array<{ ror_id: string }> | undefined;
  const ids = new Set<string>();
  for (const row of results ?? []) {
    if (row.ror_id) ids.add(row.ror_id);
  }
  return ids;
}

async function fetchRecordsForBatch(
  rorIds: string[],
): Promise<Map<string, RdmRecord[]>> {
  const resultMap = new Map<string, RdmRecord[]>();
  for (const id of rorIds) resultMap.set(id, []);

  const clauses = rorIds.map((id) =>
    `metadata.creators.affiliations.id:${id} OR metadata.contributors.affiliations.id:${id} OR metadata.funding.funder.id:${id}`
  );
  const q = clauses.join(" OR ");
  const params = new URLSearchParams({ q, all: "1", size: "1000" });
  const url = `https://authors.library.caltech.edu/api/records?${params}`;

  let response: Response | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    response = await fetch(url);
    if (response.status !== 429) break;
    const retryAfter = parseInt(
      response.headers.get("Retry-After") ?? String(RATE_LIMIT_BACKOFF_S),
      10,
    );
    const wait = (retryAfter > 0 ? retryAfter : RATE_LIMIT_BACKOFF_S) * 1000;
    console.error(
      `Rate limited (429), waiting ${wait / 1000}s before retry ${
        attempt + 1
      }/${MAX_RETRIES}...`,
    );
    await sleep(wait);
  }

  if (!response || !response.ok) {
    console.error(
      `Warning: failed to fetch batch of ${rorIds.length} ROR IDs (HTTP ${
        response?.status ?? "no response"
      })`,
    );
    return resultMap;
  }

  const data = await response.json();
  const records: RdmRecord[] = data.hits?.hits ?? [];

  for (const record of records) {
    const creators = record.metadata.creators ?? [];
    const contributors = record.metadata.contributors ?? [];
    const funding = record.metadata.funding ?? [];

    for (const rorId of rorIds) {
      const match = creators.some((a) => hasRorAffiliation(a, rorId)) ||
        contributors.some((a) => hasRorAffiliation(a, rorId)) ||
        funding.some((f) => f.funder?.id === rorId);
      if (match) {
        resultMap.get(rorId)!.push(record);
      }
    }
  }

  return resultMap;
}

export async function run_report(countryCode: string) {
  // Step 1: get all ROR IDs for the country
  const allRorEntries = await getRorsByCountry(countryCode);
  if (allRorEntries.length === 0) {
    console.error(`No ROR entries found for country code: ${countryCode}`);
    Deno.exit(1);
  }
  console.error(
    `Found ${allRorEntries.length} ROR entries for ${countryCode} in ror.ds.`,
  );

  // Step 2: pre-filter to only ROR IDs that appear in rdm_review_queue.ds
  console.error(`Loading used ROR IDs from rdm_review_queue.ds...`);
  const usedRorIds = await getUsedRorIds();
  const rorEntries = allRorEntries.filter((e) => usedRorIds.has(e.ror));
  console.error(
    `Pre-filter: ${rorEntries.length} of ${allRorEntries.length} ROR IDs appear in CaltechAUTHORS creator affiliations.`,
  );

  if (rorEntries.length === 0) {
    console.error(
      `No CaltechAUTHORS records found with affiliations from ${countryCode}.`,
    );
    // Still emit header row so the report file is valid CSV
    console.log(
      stringify([[
        "year",
        "journal",
        "title",
        "caltech_authors",
        "rdm_record_id",
        "ror",
        "organization",
        "country",
        "acknowledgements",
        "additional_information",
      ]]),
    );
    Deno.exit(0);
  }

  const totalBatches = Math.ceil(rorEntries.length / BATCH_SIZE);
  console.error(
    `Querying CaltechAUTHORS in ${totalBatches} batches of up to ${BATCH_SIZE}...`,
  );

  const headers = [
    "year",
    "journal",
    "title",
    "caltech_authors",
    "rdm_record_id",
    "ror",
    "organization",
    "country",
    "acknowledgements",
    "additional_information",
  ];

  const csvRows: string[][] = [];
  const seen = new Set<string>(); // "rorId::recordId"

  for (let i = 0; i < rorEntries.length; i += BATCH_SIZE) {
    const batch = rorEntries.slice(i, i + BATCH_SIZE);
    const batchIds = batch.map((e) => e.ror);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.error(`Batch ${batchNum}/${totalBatches}...`);
    const batchResults = await fetchRecordsForBatch(batchIds);

    for (const entry of batch) {
      const rorId = entry.ror;
      const rorUrl = `https://ror.org/${rorId}`;
      const countryName = entry.country_name || countryCode;
      const records = batchResults.get(rorId) ?? [];

      for (const record of records) {
        const key = `${rorId}::${record.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const creators = record.metadata.creators ?? [];
        const contributors = record.metadata.contributors ?? [];
        const year = publicationYear(record);
        const title = publicationTitle(record);
        const journal = journalTitle(record);
        const acknowledgements = extractDescriptionsByType(
          record.metadata.additional_descriptions,
          "Acknowledgement",
        );
        const additionalInformation = extractDescriptionsByType(
          record.metadata.additional_descriptions,
          "Additional Information",
        );

        const caltechAuthors = [
          ...creators.filter((a) => isCaltechAffiliated(a)),
          ...contributors.filter((a) => isCaltechAffiliated(a)),
        ].map(formatCaltechAuthor);

        csvRows.push([
          year,
          journal,
          title,
          caltechAuthors.join("; "),
          record.id,
          rorUrl,
          entry.name,
          countryName,
          acknowledgements,
          additionalInformation,
        ]);
      }
    }

    if (i + BATCH_SIZE < rorEntries.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.error(`Done. ${csvRows.length} rows collected.`);

  // Sort by year desc, journal asc, title asc
  // Indices: 0=year, 1=journal, 2=title
  csvRows.sort((a, b) => {
    const y = b[0].localeCompare(a[0]); // year descending
    if (y !== 0) return y;
    const j = a[1].localeCompare(b[1]);
    if (j !== 0) return j;
    return a[2].localeCompare(b[2]);
  });

  console.log(stringify([headers, ...csvRows]));
}

async function main() {
  const app = parseArgs(Deno.args, {
    alias: { help: "h", license: "l", version: "v" },
    default: { help: false, version: false, license: false },
  });

  if (app.help) {
    console.log(
      fmtHelp(
        generateCountryCollaborationRptHelpText,
        appName,
        version,
        releaseDate,
        releaseHash,
      ),
    );
    Deno.exit(0);
  }
  if (app.version) {
    console.log(`${appName} ${version} ${releaseHash}`);
    Deno.exit(0);
  }
  if (app.license) {
    console.log(licenseText);
    Deno.exit(0);
  }

  const args = app._ as string[];
  const countryCode = args.length > 0
    ? String(args[0]).trim().toUpperCase()
    : "";
  if (!countryCode) {
    console.error("Error: country_code is required (e.g. AU, DE, JP).");
    Deno.exit(1);
  }
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    console.error(
      `Error: invalid country_code "${countryCode}": must be an ISO 3166-1 alpha-2 code (e.g. AU, DE, JP).`,
    );
    Deno.exit(1);
  }

  await run_report(countryCode);
}

if (import.meta.main) await main();
