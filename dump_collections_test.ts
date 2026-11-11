/**
 * dump_collections_test.ts
 *
 * Tests for dump_collections.bash: a failed dump must never exit 0, never
 * leave a partial .jsonl behind, and never be archived as if it were good.
 * A fake `dataset` (and, for one case, a fake `zip`) is put first on PATH so
 * each failure can be produced on demand.
 *
 * Run:
 *   deno test --allow-read --allow-write --allow-run --allow-env dump_collections_test.ts
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import * as path from "@std/path";

const SCRIPT = path.fromFileUrl(
  new URL("./dump_collections.bash", import.meta.url),
);

/** Fixture is a scratch working directory and the fake tools' directory. */
interface Fixture {
  work: string;
  bin: string;
}

/**
 * makeFixture builds a working directory holding the named `.ds` directories
 * and a bin directory with a fake `dataset`. The fake prints one JSON line for
 * a collection, but prints half a line and exits 1 when the name contains
 * "bad", mimicking `dataset dump` failing part way.
 *
 * @param collections {string[]} collection names, such as "people.ds"
 * @returns {Promise<Fixture>} the two directories
 * @example
 * const fx = await makeFixture(["people.ds", "bad.ds"]);
 */
async function makeFixture(collections: string[]): Promise<Fixture> {
  const work = await Deno.makeTempDir({ prefix: "dump_work_" });
  const bin = await Deno.makeTempDir({ prefix: "dump_bin_" });
  for (const c of collections) await Deno.mkdir(path.join(work, c));
  await Deno.writeTextFile(
    path.join(bin, "dataset"),
    `#!/bin/bash
# fake dataset: only "dump NAME.ds" is supported
if [ "$1" != "dump" ]; then exit 2; fi
case "$2" in
  *bad*) printf '{"half":'; exit 1 ;;
esac
printf '{"collection":"%s"}\\n' "$2"
`,
    { mode: 0o755 },
  );
  return { work, bin };
}

/**
 * runDump runs the script in the fixture's working directory with the fake
 * tools first on PATH.
 *
 * @param fx {Fixture} the fixture
 * @param args {string[]} command-line arguments for the script
 * @returns {Promise<{code: number, out: string, err: string}>} exit code and output
 * @example
 * const r = await runDump(fx, []);
 */
async function runDump(fx: Fixture, args: string[] = []) {
  const r = await new Deno.Command("bash", {
    args: [SCRIPT, ...args],
    cwd: fx.work,
    env: { PATH: `${fx.bin}:${Deno.env.get("PATH")}` },
    stdout: "piped",
    stderr: "piped",
  }).output();
  return {
    code: r.code,
    out: new TextDecoder().decode(r.stdout),
    err: new TextDecoder().decode(r.stderr),
  };
}

/** exists reports whether a path exists. */
async function exists(p: string): Promise<boolean> {
  try {
    await Deno.stat(p);
    return true;
  } catch {
    return false;
  }
}

