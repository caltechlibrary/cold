import { parseArgs } from "@std/cli";
import { format } from "jsr:@std/datetime";
import { stringify } from "jsr:@std/csv";

import { licenseText, releaseDate, releaseHash, version } from "./version.ts";
import { fmtHelp, generateCollaboratorReportHelpText } from "./helptext.ts";

const appName = "generate_collaborator_rpt";

interface Author {
  person_or_org: {
    name: string;
    type: string;
    identifiers?: Array<{ scheme: string; identifier: string }>;
  };
  affiliations?: Array<{ name: string }>;
}

interface Record {
  id: string;
  metadata: {
    publication_date?: string;
    creators: Author[];
  };
}

interface Coauthor {
  name: string;
  affiliations: string[];
  year: string;
  record_ids: string[];
}

export async function run_report(clpid: string, includeRecordIds: boolean) {
  // Calculate start date (48 months ago)
  const currentDate = new Date();
  const startDate = new Date(currentDate);
  startDate.setMonth(currentDate.getMonth() - 48);
  const startDateStr = format(startDate, "yyyy-MM-dd");

  //console.error(`Searching for records after ${startDateStr} for author ${clpid}`);

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
    console.log(response.text());
    Deno.exit(1);
  }
  const data = await response.json();
  const records: Record[] = data.hits.hits; //data.hits.hits.map((hit: any) => hit.metadata);

  // Aggregate coauthors
  const coauthors: { [key: string]: Coauthor } = {};

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
        let clpid: string | null = null;
        let orcid: string | null = null;
        for (const id of identifiers) {
          if (id.scheme === "clpid") clpid = id.identifier;
          if (id.scheme === "orcid") orcid = id.identifier;
        }
        const key = clpid || orcid || name;
        if (key && key !== clpid) {
          if (!coauthors[key]) {
            coauthors[key] = {
              name,
              affiliations: author.affiliations?.map((a) => a.name) || [],
              year,
              record_ids: [recordId],
            };
          } else {
            const coauthor = coauthors[key];
            if (!coauthor.record_ids.includes(recordId)) {
              coauthor.record_ids.push(recordId);
            }
            if (coauthor.year < year) {
              coauthor.year = year;
            }
            if (author.affiliations) {
              for (const aff of author.affiliations) {
                if (!coauthor.affiliations.includes(aff.name)) {
                  coauthor.affiliations.push(aff.name);
                }
              }
            }
          }
        }
      }
    }
  }

  // Prepare CSV output
  const headers = [
    "4",
    "Name:",
    "Organizational Affiliation",
    "Optional (email, Department)",
    "Last Active",
  ];
  if (includeRecordIds) {
    headers.push("CaltechAUTHORS Record IDs (do not include in NSF report)");
  }

  const rows = Object.values(coauthors).map((coauthor: Coauthor) => {
    const row = [
      "A:",
      coauthor.name,
      coauthor.affiliations.join(", "),
      "",
      coauthor.year,
    ];
    if (includeRecordIds) {
      row.push(coauthor.record_ids.join("; "));
    }
    return row;
  });

  // Sort by name
  rows.sort((a, b) => a[1].localeCompare(b[1]));

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
      record_id: "record_id",
    },
    default: {
      help: false,
      version: false,
      license: false,
      record_id: false,
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

  const clpid: string = app._ as unknown as string;
  const includeRecordIds: boolean = app.record_ids;

  if (!clpid) {
    console.error("Error: author_identifier is required.");
    Deno.exit(1);
  }
  await run_report(clpid, includeRecordIds);
}

if (import.meta.main) await main();
