/**
 * ror_import_quick_test.ts - Quick manual test for ror_import.ts refactoring
 * 
 * This is a simple script to manually test the JSONL transformation logic
 * without requiring file system permissions.
 * 
 * Run with: deno run ror_import_quick_test.ts
 */

/**
 * Converts a single ROR object to JSONL line format for dataset load.
 * Copied from ror_import.ts
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

// Sample ROR data (similar to what's in actual ROR dumps)
const sampleRORData = [
  {
    id: "https://ror.org/05dxps055",
    name: "California Institute of Technology",
    type: "Education",
    acronyms: ["Caltech"],
    country: { name: "United States", code: "US" },
  },
  {
    id: "https://ror.org/001a4v883",
    name: "National Science Foundation",
    type: "Facility",
    acronyms: ["NSF"],
    country: { name: "United States", code: "US" },
  },
  {
    id: "https://ror.org/05k534s08",
    name: "Massachusetts Institute of Technology",
    type: "Education",
    acronyms: ["MIT"],
    country: { name: "United States", code: "US" },
  },
];

console.log("Testing JSONL transformation for dataset load...\n");
console.log("Sample ROR data:");
console.log(JSON.stringify(sampleRORData, null, 2));

console.log("\n\nTransformed to JSONL format:");
const jsonl = convertRORToJSONL(sampleRORData);
console.log(jsonl);

console.log("Verification:");
const lines = jsonl.trim().split("\n");
console.log(`- Total lines: ${lines.length}`);

for (let i = 0; i < lines.length; i++) {
  const line = JSON.parse(lines[i]);
  console.log(`- Line ${i + 1}: key="${line.key}", name="${line.object.name}"`);
}

console.log("\n✅ Transformation successful!");
console.log("\nThis JSONL can be piped to: dataset load -overwrite ror.ds");
