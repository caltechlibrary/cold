/**
 * division_people.ts is a program designed to take a CSV file with columns organized
 * as
 * `"division","clpid","orcid","family_name","given_name","other group","other group", ...
 * and import the list of people updating their groups memberships based on the "division" column and
 * any column labeld "other group".
 *
 * NOTE: Enhancement, "division" column can contain either a division name or clgid value. RSD 2025-04-28
 */
import { licenseText, releaseDate, releaseHash, version } from "./deps.ts";
import * as cli from "@std/cli";
import { dumpDivisionPeopleCSV, loadDivisionPeopleCSV } from "./utils.ts";

import { divisionPeopleHelpText, fmtHelp } from "./helptext.ts";

const appName = "division_people";

async function main() {
  const app = cli.parseArgs(Deno.args, {
    alias: {
      help: "h",
      license: "l",
      version: "v",
      verbose: "V",
    },
    default: {
      help: false,
      version: false,
      license: false,
      verbose: false,
    },
  });
  if (app.help) {
    console.log(
      fmtHelp(
        divisionPeopleHelpText,
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
  const args = app._;
  if (args.length === 0) {
    console.log(
      fmtHelp(
        divisionPeopleHelpText,
        appName,
        version,
        releaseDate,
        releaseHash,
      ),
    );
    Deno.exit(1);
  }
  if (args.length !== 2) {
    console.log(`USAGE: ${appName} load|dump CSV_FILENAME`);
    Deno.exit(1);
  }
  const cmd = args[0];
  const csvFilename: string = args[1] as unknown as string;
  let err: string = "";
  switch (cmd) {
    case "load":
      err = await loadDivisionPeopleCSV(csvFilename, app.verbose);
      break;
    case "dump":
      err = await dumpDivisionPeopleCSV(csvFilename, app.verbose);
      break;
  }
  if (err !== "") {
    console.error(err);
    Deno.exit(1);
  }
}

if (import.meta.main) main();
