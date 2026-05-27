/**
 * ror_import.ts processes a ROR dump retrieved from Zenodo, updating the ror.ds dataset collection.
 * Uses the dataset load command with JSONL format instead of the web API.
 */

import { parseArgs } from "@std/cli/parse-args";
import { exists } from "@std/fs/exists";
import ProgressBar from "@deno-library/progress";

import { licenseText, releaseDate, releaseHash, version } from "./version.ts";
import { fmtHelp, rorImportHelpText } from "./helptext.ts";

const cName = "ror.ds";

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

/**
 * Converts a single ROR object to JSONL line format for dataset load.
 * Format: {"key": "ror-id", "object": {...ror-data...}}
 * The key is derived from the object's id field with the https://ror.org/ prefix removed.
 * Note: dataset load expects 'key' and 'object' fields (not __key__ and __object__)
 */
function rorToJSONLLine(obj: any): string {
  const key = obj.id?.replace(/^https:\/\/ror\.org\//, "") || "";
  return JSON.stringify({
    key: key,
    object: obj,
  });
}

async function processJSONDump(src: string): Promise<number> {
  const rorObjects: any[] = JSON.parse(src);
  console.log(`${rorObjects.length} ROR objects to process.`);

  if (rorObjects.length === 0) {
    console.error("No ROR objects to process");
    return 1;
  }

  // Spawn dataset load command with overwrite flag
  // Use inherit for stdout/stderr so progress bar and dataset output are visible
  const cmd = new Deno.Command("dataset", {
    args: ["load", "-overwrite", cName],
    stdin: "piped",
    stdout: "inherit",
    stderr: "inherit",
  });

  const process = cmd.spawn();
  const writer = process.stdin.getWriter();

  // Create progress bar
  const title = "ROR Objects loaded";
  const total = rorObjects.length;
  const progress = new ProgressBar({
    title,
    total,
  });

  // Stream each ROR object as JSONL to dataset load
  let count = 0;
  for (const obj of rorObjects) {
    if (obj && obj.id) {
      const line = rorToJSONLLine(obj) + "\n";
      await writer.write(new TextEncoder().encode(line));
      await progress.render(++count);
    }
  }

  await writer.close();

  const { code } = await process.output();

  if (code !== 0) {
    console.error(`dataset load failed with exit code ${code}`);
    return 1;
  }

  console.log(`\nSuccessfully loaded ${count} ROR objects into ${cName}`);
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
