/**
 * run_people_sync_test.ts
 *
 * Tests for run_people_sync.bash, the shim the report runner, cron and a person
 * call. It has no default env file (cold DR-0037 plan, Phase 5 finding 4): a run
 * that does not say which RDM it targets must not start, and the reason must reach
 * the report runner on stderr, which turns it into the request's error message.
 * The script is copied into a scratch directory beside a fake `bin/people_sync`
 * that prints the arguments it was given.
 *
 * Run:
 *   deno test --allow-read --allow-write --allow-run --allow-env run_people_sync_test.ts
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import * as path from "@std/path";

const SCRIPT = path.fromFileUrl(
  new URL("./run_people_sync.bash", import.meta.url),
);

/** hostHasCold is true on the production host, where the shim changes to /Sites/cold. */
const hostHasCold = (() => {
  try {
    return Deno.statSync("/Sites/cold").isDirectory;
  } catch {
    return false;
  }
})();

/**
 * makeShim copies the script next to a fake program that echoes its arguments.
 *
 * @returns {Promise<string>} the scratch directory holding run_people_sync.bash and bin/people_sync
 * @example
 * const dir = await makeShim();
 */
async function makeShim(): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix: "shim_" });
  await Deno.copyFile(SCRIPT, path.join(dir, "run_people_sync.bash"));
  await Deno.chmod(path.join(dir, "run_people_sync.bash"), 0o755);
  await Deno.mkdir(path.join(dir, "bin"));
  await Deno.writeTextFile(
    path.join(dir, "bin", "people_sync"),
    `#!/bin/bash\nprintf 'ARGS:%s\\n' "$*"\n`,
    { mode: 0o755 },
  );
  return dir;
}

/**
 * runShim runs the copied shim with exactly the given environment.
 *
 * @param dir {string} the directory makeShim made
 * @param env {Record<string, string>} the whole environment (nothing is inherited)
 * @param args {string[]} the shim's arguments
 * @returns {Promise<{code: number, out: string, err: string}>} exit code and output
 * @example
 * const r = await runShim(dir, { PEOPLE_SYNC_ENV: "x.env" }, ["Doe-Jane"]);
 */
async function runShim(
  dir: string,
  env: Record<string, string>,
  args: string[] = [],
) {
  const out = await new Deno.Command("/bin/bash", {
    args: [path.join(dir, "run_people_sync.bash"), ...args],
    env: { PATH: "/usr/bin:/bin", ...env },
    clearEnv: true,
    stdout: "piped",
    stderr: "piped",
  }).output();
  return {
    code: out.code,
    out: new TextDecoder().decode(out.stdout),
    err: new TextDecoder().decode(out.stderr),
  };
}

Deno.test({
  name:
    "shim: with PEOPLE_SYNC_ENV unset it exits 78, names the setting, and runs nothing",
  ignore: hostHasCold,
  fn: async () => {
    const dir = await makeShim();
    const r = await runShim(dir, {});
    assertEquals(r.code, 78);
    assertStringIncludes(r.err, "PEOPLE_SYNC_ENV");
    assertEquals(r.out, "");
  },
});

Deno.test({
  name: "shim: an empty PEOPLE_SYNC_ENV is the same as unset",
  ignore: hostHasCold,
  fn: async () => {
    const dir = await makeShim();
    const r = await runShim(dir, { PEOPLE_SYNC_ENV: "" });
    assertEquals(r.code, 78);
    assertEquals(r.out, "");
  },
});

Deno.test({
  name: "shim: the message says what to set and that there is no default",
  ignore: hostHasCold,
  fn: async () => {
    const r = await runShim(await makeShim(), {});
    assertStringIncludes(r.err.toLowerCase(), "no default");
    assertStringIncludes(r.err, "caltechauthors.env");
  },
});

Deno.test({
  name:
    "shim: with the setting present the program gets that env file, the trigger and the request id",
  ignore: hostHasCold,
  fn: async () => {
    const r = await runShim(
      await makeShim(),
      {
        PEOPLE_SYNC_ENV: "people_sync_dev.env",
        COLD_TRIGGER: "human",
        COLD_REQUEST_ID: "q7",
      },
      ["Doe-Jane"],
    );
    assertEquals(r.code, 0);
    assertStringIncludes(r.out, "--env people_sync_dev.env");
    assertStringIncludes(r.out, "--trigger human");
    assertStringIncludes(r.out, "--request-id q7");
    assertStringIncludes(r.out, "--scope Doe-Jane");
  },
});
