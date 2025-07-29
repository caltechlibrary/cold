/**
 * ror_import.ts this processes a ROR dump retrieved from zenodo updating the ROR dataset collection.
 */

import { parseArgs } from "@std/cli/parse-args";
import { exists } from "@std/fs/exists";
import ProgressBar from "@deno-library/progress";

import { licenseText, releaseDate, releaseHash, version } from "./version.ts";
import { fmtHelp, rorImportHelpText } from "./helptext.ts";

import { Dataset, DatasetApiClient } from "../ts_dataset/mod.ts"; //"https://caltechlibrary.github.io/ts_dataset/mod.ts";

const cName = "ror.ds";
const ds = new DatasetApiClient(8112, cName);

// Function to extract a specific file from a zip file using the unzip command
// and a file pattern expressed as a RegExp.
async function retrieveTextFromZipFile(
  zipFilePath: string,
  filePattern: RegExp,
): Promise<string | undefined> {
  if (!await exists(zipFilePath, { isFile: true })) {
    console.error(`could not find file ${zipFilePath}`);
    return undefined;
  }
  console.log(`Scanning ${zipFilePath} for ${filePattern}`);
  // Command to list files in the zip file
  const listCommand = new Deno.Command("unzip", {
    args: ["-l", zipFilePath],
  });

  // Execute the list command
  const listResult = await listCommand.output();

  // Decode the output to get the list of files
  const textDecoder = new TextDecoder();
  const fileList = textDecoder.decode(listResult.stdout);

  // Parse the file list to find the desired file
  const files = fileList.split("\n");
  const targetFileEntry = files.find((file) => filePattern.test(file));
  if (!targetFileEntry) {
    console.error(
      `No file with ending '${filePattern}' found in the zip file.`,
    );
    return undefined;
  }
  const columns = targetFileEntry.split(" ");
  //console.log(`DEBUG columns of entry -> ${JSON.stringify(columns, null, 2)}`);

  const targetFile = columns[columns.length - 1];
  console.log(`Retrieving data from ${targetFile} in ${zipFilePath}`);
  // Extract the target file using the unzip command
  const extractCommand = new Deno.Command("unzip", {
    args: ["-p", zipFilePath, targetFile],
  });
  // Execute the extract command
  const extractResult = await extractCommand.output();
  console.log(`Data retrieval complete from ${targetFile} in ${zipFilePath}`);
  // Decode and return the extracted file content
  return textDecoder.decode(extractResult.stdout);
}

async function processJSONDump(src: string): Promise<number> {
  const rorObjects: { [key: string]: any }[] = JSON.parse(src);
  console.log(`${rorObjects.length} ror to process.`);
  if (rorObjects.length === 0) {
    console.error(`No ROR objects to process`);
    return 1;
  }
  let i: number = 0;
  let ror: string = "";
  console.log(`Clearing data from ${cName}`);
  await ds.query("clear_ror_data", [], "");
  const title = "ROR Objects processed";
  const total = rorObjects.length;
  const progress = new ProgressBar({
    title,
    total,
  });

  for (const obj of rorObjects) {
    "id" in obj ? ror = obj.id : ror = "";
    if (ror === "") {
      console.error(
        `failed (#{i}), ror id missing from ${JSON.stringify(obj)}, skipping`,
      );
    } else {
      const key = ror.replace(/https:\/\/ror.org\//, "");
      await ds.create(key, JSON.stringify(obj));
    }
    await progress.render(i);
    i++;
  }
  await progress.render(i);
  return 0;
}

async function main() {
  const appName = "ror_import";
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
  const args = app._;
  if (app.help) {
    console.log(
      fmtHelp(rorImportHelpText, appName, version, releaseDate, releaseHash),
    );
    Deno.exit(0);
  }
  if (app.license) {
    console.log(licenseText);
    Deno.exit(0);
  }

  if (app.version) {
    console.log(`${appName} ${version} ${releaseDate} ${releaseHash}`);
    Deno.exit(0);
  }
  if (args.length === 0) {
    console.error(`USAGE: ${appName} ROR_DUMP_ZIP_FILE`);
    Deno.exit(1);
  }
  let zipFilename: string = "";
  args[0] === undefined || args[0] === "" ? "" : zipFilename = `${args[0]}`;
  const jsonSrc: string | undefined = await retrieveTextFromZipFile(
    zipFilename,
    /-data\.json$/,
  );
  if (jsonSrc === undefined) {
    Deno.exit(1);
  } else {
    Deno.exit(await processJSONDump(jsonSrc));
  }
}

if (import.meta.main) await main();
