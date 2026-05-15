import { parseArgs } from "@std/cli";
import { stringify } from "@std/csv";
import { licenseText, releaseDate, releaseHash, version } from "./version.ts";
import {
  fmtHelp,
  publicationsByPersonIdentifiersHelpText,
} from "./helptext.ts";

const appName = "publications_by_person_identifiers";

type OutputFormat = "json" | "csv" | "jsonl";

interface Identifier {
  scheme: string;
  identifier: string;
}

interface PersonOrOrg {
  name: string;
  type: string;
  identifiers?: Identifier[];
}

interface Affiliation {
  name: string;
}

interface Creator {
  person_or_org: PersonOrOrg;
  affiliations?: Affiliation[];
}

interface FundingItem {
  funder: {
    name: string;
  };
  award?: {
    number: string;
    title?: string;
  };
}

interface Record {
  id: string;
  metadata: {
    title?: string;
    publication_date?: string;
    date_published?: string;
    doi?: string;
    creators?: Creator[];
    acknowledgements?: string;
    funding?: FundingItem[];
  };
}

interface OutputRecord {
  clpid: string;
  orcid: string;
  rdm_id: string;
  title: string;
  publication_year: string;
  doi: string;
  authors_with_affiliations: object[];
  acknowledgements: string;
  funding: object[];
  record_clpid: string;
  record_orcid: string;
}

function extractYear(dateStr: string | undefined): string {
  if (!dateStr) return "";
  // Try to extract year from various date formats
  // Formats: YYYY, YYYY-MM, YYYY-MM-DD, YYYY-MM-DDTHH:MM:SSZ
  const match = dateStr.match(/^(\d{4})/);
  return match ? match[1] : "";
}

function extractDoi(metadata: any): string {
  // DOI can be in metadata.doi or in metadata.identifiers
  if (metadata.doi) {
    return metadata.doi;
  }
  if (metadata.identifiers) {
    for (const id of metadata.identifiers) {
      if (id.scheme === "doi") {
        return id.identifier;
      }
    }
  }
  return "";
}

/**
 * Find the creator that matches the search CLPID or ORCID and extract their identifiers.
 * Returns { record_clpid, record_orcid } from the matching creator.
 */
function extractMatchingCreatorIdentifiers(
  creators: Creator[],
  searchClpid: string,
  searchOrcid: string,
): { record_clpid: string; record_orcid: string } {
  for (const creator of creators) {
    const identifiers = creator.person_or_org.identifiers || [];
    for (const id of identifiers) {
      if (
        searchClpid && id.scheme === "clpid" && id.identifier === searchClpid
      ) {
        // Found matching creator by CLPID
        const recordClpid = id.identifier;
        const recordOrcid = identifiers.find((i) =>
          i.scheme === "orcid"
        )?.identifier || "";
        return { record_clpid: recordClpid, record_orcid: recordOrcid };
      }
      if (
        searchOrcid && id.scheme === "orcid" && id.identifier === searchOrcid
      ) {
        // Found matching creator by ORCID
        const recordOrcid = id.identifier;
        const recordClpid = identifiers.find((i) =>
          i.scheme === "clpid"
        )?.identifier || "";
        return { record_clpid: recordClpid, record_orcid: recordOrcid };
      }
    }
  }
  // If no exact match found, try to find a creator with either CLPID or ORCID
  for (const creator of creators) {
    const identifiers = creator.person_or_org.identifiers || [];
    const clpid = identifiers.find((i) => i.scheme === "clpid")?.identifier ||
      "";
    const orcid = identifiers.find((i) => i.scheme === "orcid")?.identifier ||
      "";
    if (clpid || orcid) {
      return { record_clpid: clpid, record_orcid: orcid };
    }
  }
  return { record_clpid: "", record_orcid: "" };
}

/**
 * Format authors with affiliations for CSV output.
 * Format: "Name (Aff1, Aff2); Name2 (Aff3)"
 */
function formatAuthorsForCSV(creators: Creator[]): string {
  if (!creators || creators.length === 0) return "";

  return creators.map((creator) => {
    const name = creator.person_or_org.name;
    const affils = creator.affiliations?.map((a) => a.name).filter(Boolean) ||
      [];
    if (affils.length === 0) {
      return name;
    }
    return `${name} (${affils.join(", ")})`;
  }).join("; ");
}

/**
 * Format funding for CSV output.
 * Format: "Funder1 (Award1); Funder2 (Award2)"
 */
function formatFundingForCSV(funding: FundingItem[] | undefined): string {
  if (!funding || funding.length === 0) return "";

  return funding.map((f) => {
    const funderName = f.funder.name;
    const award = f.award?.number ? ` (${f.award.number})` : "";
    return `${funderName}${award}`;
  }).join("; ");
}

interface FlatOutputRecord {
  clpid: string;
  orcid: string;
  rdm_id: string;
  title: string;
  publication_year: string;
  doi: string;
  authors_with_affiliations: string;
  acknowledgements: string;
  funding: string;
  record_clpid: string;
  record_orcid: string;
}

