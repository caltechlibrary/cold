/**
 * journal_vocabulary.ts turns the thesis_option collection into an RDM style Journals vocabulary (YAML)
 */
import { parseArgs } from "@std/cli";
import {
  apiPort,
  Dataset,
  //    pathIdentifier,
  yaml,
} from "./deps.ts";

import type { ThesisOption } from "./thesis_option.ts";

import { licenseText, releaseDate, releaseHash, version } from "./version.ts";
import { fmtHelp, thesisOptionVocabularyHelpText } from "./helptext.ts";

const appName = "thesis_option_vocabulary";
const ds = new Dataset(apiPort, "thesis_options.ds");

/**
 * toRDMObject() returns an abbreviated object that maps to RDM's vocabularies
 */
function toRDMObject(obj: ThesisOption): Object {
  return {
    id: obj.option_id,
    name: obj.name,
    division: obj.division,
  };
}

/* Generate the Thesis Option vocabulary file for RDM. */
async function thesis_option_vocabulary() {
  const thesis_option_list =
    (await ds.query("thesis_option_names", [], {})) as ThesisOption[];
  let l: object[] = [];
  if (thesis_option_list !== undefined) {
    for (let item of thesis_option_list) {
      l.push(toRDMObject(item));
      //        l.push({"id": item.thesis_option, "title": { "en": item.name});
      //        console.log(`DEBUG item ${item}`);
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
        thesisOptionVocabularyHelpText,
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

  thesis_option_vocabulary();
}

if (import.meta.main) main();
