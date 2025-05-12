/**
 * people_vocabulary.ts turns people collection into an RDM style vocabulary (YAML)
 */
import { parseArgs } from "@std/cli";
import {
  apiPort,
  Dataset,
  //    pathIdentifier,
  yaml,
} from "./deps.ts";

import { licenseText, releaseDate, releaseHash, version } from "./version.ts";
import { fmtHelp, peopleVocabularyHelpText } from "./helptext.ts";

const appName = "people_vocabulary";
const ds = new Dataset(apiPort, "people.ds");

/**
 * toRDMObject() returns an abbreviated object that maps to RDM's vocabularies
 */
function toRDMObject(obj: { [key: string]: any }): Object {
  //console.log(`DEBUG item : ${JSON.stringify(obj)}`);
  /* Example structure for irdmtools, issues #74
  family_name: Aagard
  given_name: Brad Thomas
  id: Aagard-Brad-Thomas
  identifiers:
    - scheme: clpid
      identifier: Aagard-Brad-Thomas
  affiliations:
    - id: 05dxps055
      name: Caltech
  */
  return {
    id: obj.clpid,
    family_name: obj.family_name,
    given_name: obj.given_name,
    identifiers: obj.identifiers,
    affiliations: obj.affiliations,
  };
}

/* Generate the people vocabulary file for RDM. */
async function people_vocabulary() {
  const people_list = (await ds.query("people_vocabulary", [], {})) as {
    [key: string]: any;
  }[];
  let l: { [key: string]: any }[] = [];
  if (people_list !== undefined) {
    for (let item of people_list) {
      l.push(toRDMObject(item));
    }
  }
  console.log(yaml.stringify(l));
}

function main() {
  const app = parseArgs(Deno.args, {
    alias: {
      help: "h",
      license: "l",
      version: "v",
    },
    default: {
      help: false,
      version: false,
      license: false,
    },
  });
  if (app.help) {
    console.log(
      fmtHelp(
        peopleVocabularyHelpText,
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

  people_vocabulary();
}

if (import.meta.main) main();
