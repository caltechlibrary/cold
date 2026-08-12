/**
 * cold_reports_test.ts
 *
 * Regression test for issue #106: Runnable.run() must preserve binary
 * report output (e.g. XLSX) byte-for-byte. Prior to the fix, stdout was
 * decoded as UTF-8 text and re-encoded before being written to disk,
 * which silently corrupts any output that isn't valid UTF-8.
 *
 * Run:
 *   deno test --allow-run --allow-read --allow-write cold_reports_test.ts
 */

import { assertEquals } from "@std/assert";
import { Inputs, Runnable } from "./cold_reports.ts";

/**
 * makeBinaryEchoScript writes a small executable script that emits
 * invalid-UTF-8 lead bytes (0xFF 0xFE) followed by ASCII text built from
 * its first argument, mimicking a report command that produces binary
 * (e.g. XLSX/zip) output.
 */
async function makeBinaryEchoScript(): Promise<string> {
  const dir = await Deno.makeTempDir();
  const scriptPath = `${dir}/binary_echo.bash`;
  await Deno.writeTextFile(
    scriptPath,
    `#!/usr/bin/env bash\nprintf '\\xFF\\xFEHELLO-%s' "$1"\n`,
  );
  await Deno.chmod(scriptPath, 0o755);
  return scriptPath;
}

Deno.test("Runnable.run() still writes plain-text stdout correctly (CSV reports)", async () => {
  const dir = await Deno.makeTempDir();
  const scriptPath = `${dir}/text_echo.bash`;
  await Deno.writeTextFile(
    scriptPath,
    `#!/usr/bin/env bash\nprintf 'a,b,c\\n1,2,3\\n'\n`,
  );
  await Deno.chmod(scriptPath, 0o755);

  const input = new Inputs();
  input.id = "value";
  input.type = "text";
  input.required = true;
  input.value = "unused";

  const runnable = new Runnable(
    "test_text_report",
    scriptPath,
    "test_text_output",
    [input],
    false,
    "text/csv",
  );

  const outputPath = "./htdocs/rpt/test_text_output.csv";
  try {
    const link = await runnable.run([]);
    assertEquals(link, "rpt/test_text_output.csv");

    const written = await Deno.readTextFile(outputPath);
    assertEquals(written, "a,b,c\n1,2,3\n");
  } finally {
    await Deno.remove(outputPath).catch(() => {});
  }
});

Deno.test("Runnable.run() preserves binary stdout bytes exactly (issue #106)", async () => {
  const scriptPath = await makeBinaryEchoScript();

  const input = new Inputs();
  input.id = "value";
  input.type = "text";
  input.required = true;
  input.value = "world";

  const runnable = new Runnable(
    "test_binary_report",
    scriptPath,
    "test_binary_output",
    [input],
    false,
    "application/vnd.ms-excel",
  );

  const outputPath = "./htdocs/rpt/test_binary_output.xlsx";
  try {
    const link = await runnable.run([]);
    assertEquals(link, "rpt/test_binary_output.xlsx");

    const written = await Deno.readFile(outputPath);
    const expected = new Uint8Array([
      0xff,
      0xfe,
      ...new TextEncoder().encode("HELLO-world"),
    ]);
    assertEquals(written, expected);
  } finally {
    await Deno.remove(outputPath).catch(() => {});
  }
});
