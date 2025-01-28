/**
 * directory_sync.ts is a program designed to sync Caltech Directory data with CaltechPEOPLE using
 * the Caltech Directory website and the COLD Admin API.
 */
import {
  apiPort,
  Dataset,
  //  DatasetApiClient,
  directoryLookup,
  DirectoryRecord,
  directoryUrl,
  licenseText,
  //  DOMParser,
  //  Element,
  //  fmtHelp,
  //  matchType,
  OptionsProcessor,
  People,
  releaseDate,
  releaseHash,
  sleepRandomAmountOfSeconds,
  version,
} from "./deps.ts";

import { directorySyncHelpText, fmtHelp } from "./helptext.ts";

const MAX_ERROR_COUNT = 25;
const appName = "directory_sync";

function formatDate(date: Date): string {
  return date.toJSON().substring(0, 10);
}

/**
 * merge_changes takes a CaltechPEOPLE object and a directory object and merges the changes
 * return a new CaltechPEOPLE object.
 */
function merge_changes(people_obj: People, data: DirectoryRecord): boolean {
  // Create a copy of people_obj.
  let isChanged = false;
  if (people_obj.display_name !== data.display_name) {
    people_obj.display_name = data.display_name;
    isChanged = true;
  }
  if (people_obj.family_name !== data.family_name) {
    people_obj.family_name = data.family_name;
    isChanged = true;
  }
  if (people_obj.given_name !== data.given_name) {
    people_obj.given_name = data.given_name;
    isChanged = true;
  }
  if (people_obj.directory_person_type !== data.directory_person_type) {
    people_obj.directory_person_type = data.directory_person_type;
    isChanged = true;
  }
  if (people_obj.title !== data.title) {
    people_obj.title = data.title;
    isChanged = true;
  }
  // NOTE: Pickup division from directory if not set in cold
  if ((people_obj.division === "") && (data.division !== "")) {
    people_obj.division = data.division;
    isChanged = true;
  }
  if (people_obj.bio !== data.bio) {
    people_obj.bio = data.bio;
    isChanged = true;
  }
  if (people_obj.email !== data.email) {
    people_obj.email = data.email;
    isChanged = true;
  }
  if (isChanged) {
    people_obj.updated = formatDate(new Date());
  }
  return isChanged;
}

/**
 * caltechDirectorySync implements the automatic syncronization between COLD's CaltechPEOPLE
 * and the Caltech Directory.
 */
async function caltechDirectorySync(
  port: number,
  directoryUrl: string,
): Promise<number> {
  /* Get list of IMSS usernames with records and update names, title, add divisions and biographical details if missing */
  const c_name = "people.ds";
  const ds = new Dataset(port, c_name);
  //const people = [ { "clpid": "Morstein-Johannes", "imss_uid": "morstein" } ];//await ds.query('directory_people', [], {}) as unknown as Array<any>;
  const people = await ds.query("directory_people", [], {}) as unknown as Array<
    any
  >;
  if (people == undefined) {
    console.log(`failed to find any results from directory_people query`);
    return 1;
  }

  let err_updates = 0;
  let err_retrieval = 0;
  let records_processed = 0;
  let imss_lookup_failures = [];
  for (let person of people) {
    //console.log("DEBUG including person", person);
    if (person.caltech === 1) {
      const data = await directoryLookup(person.imss_uid);
      if (data !== undefined) {
        const obj = await ds.read(person.clpid) as unknown as People;
        if (obj !== undefined) {
          const isChanged = merge_changes(obj, data);
          if (isChanged) {
            if (!await ds.update(person.clpid, obj)) {
              console.log(
                `WARNING: failed to update ${person.clpid} in ${c_name}`,
              );
              err_updates++;
              if (err_updates >= MAX_ERROR_COUNT) {
                console.log(
                  `aborting, ${err_updates} update errors, check datasetd JSON API`,
                );
                return 1;
              }
            } else {
              records_processed++;
            }
          }
        }
      } else {
        console.log(
          `WARNING: failed to get a directory response for ${person.clpid} -> <https://apps.library.caltech.edu/cold/people/${person.clpid}>`,
        );
        const obj = await ds.read(person.clpid) as unknown as People;
        obj.caltech = false;
        obj.internal_notes = `${obj.internal_notes}\n${
          (new Date()).toJSON().substring(0, 10)
        }\t${person.clpid}, directory id "${person.imss_uid}" not found\n`;
        if (!await ds.update(person.clpid, obj)) {
          console.log(
            `WARNING: failed to update caltech statatus ${person.clpid} in ${c_name}`,
          );
          err_updates++;
          if (err_updates >= MAX_ERROR_COUNT) {
            console.log(
              `aborting, ${err_updates} update errors, check datasetd JSON API`,
            );
            return 1;
          }
        }

        imss_lookup_failures.push(person);
        err_retrieval++;
        if (err_retrieval >= MAX_ERROR_COUNT) {
          console.log(
            `aborting, ${err_retrieval} retrieval errors from ${directoryUrl}`,
          );
          console.log(
            `${imss_lookup_failures.length} record(s) had IMSS lookup failures`,
          );
          //console.log(JSON.stringify(imss_lookup_failures));
          return 1;
        }
      }
      sleepRandomAmountOfSeconds(3, 24);
    }
  }
  return 0;
}

/*
 * Main provides the main interface from the command line. One parameter is expected which
 * is the path to the YAML configuration file.
 */
async function main() {
  const op: OptionsProcessor = new OptionsProcessor();
  const port = apiPort;
  const uri = directoryUrl;

  op.booleanVar("help", false, "display help");
  op.booleanVar("license", false, "display license");
  op.booleanVar("version", false, "display version");
  op.booleanVar("debug", false, "turn on debug logging");
  op.numberVar(
    "port",
    port,
    `set the port number for the COLD Admin JSON API, default ${port}`,
  );
  op.stringVar(
    "directory",
    uri,
    `set the Caltech Directory URL, default ${uri}`,
  );

  op.parse(Deno.args);

  const options = op.options;
  const args = op.args;

  if (options.help) {
    console.log(
      fmtHelp(
        directorySyncHelpText,
        appName,
        version,
        releaseDate,
        releaseHash,
      ),
    );
    Deno.exit(0);
  }
  if (options.license) {
    console.log(licenseText);
    Deno.exit(0);
  }
  if (options.version) {
    console.log(`${appName} ${version} ${releaseHash}`);
    Deno.exit(0);
  }

  console.log(
    `Sync using COLD Admin API on port ${port} and Caltech Directory ${uri}.
`,
  );
  Deno.exit(await caltechDirectorySync(port, uri));
}

// Run main()
if (import.meta.main) await main();
