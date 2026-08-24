import { parseArgs } from "@std/cli";
import { format as formatDate } from "jsr:@std/datetime";
import { stringify } from "jsr:@std/csv";

import { licenseText, releaseDate, releaseHash, version } from "./version.ts";
import { fmtHelp, generateCollaboratorReportHelpText } from "./helptext.ts";
import { writeXlsx } from "./xlsx_writer.ts";
import { fetchAllRecords } from "./caltechauthors_api.ts";

const VALID_FORMATS = ["csv", "xlsx"];

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

/**
 * buildRecordsQueryUrl builds the CaltechAUTHORS records API URL for a given
 * clpid, restricted to publications on or after startDateStr (yyyy-MM-dd).
 */
export function buildRecordsQueryUrl(
    clpid: string,
    startDateStr: string,
): string {
    const baseUrl = "https://authors.library.caltech.edu/api/records";
    const params = new URLSearchParams();
    params.set(
        "q",
        `metadata.creators.person_or_org.identifiers.identifier:"${clpid}" AND metadata.publication_date:[${startDateStr} TO *]`,
    );
    params.set("all", "1");
    params.set("size", "1000");
    return `${baseUrl}?${params.toString()}`;
}

export async function run_report(
    clpid: string,
    includeRecordIds: boolean,
    outputFormat: string = "csv",
) {
    // Calculate start date (48 months ago)
    const currentDate = new Date();
    const startDate = new Date(currentDate);
    startDate.setMonth(currentDate.getMonth() - 48);
    const startDateStr = formatDate(startDate, "yyyy-MM-dd");

    //console.error(`Searching for records after ${startDateStr} for author ${clpid}`);

    const apiUrl = buildRecordsQueryUrl(clpid, startDateStr);

    // Fetch records from Invenio RDM API, following pagination
    let hits: unknown[];
    try {
        hits = await fetchAllRecords(apiUrl);
    } catch (err) {
        console.error(
            `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        Deno.exit(1);
    }
    const records: Record[] = hits as Record[];

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
                            affiliations: author.affiliations?.map((a) =>
                                a.name
                            ) || [],
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
        headers.push(
            "CaltechAUTHORS Record IDs (do not include in NSF report)",
        );
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

    // Output to stdout in the requested format. XLSX is written as raw bytes
    // (not console.log, which would corrupt binary output) so that redirecting
    // stdout to a file, or piping it through the report queue, produces a
    // valid workbook.
    if (outputFormat === "xlsx") {
        const bytes = await writeXlsx([headers, ...rows], {
            sheetName: "NSF Collaborator Report Table 4",
        });
        await Deno.stdout.write(bytes);
    } else {
        const csv = stringify([headers, ...rows]);
        console.log(csv);
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
            record_id: "record_id",
            format: "f",
        },
        default: {
            help: false,
            version: false,
            license: false,
            record_id: false,
            format: "csv",
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
    const outputFormat: string = app.format;

    if (!clpid) {
        console.error("Error: author_identifier is required.");
        Deno.exit(1);
    }
    if (!VALID_FORMATS.includes(outputFormat)) {
        console.error(
            `Error: --format must be one of ${
                VALID_FORMATS.join(", ")
            }, got "${outputFormat}".`,
        );
        Deno.exit(1);
    }
    await run_report(clpid, includeRecordIds, outputFormat);
}

if (import.meta.main) await main();
