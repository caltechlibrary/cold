/**
 * journal_vocabulary.ts turns the issn collection into an RDM style Journals vocabulary (YAML)
 */
import { parseArgs } from "@std/cli";
import {
  apiPort,
  Dataset,
  //    pathIdentifier,
  yaml,
} from "./deps.ts";

import type { ISSN } from "./issn.ts";

import { licenseText, releaseDate, releaseHash, version } from "./version.ts";
import { fmtHelp, journalVocabularyHelpText } from "./helptext.ts";

const appName = "journal_vocabulary";
const ds = new Dataset(apiPort, "issn.ds");

/**
 * toRDMObject() returns an abbreviated object that maps to RDM's vocabularies
 */
function toRDMObject(obj: ISSN): Object {
  return {
    id: obj.issn,
    title: {
      en: obj.name,
    },
  };
}

/* Generate the ISSN Journal vocabulary file for RDM. */
async function journal_vocabulary() {
  const issn_list = (await ds.query("issn_names", [], {})) as ISSN[];
  let l: object[] = [];
  if (issn_list !== undefined) {
    for (let item of issn_list) {
      l.push(toRDMObject(item));
      //        l.push({"id": item.issn, "title": { "en": item.name});
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
        journalVocabularyHelpText,
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

  journal_vocabulary();
}

if (import.meta.main) main();