/** zipMembers lists the member names of an archive. */
async function zipMembers(zip: string): Promise<string[]> {
  const r = await new Deno.Command("unzip", {
    args: ["-Z1", zip],
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertEquals(r.code, 0);
  return new TextDecoder().decode(r.stdout).split("\n").filter((s) => s)
    .sort();
}

Deno.test("every dump succeeds: exit 0, jsonl and a zip of exactly those", async () => {
  const fx = await makeFixture(["people.ds", "groups.ds"]);
  const r = await runDump(fx);
  assertEquals(r.code, 0, r.err);
  assertEquals(
    await zipMembers(path.join(fx.work, "cold_collections.zip")),
    ["groups.jsonl", "people.jsonl"],
  );
  assertStringIncludes(r.out, "2 dumped");
  assertStringIncludes(r.out, "0 failed");
});

Deno.test("a failed dump exits 74, leaves no partial jsonl and no zip", async () => {
  const fx = await makeFixture(["people.ds", "bad.ds", "groups.ds"]);
  const r = await runDump(fx);
  assertEquals(r.code, 74);
  assertEquals(await exists(path.join(fx.work, "bad.jsonl")), false);
  assertEquals(
    await exists(path.join(fx.work, "cold_collections.zip")),
    false,
  );
  // the good dumps are still on disk
  assert(await exists(path.join(fx.work, "people.jsonl")));
  assert(await exists(path.join(fx.work, "groups.jsonl")));
  // everything was processed, counts printed, the failure named on stderr
  assertStringIncludes(r.out, "2 dumped");
  assertStringIncludes(r.out, "1 failed");
  assertStringIncludes(r.err, "bad.ds");
  // no temporary files left behind
  const left = [...Deno.readDirSync(fx.work)].map((e) => e.name).filter((n) =>
    n.includes(".tmp")
  );
  assertEquals(left, []);
});

Deno.test("a stale jsonl from an earlier run is not archived", async () => {
  const fx = await makeFixture(["people.ds"]);
  await Deno.writeTextFile(path.join(fx.work, "gone.jsonl"), "stale\n");
  const r = await runDump(fx);
  assertEquals(r.code, 0, r.err);
  assertEquals(
    await zipMembers(path.join(fx.work, "cold_collections.zip")),
    ["people.jsonl"],
  );
});

Deno.test("an existing archive is replaced, not updated in place", async () => {
  const fx = await makeFixture(["people.ds"]);
  // an earlier archive that holds a member this run will not produce
  await Deno.writeTextFile(path.join(fx.work, "old.jsonl"), "old\n");
  const z = await new Deno.Command("zip", {
    args: ["-q", "cold_collections.zip", "old.jsonl"],
    cwd: fx.work,
  }).output();
  assertEquals(z.code, 0);
  await Deno.remove(path.join(fx.work, "old.jsonl"));
  const r = await runDump(fx);
  assertEquals(r.code, 0, r.err);
  assertEquals(
    await zipMembers(path.join(fx.work, "cold_collections.zip")),
    ["people.jsonl"],
  );
});

Deno.test("a failed dump keeps an earlier good archive untouched", async () => {
  const fx = await makeFixture(["bad.ds"]);
  await Deno.writeTextFile(path.join(fx.work, "cold_collections.zip"), "keep");
  const r = await runDump(fx);
  assertEquals(r.code, 74);
  assertEquals(
    await Deno.readTextFile(path.join(fx.work, "cold_collections.zip")),
    "keep",
  );
});

Deno.test("a zip that fails exits 74 and leaves no archive and no temp file", async () => {
  const fx = await makeFixture(["people.ds"]);
  await Deno.writeTextFile(
    path.join(fx.bin, "zip"),
    `#!/bin/bash\necho "zip: boom" >&2\nexit 1\n`,
    { mode: 0o755 },
  );
  const r = await runDump(fx);
  assertEquals(r.code, 74);
  assertEquals(
    await exists(path.join(fx.work, "cold_collections.zip")),
    false,
  );
  const left = [...Deno.readDirSync(fx.work)].map((e) => e.name).filter((n) =>
    n.includes(".tmp") || n.startsWith("tmp.")
  );
  assertEquals(left, []);
});

Deno.test("a surplus argument is a usage error (exit 2), nothing attempted", async () => {
  const fx = await makeFixture(["people.ds"]);
  const r = await runDump(fx, ["extra"]);
  assertEquals(r.code, 2);
  assertEquals(await exists(path.join(fx.work, "people.jsonl")), false);
});

Deno.test("no collections is not a failure: exit 0, no archive", async () => {
  const fx = await makeFixture([]);
  const r = await runDump(fx);
  assertEquals(r.code, 0, r.err);
  assertEquals(
    await exists(path.join(fx.work, "cold_collections.zip")),
    false,
  );
  assertStringIncludes(r.out, "0 dumped");
});
