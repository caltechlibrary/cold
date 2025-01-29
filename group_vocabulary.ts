/**
 * group_vocabulary.ts turns the issn collection into an RDM style Journals vocabulary (YAML)
 */
import { parseArgs } from "@std/cli";
import {
  apiPort,
  Dataset,
  //    pathIdentifier,
  yaml,
} from "./deps.ts";

//import { Group } from "./groups.ts";

import { licenseText, releaseDate, releaseHash, version } from "./version.ts";
import { fmtHelp, groupVocabularyHelpText } from "./helptext.ts";

const appName = "group_vocabulary";
const ds = new Dataset(apiPort, "groups.ds");

/**
 * toRDMObject() returns an abbreviated object that maps to RDM's vocabularies
 */
function toRDMObject(obj: { [key: string]: any }): Object {
  //console.log(`DEBUG item : ${JSON.stringify(obj)}`);
  return {
    id: obj.clgid,
    title: {
      en: obj.group_name,
    },
  };
}

/* Generate the Group vocabulary file for RDM. */
async function group_vocabulary() {
  const group_list = (await ds.query("group_names", [], {})) as {
    [key: string]: any;
  }[];
  let l: { [key: string]: any }[] = [];
  if (group_list !== undefined) {
    for (let item of group_list) {
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
        groupVocabularyHelpText,
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

  group_vocabulary();
}

if (import.meta.main) main();
