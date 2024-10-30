/**
 * fix_advisor_id.ts this is a TypeScript program that sets corrects the missing advisor ids from
 * people.csv due to a bug in the importor (i.e. a type in the field name).
 */
import {
  apiPort,
  csv_parse,
  Dataset,
//  DatasetApiClient,
//  People,
} from "./deps.ts";
import { PeopleInterface } from "./people.ts";

function normalize_to_string(val: string | undefined): string {
  if (val !== undefined) {
    return val;
  }
  return "";
}

function normalize_to_boolean(val: boolean | undefined): boolean {
  if (val !== undefined) {
    return val;
  }
  return false;
}

/**
 * setAdvisorIds takes a corrected people.csv and adds the advisors_id appropriately.
 * 
 * @param {number} port is the port number where datasetd is running, e.g. 8485
 * @param {string} c_name is the name of the dataset collection
 * @param {string} csv_file is the name of the CSV file to import
 * @returns number (error code, 0 is success, greater than zero is a failure)
 */
async function setAdvisorIds(
  port: number,
  c_name: string,
  csv_file: string,
): Promise<number> {
  /* Open csv_file and read out each row forming an object */
  /* For each row POST the object to the collection at http://localhost/8485/api/object */
  console.log("reading", csv_file);
  const ds = new Dataset(port, c_name);

  const text = (await Deno.readTextFile(csv_file)).trim();
  const row_count = (function (text: string): number {
    const matches = text.match(/\n/g);
    if (matches !== null) {
      return matches.length;
    }
    return 0;
  })(text);
  console.log("number of rows read", row_count);
  const sheet = await csv_parse(text, { skipFirstRow: true });
  console.log("number of objects found", sheet.length);
  let error_count = 0;
  let success_count = 0;
  for (const i in sheet) {
    if (sheet[i].hasOwnProperty("cl_people_id")) {
      const clpid = normalize_to_string(sheet[i]["cl_people_id"]);
      if (clpid == "") {
        continue;
      }
      const obj = await ds.read(clpid) as unknown as PeopleInterface;
      if (obj === undefined) {
        error_count++;
      } else if (typeof obj === "object") {
        let advisors_id: string = ""; 
        if (sheet[i].hasOwnProperty("advisor_id")) {
          advisors_id = sheet[i].advisor_id; 
          console.log(`DEBUG found advisors_id ${advisors_id} for ${clpid}`);
          if (advisors_id !== undefined && advisors_id !== "" ) {
            obj.advisors_id = advisors_id;
            const ok = await ds.update(clpid, obj);
            if (!ok) {
              console.log(`failed to update advisor_id ${advisors_id} for ${clpid}`);
              error_count++;
            } else {
              success_count++;
            }
          }
        }
      }
    }
  }
  if (success_count > 0) {
    console.log(`${success_count} updated successfully`);
  }
  if (error_count > 0) {
    console.log(`${error_count} failed to update`);
    return 1;
  }
  return 0;
}

/*
 * main
 */
const ds_port = apiPort;
if (Deno.args.length != 2) {
  console.log(
    "USAGE: deno run --allow-import --allow-read --allow-net fix_advisor_id.ts DATASET_C_NAME CSV_FILENAME",
  );
  console.log("NOTE: datasetd must be running on port 8485");
  Deno.exit(1);
}
Deno.exit(await setAdvisorIds(ds_port, Deno.args[0], Deno.args[1]));
