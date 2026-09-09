/**
 * xlsx_writer.ts provides a minimal single-sheet XLSX (Office Open XML
 * spreadsheet) writer.
 *
 * An XLSX file is a zip archive of a handful of small XML parts. Rather
 * than pull in a full spreadsheet library, this builds just enough of
 * that structure using @zip-js/zip-js, which is already a project
 * dependency (see deno.json). Cells are written as inline strings, which
 * avoids needing a shared-strings table for a document this simple.
 */
import { BlobWriter, TextReader, ZipWriter } from "@zip-js/zip-js";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

// cellXfs index 0 is the default style; index 1 applies a bold font,
// used for the header row.
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="1"><fill><patternFill patternType="none"/></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" xfId="0"/><xf numFmtId="0" fontId="1" xfId="0" applyFont="1"/></cellXfs>
</styleSheet>`;

/** escapeXml escapes the characters XML requires for text content and attribute values. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** columnLetter converts a zero-based column index to a spreadsheet column letter (0 -> A, 25 -> Z, 26 -> AA, ...). */
export function columnLetter(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function workbookXml(sheetName: string): string {
  // Excel sheet names are limited to 31 characters.
  const safeName = sheetName.slice(0, 31);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escapeXml(safeName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

function worksheetXml(rows: string[][], columnWidth: number): string {
  const colCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const cols = colCount > 0
    ? `<cols><col min="1" max="${colCount}" width="${columnWidth}" customWidth="1"/></cols>`
    : "";
  const sheetRows = rows.map((row, rowIndex) => {
    const r = rowIndex + 1;
    const style = rowIndex === 0 ? ` s="1"` : "";
    const cells = row.map((value, colIndex) => {
      const cellRef = `${columnLetter(colIndex)}${r}`;
      return `<c r="${cellRef}" t="inlineStr"${style}><is><t xml:space="preserve">${
        escapeXml(value)
      }</t></is></c>`;
    }).join("");
    return `<row r="${r}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${cols}
<sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

/**
 * writeXlsx builds a minimal single-sheet XLSX workbook from a grid of
 * string cells. The first row is treated as a header and rendered bold.
 */
export async function writeXlsx(
  rows: string[][],
  options: { sheetName?: string; columnWidth?: number } = {},
): Promise<Uint8Array> {
  const sheetName = options.sheetName ?? "Sheet1";
  const columnWidth = options.columnWidth ?? 20;

  const zipWriter = new ZipWriter(new BlobWriter("application/zip"));
  await zipWriter.add("[Content_Types].xml", new TextReader(CONTENT_TYPES));
  await zipWriter.add("_rels/.rels", new TextReader(ROOT_RELS));
  await zipWriter.add(
    "xl/workbook.xml",
    new TextReader(workbookXml(sheetName)),
  );
  await zipWriter.add(
    "xl/_rels/workbook.xml.rels",
    new TextReader(WORKBOOK_RELS),
  );
  await zipWriter.add("xl/styles.xml", new TextReader(STYLES));
  await zipWriter.add(
    "xl/worksheets/sheet1.xml",
    new TextReader(worksheetXml(rows, columnWidth)),
  );
  const blob = await zipWriter.close();
  return new Uint8Array(await blob.arrayBuffer());
}
