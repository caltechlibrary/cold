/**
 * set_include_in_feeds.ts this is a TypeScript program that sets the include in feeds property to true for
 * the list of clpid found in CSV file.
 */
import { apiPort, csv_parse, Dataset } from "./deps.ts";
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
 * setIncludeInFeeds takes a single column CSV file and for clpid it retrieves a record from
 * people.ds, and sets the property "include_in_feeds" to true.
 *
 * @param {number} port is the port number where datasetd is running, e.g. 8485
 * @param {string} c_name is the name of the dataset collection
 * @param {string} csv_file is the name of the CSV file to import
 * @returns number (error code, 0 is success, greater than zero is a failure)
 */
async function setIncludeInFeeds(
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
    if (sheet[i].hasOwnProperty("clpid")) {
      const clpid = normalize_to_string(sheet[i]["clpid"]);
      if (clpid == "") {
        continue;
      }
      const obj = await ds.read(clpid) as unknown as PeopleInterface;
      if (obj === undefined) {
        error_count++;
      } else if (typeof obj === "object") {
        obj.include_in_feeds = true;
        console.log(`ds.read(${clpid}) -> ${JSON.stringify(obj)}`);
        const ok = await ds.update(clpid, obj);
        if (!ok) {
          console.log(`failed to update clpid ${clpid}`);
          error_count++;
        } else {
          success_count++;
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
    "USAGE: deno set_include_in_feeds.ts DATASET_C_NAME CSV_FILENAME",
  );
  console.log("NOTE: datasetd must be running on port 8485");
  Deno.exit(1);
}
Deno.exit(await setIncludeInFeeds(ds_port, Deno.args[0], Deno.args[1]));
