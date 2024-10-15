/**
 * ds_importer.ts this is a TypeScript program that imports data from a CSV file into a dataset
 * collection via datasetd JSON API.
 */
import { apiPort, csv_parse, Dataset, Group, ISSN, People } from "./deps.ts";

/**
 * dsImporter takes a CSV file and for each row turns it into an object and
 * POST the object to the datasetd API `/api/object` populating the collection.
 *
 * @param {number} port is the port number where datasetd is running, e.g. 8485
 * @param {string} c_name is the name of the dataset collection
 * @param {string} csv_file is the name of the CSV file to import
 * @returns number (error code, 0 is success, greater than zero is a failure)
 */
async function dsImporter(
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
    if (sheet[i].hasOwnProperty("ISSN")) {
      const key: string = (function (key) {
        if (key === undefined) {
          return "";
        }
        return key;
      })(sheet[i].ISSN);
      const obj = new ISSN();
      if (!(await obj.migrateCsv(sheet[i]))) {
        console.log(`failed to migrate row (${i})`, i, "of", csv_file);
        error_count += 1;
        continue;
      }
      const ok = await ds.create(key, obj.asObject());
      if (ok) {
        success_count += 1;
      } else {
        console.log(`import issn failed (issn: ${key}, row ${i}),`, ok);
        error_count += 1;
      }
    } else if (sheet[i].hasOwnProperty("key")) {
      const key: string = (function (key) {
        if (key === undefined) {
          return "";
        }
        return key;
      })(sheet[i].key);
      const obj = new Group();
      if (!(await obj.migrateCsv(sheet[i]))) {
        console.log("failed to migrate row", i, "of", csv_file);
        error_count += 1;
        continue;
      }
      const ok = await ds.create(key, obj.asObject());
      if (ok) {
        success_count += 1;
      } else {
        console.log("import group failed,", ok);
        error_count += 1;
      }
    } else if (sheet[i].hasOwnProperty("cl_people_id")) {
      const key = (function (key) {
        if (key === undefined) {
          return "";
        }
        return key;
      })(sheet[i].cl_people_id);
      const obj = new People();
      if (!(await obj.migrateCsv(sheet[i]))) {
        console.log("failed to migrate row", i, "of", csv_file);
        error_count += 1;
        continue;
      }
      const ok = await ds.create(key, obj.asObject());
      if (ok) {
        success_count += 1;
      } else {
        console.log("import people failed,", ok);
        error_count += 1;
      }
    }
  }
  if (success_count > 0) {
    console.log(`${success_count} objects successfully imported`);
  }
  if (error_count > 0) {
    console.log(`${error_count} objects failed to import`);
    return 1;
  }
  return 0;
}

/*
 * main
 */
const ds_port = apiPort;
if (Deno.args.length != 2) {
  console.log("USAGE: deno ds_importer.ts DATASET_C_NAME CSV_FILENAME");
  console.log("NOTE: datasetd must be running on port 8485");
  Deno.exit(1);
}
Deno.exit(await dsImporter(ds_port, Deno.args[0], Deno.args[1]));
