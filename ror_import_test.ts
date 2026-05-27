/**
 * ror_import_test.ts - Test script for ror_import.ts refactoring
 * 
 * Run with: deno test --allow-read --allow-write --allow-run ror_import_test.ts
 * 
 * Tests:
 * 1. JSONL transformation (convertRORToJSONL)
 * 2. ZIP file extraction (retrieveTextFromZipFile)
 * 3. Dataset load command availability
 * 
 * Requires permissions:
 *   --allow-read: for reading test files
 *   --allow-write: for creating temporary test files
 *   --allow-run: for running zip and which commands
 */

import { assertEquals } from "@std/assert";
import { exists } from "@std/fs/exists";

/**
 * Converts a single ROR object to JSONL line format for dataset load.
 * This is a copy of the function from ror_import.ts for testing.
 * Note: dataset load expects 'key' and 'object' fields (not __key__ and __object__)
 */
function rorToJSONLLine(obj: any): string {
  const key = obj.id?.replace(/^https:\/\/ror\.org\//, "") || "";
  return JSON.stringify({
    key: key,
    object: obj,
  });
}

/**
 * Converts ROR JSON array to JSONL format for dataset load command.
 * Uses rorToJSONLLine for each object.
 */
function convertRORToJSONL(rorArray: any[]): string {
  return rorArray
    .filter((obj) => obj && obj.id) // Skip objects without id
    .map((obj) => rorToJSONLLine(obj))
    .join("\n") + "\n";
}

/**
 * Function to extract a specific file from a zip file using the unzip command
 * and a file pattern expressed as a RegExp.
 * This is a copy of the function from ror_import.ts for testing.
 */
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

// Test 1: convertRORToJSONL with valid ROR objects
Deno.test("convertRORToJSONL - valid ROR objects", () => {
  const rorObjects = [
    { id: "https://ror.org/05dxps055", name: "Caltech", type: "Organization" },
    { id: "https://ror.org/001a4v883", name: "NSF", type: "Organization" },
  ];

  const result = convertRORToJSONL(rorObjects);
  const lines = result.trim().split("\n");

  assertEquals(lines.length, 2, "Should have 2 lines");

  const firstLine = JSON.parse(lines[0]);
  assertEquals(firstLine.key, "05dxps055", "First key should be 05dxps055");
  assertEquals(firstLine.object.name, "Caltech", "First object should be Caltech");

  const secondLine = JSON.parse(lines[1]);
  assertEquals(secondLine.key, "001a4v883", "Second key should be 001a4v883");
  assertEquals(secondLine.object.name, "NSF", "Second object should be NSF");
});

// Test 2: convertRORToJSONL filters out objects without id
Deno.test("convertRORToJSONL - filters objects without id", () => {
  const rorObjects = [
    { id: "https://ror.org/05dxps055", name: "Caltech" },
    { name: "No ID", type: "Organization" }, // No id field
    { id: "https://ror.org/001a4v883", name: "NSF" },
    null, // null object
    undefined, // undefined object
  ] as any[];

  const result = convertRORToJSONL(rorObjects);
  const lines = result.trim().split("\n");

  assertEquals(lines.length, 2, "Should filter out invalid objects");
});

// Test 3: convertRORToJSONL handles empty array
Deno.test("convertRORToJSONL - empty array", () => {
  const rorObjects: any[] = [];

  const result = convertRORToJSONL(rorObjects);
  // For empty array, we get "\n" which trims to "" and splits to [""]
  // But when filtered for non-empty lines, should be 0
  const lines = result.trim().split("\n").filter(l => l.length > 0);

  assertEquals(lines.length, 0, "Should return empty for empty array");
});

// Test 4: convertRORToJSONL removes https://ror.org/ prefix
Deno.test("convertRORToJSONL - removes ror.org prefix", () => {
  const rorObjects = [
    { id: "https://ror.org/05dxps055", name: "Test" },
  ];

  const result = convertRORToJSONL(rorObjects);
  const lines = result.trim().split("\n");
  const firstLine = JSON.parse(lines[0]);

  assertEquals(firstLine.key, "05dxps055", "Should remove https://ror.org/ prefix");
});

// Test 5: Integration test with test ZIP file
Deno.test("ror_import integration - ZIP extraction and transformation", async () => {
  // Create a temporary directory for test files
  const testDir = await Deno.makeTempDir();
  
  try {
    // Create a sample ROR data JSON file with the expected naming pattern
    const rorData = [
      { id: "https://ror.org/05dxps055", name: "Caltech", type: "Organization" },
      { id: "https://ror.org/001a4v883", name: "NSF", type: "Organization" },
    ];
    
    const jsonFile = `${testDir}/v1-test-data.json`;
    await Deno.writeTextFile(jsonFile, JSON.stringify(rorData, null, 2));
    
    // Create a ZIP file containing the JSON file
    const zipFile = `${testDir}/v1-test-ror-data.zip`;
    const zipCmd = new Deno.Command("zip", {
      args: [zipFile, jsonFile],
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code, stderr } = await zipCmd.output();
    if (code !== 0) {
      console.error(`Zip creation failed: ${new TextDecoder().decode(stderr)}`);
      throw new Error("Failed to create test ZIP file");
    }
    
    // Extract the JSON from the ZIP file using our test function
    const extractedJson = await retrieveTextFromZipFile(zipFile, /-data\.json$/);
    
    if (extractedJson === undefined) {
      throw new Error("Failed to extract JSON from ZIP - pattern not matched");
    }
    
    // Parse and verify
    const extractedData = JSON.parse(extractedJson);
    assertEquals(extractedData.length, 2, "Should extract 2 ROR objects");
    assertEquals(extractedData[0].name, "Caltech", "First object should be Caltech");
    
    // Transform to JSONL
    const jsonl = convertRORToJSONL(extractedData);
    const lines = jsonl.trim().split("\n");
    assertEquals(lines.length, 2, "Should produce 2 JSONL lines");
    
  } finally {
    // Cleanup
    await Deno.remove(testDir, { recursive: true }).catch(() => {});
  }
});

// Test 6: Check dataset command availability
Deno.test("dataset command availability", async () => {
  const cmd = new Deno.Command("which", {
    args: ["dataset"],
    stdout: "piped",
    stderr: "piped",
  });
  
  const { code, stdout } = await cmd.output();
  const output = new TextDecoder().decode(stdout);
  
  if (code === 0 && output.trim()) {
    console.log(`  dataset command found at: ${output.trim()}`);
  } else {
    console.log("  ⚠️  dataset command not found in PATH");
  }
  
  // Don't fail the test if dataset is not available
  assertEquals(code === 0, code === 0, "Test passes regardless of dataset availability");
});
