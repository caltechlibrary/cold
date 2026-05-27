/**
 * generate_collaborator_affiliations_rpt.ts generates a collaborator affiliations report.
 *
 * This report is similar to the collaborator report but expands on a person's affiliations relationships.
 * For coauthors that have multiple affiliations, there will be separate rows for each specific affiliation.
 * Each row shows the organization, ROR ID, and country of affiliation in addition to all the same columns
 * available in the regular collaborator report.
 */
import { parseArgs } from "@std/cli";
import { format } from "jsr:@std/datetime";
import { stringify } from "jsr:@std/csv";

import { apiPort, Dataset } from "./deps.ts";
import { licenseText, releaseDate, releaseHash, version } from "./version.ts";
import { fmtHelp, generateCollaboratorReportHelpText } from "./helptext.ts";

const appName = "generate_collaborator_affiliations_rpt";
const dsRor = new Dataset(apiPort, "ror.ds");

interface Author {
  person_or_org: {
    name: string;
    type: string;
    identifiers?: Array<{ scheme: string; identifier: string }>;
  };
  affiliations?: Array<{ name: string; id?: string }>;
}

interface Record {
  id: string;
  metadata: {
    publication_date?: string;
    creators: Author[];
  };
}

interface AffiliationRow {
  name: string;
  affiliation_name: string;
  ror_id: string;
  country: string;
  year: string;
  record_ids: string[];
}

/**
 * extractCountry pulls the country name out of a stored ROR record.
 * Handles both ROR v2 (locations[].geonames_details) and v1 (country object) formats.
 */
export function extractCountry(data: { [key: string]: any }): string {
  // ROR v2: locations array with geonames_details
  if (Array.isArray(data.locations) && data.locations.length > 0) {
    const loc = data.locations[0];
    if (loc.geonames_details?.country_name) {
      return loc.geonames_details.country_name;
    }
    if (loc.geonames_details?.country) return loc.geonames_details.country;
    if (loc.country_name) return loc.country_name;
    if (loc.country_code) return loc.country_code;
  }
  // ROR v1: country object or string
  if (data.country) {
    if (typeof data.country === "string") return data.country;
    if (data.country.country_name) return data.country.country_name;
    if (data.country.name) return data.country.name;
    if (data.country.code) return data.country.code;
  }
  // addresses fallback (pre-v1 format)
  if (Array.isArray(data.addresses) && data.addresses.length > 0) {
    const addr = data.addresses[0];
    if (addr.geonames_details?.country_name) {
      return addr.geonames_details.country_name;
    }
    if (addr.country_name) return addr.country_name;
    if (addr.country_code) return addr.country_code;
  }
  return "";
}

/**
 * lookupRorCountry reads a ROR record from ror.ds by key and returns the country name.
 * @param rorId - ROR identifier with or without prefix ("0333a7d27" or "https://ror.org/0333a7d27")
 */
