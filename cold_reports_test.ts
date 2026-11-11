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
import {
  Inputs,
  Report,
  reportEnv,
  Runnable,
  runRequest,
} from "./cold_reports.ts";

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

// ---- the request id and trigger reach the report command (plan, Phase 5 decision 2) ----

/**
 * makeEnvEchoScript writes an executable script that prints the request id,
 * the trigger and the recipient list it was given in its environment, as
 * "ID=...;TRIGGER=...;EMAILS=...".
 */
async function makeEnvEchoScript(): Promise<string> {
  const dir = await Deno.makeTempDir();
  const scriptPath = `${dir}/env_echo.bash`;
  await Deno.writeTextFile(
    scriptPath,
    `#!/usr/bin/env bash\nprintf 'ID=%s;TRIGGER=%s;EMAILS=%s' "$COLD_REQUEST_ID" "$COLD_TRIGGER" "$EMAILS"\n`,
  );
  await Deno.chmod(scriptPath, 0o755);
  return scriptPath;
}

/** echoRunnable builds a text report over the env echo script. */
async function echoRunnable(
  name: string,
  withInput: boolean,
): Promise<Runnable> {
  const scriptPath = await makeEnvEchoScript();
  const inputs: Inputs[] = [];
  if (withInput) {
    const input = new Inputs();
    input.id = "value";
    input.type = "text";
    input.required = true;
    input.value = "unused";
    inputs.push(input);
  }
  return new Runnable(name, scriptPath, name, inputs, false, "text/plain");
}

async function readAndRemove(link: string): Promise<string> {
  const path = `./htdocs/${link}`;
  try {
    return await Deno.readTextFile(path);
  } finally {
    await Deno.remove(path).catch(() => {});
  }
}

Deno.test("Runnable.run() passes per-request values to a report with inputs (the one-person rerun)", async () => {
  const runnable = await echoRunnable("test_env_with_inputs", true);
  const link = await runnable.run([], {
    COLD_REQUEST_ID: "req-1",
    COLD_TRIGGER: "human",
  });
  assertEquals(await readAndRemove(link), "ID=req-1;TRIGGER=human;EMAILS=");
});

Deno.test("Runnable.run() passes per-request values to a report without inputs (the full sync)", async () => {
  const runnable = await echoRunnable("test_env_no_inputs", false);
  const link = await runnable.run([], {
    COLD_REQUEST_ID: "req-2",
    COLD_TRIGGER: "cron",
    EMAILS: "a@example.test",
  });
  assertEquals(
    await readAndRemove(link),
    "ID=req-2;TRIGGER=cron;EMAILS=a@example.test",
  );
});

Deno.test("Runnable.run() without overrides leaves those variables unset, not stale", async () => {
  const runnable = await echoRunnable("test_env_none", true);
  const link = await runnable.run([]);
  assertEquals(await readAndRemove(link), "ID=;TRIGGER=;EMAILS=");
});

Deno.test("reportEnv: the request's id and trigger and its validated recipients", () => {
  const r = new Report("cold_reports.yaml");
  r.id = "0d9b3a52-1111-5222-8333-444455556666";
  r.trigger = "human";
  r.emails = "";
  assertEquals(reportEnv(r, "x@example.test"), {
    EMAILS: "x@example.test",
    COLD_REQUEST_ID: "0d9b3a52-1111-5222-8333-444455556666",
    COLD_TRIGGER: "human",
  });
});

Deno.test("reportEnv: a request stored before triggers existed is 'unknown', never guessed", () => {
  const stored = { id: "old-1" } as unknown as Report;
  assertEquals(reportEnv(stored, "").COLD_TRIGGER, "unknown");
  assertEquals(reportEnv(stored, "").COLD_REQUEST_ID, "old-1");
});

Deno.test("runRequest: the command sees the request's own id and trigger", async () => {
  const runnable = await echoRunnable("test_run_request", false);
  const r = new Report("cold_reports.yaml");
  r.id = "req-3";
  r.trigger = "human";
  const link = await runRequest(runnable, r);
  assertEquals(await readAndRemove(link), "ID=req-3;TRIGGER=human;EMAILS=");
});

Deno.test("runRequest: the validated recipient list still reaches the command", async () => {
  const runnable = await echoRunnable("test_run_request_emails", false);
  const r = new Report("cold_reports.yaml");
  r.id = "req-4";
  r.trigger = "cron";
  r.emails = "a@example.test, b@example.test";
  const link = await runRequest(runnable, r);
  assertEquals(
    await readAndRemove(link),
    "ID=req-4;TRIGGER=cron;EMAILS=a@example.test, b@example.test",
  );
});

Deno.test("request_report: a bare request is a cron request; the page's is human; anything else is unknown", async () => {
  const bare = new Report("cold_reports.yaml");
  assertEquals(
    await bare.request_report({ report_name: "run_people_sync" }),
    true,
  );
  assertEquals(bare.trigger, "cron");
  const human = new Report("cold_reports.yaml");
  await human.request_report({
    report_name: "run_people_sync",
    trigger: "human",
  });
  assertEquals(human.trigger, "human");
  const cron = new Report("cold_reports.yaml");
  await cron.request_report({
    report_name: "run_people_sync",
    trigger: "cron",
  });
  assertEquals(cron.trigger, "cron");
  for (const bad of ["root", "", "HUMAN", "human; rm -rf /", "a\nb"]) {
    const r = new Report("cold_reports.yaml");
    await r.request_report({ report_name: "run_people_sync", trigger: bad });
    assertEquals(r.trigger, "unknown", JSON.stringify(bad));
  }
});

Deno.test("request_report: the trigger is stored with the request, so the runner can read it back", async () => {
  const r = new Report("cold_reports.yaml");
  await r.request_report({ report_name: "run_people_sync", trigger: "human" });
  assertEquals((r.asObject() as { trigger: string }).trigger, "human");
});
