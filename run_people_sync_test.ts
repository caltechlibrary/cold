/**
 * run_people_sync_test.ts tests the shim run_people_sync.bash: the report
 * runner hands it the request's id and trigger in COLD_REQUEST_ID and
 * COLD_TRIGGER (plan Phase 5 decision 2), and it must turn them into the
 * wrapper's --request-id and --trigger. The shim runs from a scratch copy with
 * a fake ./bin/people_sync that prints the arguments it was given.
 *
 * Run:
 *   deno test --allow-read --allow-write --allow-run --allow-env run_people_sync_test.ts
 */

import { assertEquals } from "@std/assert";
import * as path from "@std/path";

const SHIM = path.fromFileUrl(
  new URL("./run_people_sync.bash", import.meta.url),
);

/**
 * runShim runs a scratch copy of the shim with a fake wrapper and returns the
 * arguments the wrapper received, one per element.
 *
 * @param env {Record<string, string>} the environment the shim runs with
 * @param args {string[]} the shim's own arguments
 * @returns {Promise<string[]>} the wrapper's arguments
 * @example
 * const got = await runShim({ COLD_TRIGGER: "human" }, []);
 */
async function runShim(
  env: Record<string, string>,
  args: string[],
): Promise<string[]> {
  const dir = await Deno.makeTempDir({ prefix: "shim_" });
  await Deno.copyFile(SHIM, path.join(dir, "run_people_sync.bash"));
  await Deno.mkdir(path.join(dir, "bin"));
  await Deno.writeTextFile(
    path.join(dir, "bin", "people_sync"),
    `#!/bin/bash\nfor a in "$@"; do printf '%s\\n' "$a"; done\n`,
    { mode: 0o755 },
  );
  const r = await new Deno.Command("bash", {
    args: [path.join(dir, "run_people_sync.bash"), ...args],
    env,
    clearEnv: true,
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertEquals(r.code, 0, new TextDecoder().decode(r.stderr));
  return new TextDecoder().decode(r.stdout).split("\n").filter((s) => s);
}

/** value returns the argument after a flag. */
function value(got: string[], flag: string): string | undefined {
  const i = got.indexOf(flag);
  return i < 0 ? undefined : got[i + 1];
}

Deno.test("shim: the runner's request id and trigger reach the wrapper", async () => {
  const got = await runShim(
    { COLD_REQUEST_ID: "req-9", COLD_TRIGGER: "human" },
    [],
  );
  assertEquals(value(got, "--request-id"), "req-9");
  assertEquals(value(got, "--trigger"), "human");
});

Deno.test("shim: PEOPLE_SYNC_TRIGGER, set by hand, wins over the runner's", async () => {
  const got = await runShim(
    { COLD_TRIGGER: "human", PEOPLE_SYNC_TRIGGER: "cron" },
    [],
  );
  assertEquals(value(got, "--trigger"), "cron");
});

Deno.test("shim: with nothing set the trigger is unknown and no request id is passed", async () => {
  const got = await runShim({}, []);
  assertEquals(value(got, "--trigger"), "unknown");
  assertEquals(got.includes("--request-id"), false);
});

Deno.test("shim: a clpid argument becomes --scope", async () => {
  const got = await runShim({ COLD_TRIGGER: "human" }, ["Doe-Jane"]);
  assertEquals(value(got, "--scope"), "Doe-Jane");
});
