/**
 * journals_vocabulary.ts turns the issn collection into an RDM style Journals vocabulary (YAML)
 */
import {
  apiPort,
  Dataset,
  //    pathIdentifier,
  yaml,
} from "./deps.ts";

import type { ISSN, ISSNInterface } from "./issn.ts";

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

if (import.meta.main) journal_vocabulary();
