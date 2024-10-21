/**
 * directory_sync.ts is a program designed to sync Caltech Directory data with CaltechPEOPLE using
 * the Caltech Directory website and the COLD Admin API.
 */
import {
  apiPort,
  appInfo,
  Dataset,
  //  DatasetApiClient,
  directoryLookup,
  DirectoryRecord,
  directoryUrl,
  //  DOMParser,
  //  Element,
  //  fmtHelp,
  //  matchType,
  OptionsProcessor,
  People,
  sleepRandomAmountOfSeconds,
} from "./deps.ts";

const MAX_ERROR_COUNT = 10
/**
 * helpText assembles the help information for COLD UI.
 *
 * @param {[k: string]: string} helpOpt holds the help options defined for the app.
 */
function helpText(helpOpt: { [k: string]: string }): string {
  const app_name = "directory_sync";
  const version = appInfo.version;
  const release_date = appInfo.releaseDate;
  const release_hash = appInfo.releaseHash;

  const txt: string[] = [
    `%${app_name}(1) user manual | ${version} ${release_date} ${release_hash}
% R. S.Doiel
% ${release_date} ${release_hash}
    
# NAME
    
${app_name}
    
# SYNOPSIS
    
${app_name} [OPTIONS]
    
# DESCRIPTION
    
${app_name} synchronizes the content between Caltech Directory and CaltechPEOPLE.
It uses the COLD Admin API as well as the Caltech Directory website content as a
data source.
    
Assuming COLD Admin is running on it's standard ports no configuration is needed.
    
${app_name} is suitable to run from a cronjob on the same machine which hosts COLD.
    
# OPTIONS
`,
  ];

  for (let attr in helpOpt) {
    const msg = helpOpt[attr];
    txt.push(`${attr}
: ${msg}
`);
  }
  txt.push(`
# EXAMPLE

${app_name} is setup to contact ${directoryUrl} to harvest directory content.

~~~shell
${app_name}
~~~

`);
  return txt.join("\n");
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
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
        `WARNING: failed to get a response for ${person.clpid} -> ${person.imss_uid}`,
      );
      imss_lookup_failures.push(person);
      err_retrieval++;
      if (err_retrieval >= MAX_ERROR_COUNT) {
        console.log(
          `aborting, ${err_retrieval} retrieval errors from ${directoryUrl}`,
        );
        console.log(
          `${imss_lookup_failures.length} record(s) had IMSS lookup failures`,
        );
        console.log(JSON.stringify(imss_lookup_failures));
        return 1;
      }
    }
    sleepRandomAmountOfSeconds(3, 24);
  }
  if (imss_lookup_failures.length > 0) {
    console.log(
      `${imss_lookup_failures.length} record(s) had IMSS lookup failures`,
    );
    for (let person of imss_lookup_failures) {
      console.log(JSON.stringify(person));
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
    console.log(helpText(op.help));
    Deno.exit(0);
  }
  if (options.license) {
    console.log(appInfo.licenseText);
    Deno.exit(0);
  }
  if (options.version) {
    console.log(`${appInfo.appName} ${appInfo.version} ${appInfo.releaseHash}`);
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
