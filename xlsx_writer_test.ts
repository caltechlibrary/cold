/**
 * xlsx_writer_test.ts
 *
 * Unit tests for xlsx_writer.ts. Verifies the generated archive is a
 * valid zip, contains the expected OOXML parts, and round-trips cell
 * content and header styling correctly, by reading the written archive
 * back with zip-js.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { TextWriter, Uint8ArrayReader, ZipReader } from "@zip-js/zip-js";
import { columnLetter, writeXlsx } from "./xlsx_writer.ts";

Deno.test("columnLetter converts zero-based index to spreadsheet column letters", () => {
  assertEquals(columnLetter(0), "A");
  assertEquals(columnLetter(25), "Z");
  assertEquals(columnLetter(26), "AA");
  assertEquals(columnLetter(27), "AB");
  assertEquals(columnLetter(51), "AZ");
  assertEquals(columnLetter(52), "BA");
});

async function readEntry(
  bytes: Uint8Array,
  filename: string,
): Promise<string | undefined> {
  const zipReader = new ZipReader(new Uint8ArrayReader(bytes));
  const entries = await zipReader.getEntries();
  const entry = entries.find((e) => e.filename === filename);
  const text = entry && !entry.directory
    ? await entry.getData!(new TextWriter())
    : undefined;
  await zipReader.close();
  return text;
}

Deno.test("writeXlsx produces a valid zip archive (PK magic bytes)", async () => {
  const bytes = await writeXlsx([["a", "b"], ["1", "2"]]);
  assertEquals(bytes[0], 0x50); // 'P'
  assertEquals(bytes[1], 0x4b); // 'K'
});

Deno.test("writeXlsx writes cell values as inline strings", async () => {
  const bytes = await writeXlsx([
    ["Name:", "Organizational Affiliation"],
    ["Doiel, R. S.", "Caltech Library"],
  ]);
  const sheet = await readEntry(bytes, "xl/worksheets/sheet1.xml");
  assertStringIncludes(sheet ?? "", "<t xml:space=\"preserve\">Name:</t>");
  assertStringIncludes(
    sheet ?? "",
    "<t xml:space=\"preserve\">Doiel, R. S.</t>",
  );
  assertStringIncludes(
    sheet ?? "",
    "<t xml:space=\"preserve\">Caltech Library</t>",
  );
});

Deno.test("writeXlsx bolds only the header row", async () => {
  const bytes = await writeXlsx([["Header"], ["Data"]]);
  const sheet = await readEntry(bytes, "xl/worksheets/sheet1.xml");
  assertStringIncludes(sheet ?? "", '<c r="A1" t="inlineStr" s="1">');
  assertStringIncludes(sheet ?? "", '<c r="A2" t="inlineStr">');
});

Deno.test("writeXlsx escapes XML special characters in cell values", async () => {
  const bytes = await writeXlsx([["A & B < C > D \"quoted\" 'single'"]]);
  const sheet = await readEntry(bytes, "xl/worksheets/sheet1.xml");
  assertStringIncludes(
    sheet ?? "",
    "A &amp; B &lt; C &gt; D &quot;quoted&quot; &apos;single&apos;",
  );
});

Deno.test("writeXlsx truncates sheet names to Excel's 31-character limit", async () => {
  const longName = "A".repeat(50);
  const bytes = await writeXlsx([["x"]], { sheetName: longName });
  const workbook = await readEntry(bytes, "xl/workbook.xml");
  assertStringIncludes(workbook ?? "", `name="${"A".repeat(31)}"`);
});