export async function run_report(
  clpid: string,
  orcid: string,
  format: OutputFormat = "jsonl",
): Promise<void> {
  const baseUrl = "https://authors.library.caltech.edu/api/records";
  const params = new URLSearchParams();

  // Build query: match either clpid or orcid or both
  const conditions: string[] = [];
  if (clpid) {
    conditions.push(
      `metadata.creators.person_or_org.identifiers.identifier:"${clpid}"`,
    );
  }
  if (orcid) {
    // ORCID might have hyphens, need to handle that
    const orcidQuery = orcid.replace(/\-/g, "\\-");
    conditions.push(
      `metadata.creators.person_or_org.identifiers.identifier:"${orcidQuery}"`,
    );
  }

  if (conditions.length === 0) {
    console.error("Error: At least one of clpid or orcid must be provided.");
    Deno.exit(1);
  }

  // Combine conditions with OR
  const query = conditions.length === 1
    ? conditions[0]
    : `(${conditions.join(" OR ")})`;

  params.set("q", query);
  params.set("all", "1");
  params.set("size", "1000");

  const apiUrl = `${baseUrl}?${params.toString()}`;

  //console.error(`Fetching from: ${apiUrl}`);

  const response = await fetch(apiUrl);
  if (!response.ok) {
    console.error(`Error: Failed to fetch records (HTTP ${response.status})`);
    console.error(await response.text());
    Deno.exit(1);
  }

  const data = await response.json();
  const records: Record[] = data.hits.hits.map((hit: any) => hit);

  // Process records based on format
  if (format === "json") {
    // Collect all records into an array
    const outputs: OutputRecord[] = [];
    for (const record of records) {
      const metadata = record.metadata || {};
      const creators = metadata.creators || [];

      const authors_with_affiliations = creators.map((creator: Creator) => ({
        name: creator.person_or_org.name,
        type: creator.person_or_org.type,
        identifiers: creator.person_or_org.identifiers || [],
        affiliations: creator.affiliations?.map((a) => a.name) || [],
      }));

      const funding = metadata.funding || [];
      const { record_clpid, record_orcid } = extractMatchingCreatorIdentifiers(
        creators,
        clpid,
        orcid,
      );

      outputs.push({
        clpid: clpid || "",
        orcid: orcid || "",
        rdm_id: record.id || "",
        title: metadata.title || "",
        publication_year: extractYear(
          metadata.publication_date || metadata.date_published,
        ),
        doi: extractDoi(metadata),
        authors_with_affiliations: authors_with_affiliations,
        acknowledgements: metadata.acknowledgements || "",
        funding: funding,
        record_clpid,
        record_orcid,
      });
    }
    console.log(JSON.stringify(outputs, null, 2));
  } else if (format === "csv") {
    // CSV output with flattened array fields
    const outputs: FlatOutputRecord[] = [];
    for (const record of records) {
      const metadata = record.metadata || {};
      const creators = metadata.creators || [];
      const { record_clpid, record_orcid } = extractMatchingCreatorIdentifiers(
        creators,
        clpid,
        orcid,
      );

      outputs.push({
        clpid: clpid || "",
        orcid: orcid || "",
        rdm_id: record.id || "",
        title: metadata.title || "",
        publication_year: extractYear(
          metadata.publication_date || metadata.date_published,
        ),
        doi: extractDoi(metadata),
        authors_with_affiliations: formatAuthorsForCSV(creators),
        acknowledgements: metadata.acknowledgements || "",
        funding: formatFundingForCSV(metadata.funding),
        record_clpid,
        record_orcid,
      });
    }

    const headers = [
      "search_clpid",
      "search_orcid",
      "rdm_id",
      "title",
      "publication_year",
      "doi",
      "authors_with_affiliations",
      "acknowledgements",
      "funding",
      "record_clpid",
      "record_orcid",
    ];

    const rows = outputs.map((o) => [
      o.clpid,
      o.orcid,
      o.rdm_id,
      o.title,
      o.publication_year,
      o.doi,
      o.authors_with_affiliations,
      o.acknowledgements,
      o.funding,
      o.record_clpid,
      o.record_orcid,
    ]);

    console.log(stringify([headers, ...rows]));
  } else {
    // jsonl (default) - one JSON object per line
    for (const record of records) {
      const metadata = record.metadata || {};
      const creators = metadata.creators || [];

      // Build authors with affiliations
      const authors_with_affiliations = creators.map((creator: Creator) => ({
        name: creator.person_or_org.name,
        type: creator.person_or_org.type,
        identifiers: creator.person_or_org.identifiers || [],
        affiliations: creator.affiliations?.map((a) => a.name) || [],
      }));

      // Build funding array
      const funding = metadata.funding || [];

      const { record_clpid, record_orcid } = extractMatchingCreatorIdentifiers(
        creators,
        clpid,
        orcid,
      );

      const output: OutputRecord = {
        clpid: clpid || "",
        orcid: orcid || "",
        rdm_id: record.id || "",
        title: metadata.title || "",
        publication_year: extractYear(
          metadata.publication_date || metadata.date_published,
        ),
        doi: extractDoi(metadata),
        authors_with_affiliations: authors_with_affiliations,
        acknowledgements: metadata.acknowledgements || "",
        funding: funding,
        record_clpid,
        record_orcid,
      };

      console.log(JSON.stringify(output));
    }
  }
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
      format: "f",
    },
    string: ["format"],
    default: {
      help: false,
      version: false,
      license: false,
      format: "csv",
    },
  });

  if (app.help) {
    console.log(
      fmtHelp(
        publicationsByPersonIdentifiersHelpText,
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

  // Validate format option
  const formatArg = app.format as string;
  if (!["json", "csv", "jsonl"].includes(formatArg)) {
    console.error("Error: --format must be one of 'json', 'csv', or 'jsonl'.");
    Deno.exit(1);
  }
  const format: OutputFormat = formatArg as OutputFormat;

  // Get positional arguments
  const args = app._ as string[];
  const clpid: string = args[0] || "";
  const orcid: string = args[1] || "";

  if (!clpid && !orcid) {
    console.error(
      "Error: At least one of CLPID or ORCID must be provided as positional arguments.",
    );
    Deno.exit(1);
  }

  await run_report(clpid, orcid, format);
}

if (import.meta.main) await main();