export async function lookupRorCountry(
  rorId: string,
): Promise<{ country: string; rorUrl: string }> {
  const lookupId = rorId.replace(/^https:\/\/ror\.org\//, "");
  if (!lookupId) {
    return { country: "", rorUrl: "" };
  }
  const fullUrl = `https://ror.org/${lookupId}`;
  try {
    const data = await dsRor.read(lookupId) as
      | { [key: string]: any }
      | undefined;
    if (!data) {
      return { country: "", rorUrl: fullUrl };
    }
    return { country: extractCountry(data), rorUrl: fullUrl };
  } catch (err) {
    console.error(`Error looking up ROR ${lookupId}:`, err);
    return { country: "", rorUrl: fullUrl };
  }
}

/**
 * Generate the collaborator affiliations report
 * @param clpid - The Caltech Library Person ID to generate report for
 * @param includeRecordIds - Whether to include record IDs in the output
 */
export async function run_report(clpid: string, includeRecordIds: boolean) {
  // Calculate start date (48 months ago)
  const currentDate = new Date();
  const startDate = new Date(currentDate);
  startDate.setMonth(currentDate.getMonth() - 48);
  const startDateStr = format(startDate, "yyyy-MM-dd");

  // Build the API URL with proper encoding
  const baseUrl = "https://authors.library.caltech.edu/api/records";
  const params = new URLSearchParams();
  params.set(
    "q",
    `metadata.creators.person_or_org.identifiers.identifier:"${clpid}"`,
  );
  params.set("all", "1");
  params.set("size", "1000");

  const apiUrl = `${baseUrl}?${params.toString()}`;

  // Fetch records from Invenio RDM API
  const response = await fetch(apiUrl);
  if (!response.ok) {
    console.log(`Error: Failed to fetch records (HTTP ${response.status})`);
    Deno.exit(1);
  }
  const data = await response.json();
  const records: Record[] = data.hits.hits;

  // Aggregate coauthors: one row per (collaboratorKey, affiliation, rorId)
  const affiliationMap = new Map<string, AffiliationRow>();

  for (const article of records) {
    if (!article.metadata?.publication_date) {
      console.error(
        `Warning: Skipping record ${article.id} due to missing publication_date.`,
      );
      continue;
    }
    const year = article.metadata.publication_date.split("-")[0];
    const authors = article.metadata.creators;
    const recordId = article.id;

    for (const author of authors) {
      const name = author.person_or_org.name;
      if (author.person_or_org.type === "personal") {
        const identifiers = author.person_or_org.identifiers || [];
        let authorClpid: string | null = null;
        let orcid: string | null = null;
        for (const id of identifiers) {
          if (id.scheme === "clpid") authorClpid = id.identifier;
          if (id.scheme === "orcid") orcid = id.identifier;
        }
        const collaboratorKey = authorClpid || orcid || name;
        if (collaboratorKey && collaboratorKey !== clpid) {
          const affiliations = author.affiliations || [];

          if (affiliations.length === 0) {
            const mapKey = `${collaboratorKey}::`;
            const existing = affiliationMap.get(mapKey);
            if (!existing) {
              affiliationMap.set(mapKey, {
                name,
                affiliation_name: "",
                ror_id: "",
                country: "",
                year,
                record_ids: [recordId],
              });
            } else {
              if (!existing.record_ids.includes(recordId)) {
                existing.record_ids.push(recordId);
              }
              if (existing.year < year) existing.year = year;
            }
          } else {
            for (const aff of affiliations) {
              const affName = aff.name || "";
              const affId = aff.id || "";
              const mapKey = `${collaboratorKey}::${affName}::${affId}`;
              const existing = affiliationMap.get(mapKey);
              if (!existing) {
                const rorInfo = await lookupRorCountry(affId);
                affiliationMap.set(mapKey, {
                  name,
                  affiliation_name: affName,
                  ror_id: rorInfo.rorUrl,
                  country: rorInfo.country,
                  year,
                  record_ids: [recordId],
                });
              } else {
                if (!existing.record_ids.includes(recordId)) {
                  existing.record_ids.push(recordId);
                }
                if (existing.year < year) existing.year = year;
              }
            }
          }
        }
      }
    }
  }

  const affiliationRows = Array.from(affiliationMap.values());

  // Prepare CSV output
  // Columns: 4, Name:, Organizational Affiliation, ROR ID, Country, Optional (email, Department), Last Active, [Record IDs]
  const headers = [
    "4",
    "Name:",
    "Organizational Affiliation",
    "ROR ID",
    "Country",
    "Optional (email, Department)",
    "Last Active",
  ];
  if (includeRecordIds) {
    headers.push("CaltechAUTHORS Record IDs (do not include in NSF report)");
  }

  const rows = affiliationRows.map((row: AffiliationRow) => {
    const csvRow = [
      "A:",
      row.name,
      row.affiliation_name,
      row.ror_id,
      row.country,
      "", // Optional (email, Department) - empty for now
      row.year,
    ];
    if (includeRecordIds) {
      csvRow.push(row.record_ids.join("; "));
    }
    return csvRow;
  });

  // Sort by name, then by affiliation name
  rows.sort((a, b) => {
    const nameCompare = a[1].localeCompare(b[1]);
    if (nameCompare !== 0) return nameCompare;
    return a[2].localeCompare(b[2]);
  });

  // Output CSV to stdout
  const csv = stringify([headers, ...rows]);
  console.log(csv);
}

//
// Main processing
//
async function main() {
  const app = parseArgs(Deno.args, {
    alias: {
      help: "h",
      license: "l",
      version: "v",
      record_ids: "record_id",
    },
    default: {
      help: false,
      version: false,
      license: false,
      record_ids: false,
    },
  });
  if (app.help) {
    console.log(
      fmtHelp(
        generateCollaboratorReportHelpText,
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
    console.log(`${licenseText}`);
    Deno.exit(0);
  }

  const args = app._ as string[];
  const clpid: string = args.length > 0 ? args[0] : "";
  const includeRecordIds: boolean = app.record_ids;

  if (!clpid) {
    console.error("Error: author_identifier (clpid) is required.");
    Deno.exit(1);
  }
  await run_report(clpid, includeRecordIds);
}

if (import.meta.main) await main();
