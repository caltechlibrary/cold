/**
 * people_sync_test.ts tests the COLD side of the people sync (people_sync.ts):
 * configuration, the shipped program set and its hash, the ssh transport's
 * command lines, the report-to-rows rule, the lock, and the whole run with its
 * exit codes. Transport and store are replaced by fakes; one end-to-end test
 * uses fake `ssh`/`scp` programs on the PATH and a scratch datasetd.
 */
import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { join } from "@std/path";
import {
  type Config,
  type Exec,
  ExitCode,
  ITEM_OUTCOMES,
  itemsFromReport,
  loadConfig,
  loadProgram,
  Lock,
  main,
  makeTransport,
  type Program,
  PROGRAM_FILES,
  remoteRunCommand,
  type Report,
  runSync,
  shellQuote,
  SshTransport,
  SsmTransport,
  type Store,
  SyncError,
  toBase64,
  type Transport,
} from "./people_sync.ts";
import { ITEMS, RUNS, startServer } from "./people_sync_testing.ts";

const ENV = "RDM_HOST=rdm.example.test\nRDM_URL=https://authors.example.test\n";

function cfg(extra = ""): Config {
  return loadConfig(ENV + extra, "/Sites/cold");
}

async function scriptsDir(): Promise<string> {
  const root = await Deno.makeTempDir({ prefix: "people_sync_irdm_" });
  const dir = join(root, "scripts");
  await Deno.mkdir(dir);
  for (const f of PROGRAM_FILES) {
    await Deno.writeTextFile(join(dir, f), `# ${f}\n`);
  }
  await Deno.writeTextFile(join(root, "codemeta.json"), '{"version":"0.1.0"}');
  return dir;
}

function code(fn: () => unknown): Promise<number> {
  return Promise.resolve().then(fn).then(
    () => -1,
    (e) => (e instanceof SyncError ? e.code : -2),
  );
}

// ---- configuration --------------------------------------------------------

Deno.test("config: defaults, and the scripts directory is a sibling of COLD", () => {
  const c = cfg();
  assertEquals(c.mode, "dry-run");
  assertEquals(c.rdmCheckout, "/Sites/caltechauthors");
  assertEquals(c.rdmRunUser, "ubuntu");
  assertEquals(c.scriptsDir, "/Sites/irdmtools/scripts");
  assertEquals(c.apiUrl, "http://localhost:8112");
  assertEquals(
    cfg("IRDMTOOLS_SCRIPTS=/opt/x/scripts\n").scriptsDir,
    "/opt/x/scripts",
  );
});

Deno.test("config: no target refuses (66), a present but wrong file is 78", async () => {
  assertEquals(
    await code(() => loadConfig("RDM_URL=https://x.test\n", "/c")),
    ExitCode.NoInput,
  );
  assertEquals(
    await code(() => loadConfig("RDM_HOST=h\n", "/c")),
    ExitCode.NoInput,
  );
  assertEquals(
    await code(() => cfg("PEOPLE_SYNC_MODE=yes\n")),
    ExitCode.Config,
  );
  assertEquals(
    await code(() =>
      loadConfig("RDM_HOST=a b\nRDM_URL=https://x.test\n", "/c")
    ),
    ExitCode.Config,
  );
  assertEquals(
    await code(() => cfg("RDM_CHECKOUT=/a;rm -rf /\n")),
    ExitCode.Config,
  );
  assertEquals(
    await code(() => cfg("PEOPLE_SYNC_TRANSPORT=carrier-pigeon\n")),
    ExitCode.Config,
  );
  assertEquals(
    await code(() => cfg("PEOPLE_SYNC_STALE_SECONDS=0\n")),
    ExitCode.Config,
  );
});

// ---- the shipped program --------------------------------------------------

Deno.test("program: an incomplete set is refused and names what is missing", async () => {
  const dir = await scriptsDir();
  await Deno.remove(join(dir, "people_rdm_match.py"));
  const err = await assertRejects(() => loadProgram(dir), SyncError);
  assertEquals(err.code, ExitCode.NoInput);
  assertStringIncludes(err.message, "people_rdm_match.py");
});

Deno.test("program: the hash is stable and changes when any file changes", async () => {
  const dir = await scriptsDir();
  const a = await loadProgram(dir);
  assertEquals((await loadProgram(dir)).hash, a.hash);
  assertEquals(a.version, "0.1.0");
  assertEquals(a.hash.length, 64);
  for (const f of PROGRAM_FILES) {
    const before = await Deno.readTextFile(join(dir, f));
    await Deno.writeTextFile(join(dir, f), before + "# changed\n");
    assert((await loadProgram(dir)).hash !== a.hash, `${f} change not seen`);
    await Deno.writeTextFile(join(dir, f), before);
  }
  assertEquals((await loadProgram(dir)).hash, a.hash);
});

// ---- quoting and the ssh command lines -------------------------------------

Deno.test("shellQuote survives a real shell for awkward words", async () => {
  for (const w of ["plain", "it's", "a b", "$(echo hi)", "x;y", "`z`", "ü-é"]) {
    const out = await new Deno.Command("sh", {
      args: ["-c", `printf %s ${shellQuote(w)}`],
      stdout: "piped",
    }).output();
    assertEquals(new TextDecoder().decode(out.stdout), w);
  }
});

Deno.test("remoteRunCommand: sudo to the run user, login shell, in the checkout", () => {
  assertEquals(
    remoteRunCommand(cfg(), "uv run python -c 'print(1)'"),
    `sudo -n -u ubuntu bash -lc 'cd '\\''/Sites/caltechauthors'\\'' && uv run python -c '\\''print(1)'\\'''`,
  );
});

function recorder(
  answer: (
    cmd: string,
    args: string[],
  ) => { code: number; stdout?: string; stderr?: string },
) {
  const calls: {
    cmd: string;
    args: string[];
    opts?: { timeoutMs?: number };
  }[] = [];
  const exec: Exec = (cmd, args, opts) => {
    calls.push({ cmd, args, opts });
    const r = answer(cmd, args);
    return Promise.resolve({
      code: r.code,
      stdout: r.stdout ?? "",
      stderr: r.stderr ?? "",
    });
  };
  return { calls, exec };
}

const happy = (cmd: string, args: string[]) => {
  const remote = args[args.length - 1];
  if (cmd === "scp") return { code: 0 };
  if (remote.includes("cat /tmp/people_sync_out.Zz9/report.json")) {
    return { code: 0, stdout: '{"ok":1}' };
  }
  if (remote.includes("mktemp -d /tmp/people_sync_out")) {
    return { code: 0, stdout: "/tmp/people_sync_out.Zz9\n" };
  }
  if (remote.startsWith("mktemp")) {
    return { code: 0, stdout: "/tmp/people_sync.Aa1\n" };
  }
  if (remote.includes("print(1)")) return { code: 0, stdout: "1\n" };
  return { code: 0 };
};

async function program(): Promise<Program> {
  return await loadProgram(await scriptsDir());
}

Deno.test("transport: preflight failure is 69 and ships nothing", async () => {
  const rec = recorder(() => ({ code: 127, stderr: "uv: command not found" }));
  const t = new SshTransport(cfg(), rec.exec);
  const err = await assertRejects(() => t.preflight(), SyncError);
  assertEquals(err.code, ExitCode.Unavailable);
  assertStringIncludes(err.message, "uv: command not found");
  assert(rec.calls.every((c) => c.cmd === "ssh"));
});

Deno.test("transport: a preflight that exits 0 but does not print 1 is still 69", async () => {
  const rec = recorder(() => ({ code: 0, stdout: "Traceback ...\n" }));
  const err = await assertRejects(
    () => new SshTransport(cfg(), rec.exec).preflight(),
    SyncError,
  );
  assertEquals(err.code, ExitCode.Unavailable);
});

Deno.test("transport: every privileged step uses the configured run user, and the report is read as that user", async () => {
  const rec = recorder((cmd, args) => {
    const remote = args[args.length - 1];
    if (remote.includes("cat /tmp/people_sync_out.Zz9/report.json")) {
      return { code: 0, stdout: "{}" };
    }
    return happy(cmd, args);
  });
  await new SshTransport(cfg("RDM_RUN_USER=deploy\n"), rec.exec).run({
    program: await program(),
    people: "[]",
    apply: false,
  });
  const remotes = rec.calls.filter((c) => c.cmd === "ssh").map((c) =>
    c.args[c.args.length - 1]
  );
  const privileged = remotes.filter((r) => r.includes("sudo"));
  assertEquals(privileged.length, 4); // out dir, program, report, cleanup
  assert(
    privileged.every((r) => r.includes("sudo -n -u deploy ")),
    privileged.join("\n"),
  );
  assert(!remotes.some((r) => r.includes("-u ubuntu")));
  assert(
    remotes.includes(
      "sudo -n -u deploy cat /tmp/people_sync_out.Zz9/report.json",
    ),
  );
});

Deno.test("transport: the whole set ships in one scp, the program runs as the run user, dry run has no --apply", async () => {
  const rec = recorder(happy);
  const res = await new SshTransport(cfg(), rec.exec).run({
    program: await program(),
    people: "[]",
    apply: false,
  });
  assertEquals(res, { code: 0, report: '{"ok":1}', stderr: "" });
  const scps = rec.calls.filter((c) => c.cmd === "scp");
  assertEquals(scps.length, 1);
  const shipped = scps[0].args.filter((a) =>
    a.endsWith(".py") || a.endsWith("people.json")
  )
    .map((a) => a.split("/").pop()).sort();
  assertEquals(shipped, [...PROGRAM_FILES, "people.json"].sort());
  assertEquals(
    scps[0].args[scps[0].args.length - 1],
    "rdm.example.test:/tmp/people_sync.Aa1/",
  );
  const run = rec.calls.map((c) => c.args[c.args.length - 1]).find((a) =>
    a.includes("people_rdm_apply.py")
  )!;
  assertStringIncludes(run, "sudo -n -u ubuntu bash -lc");
  assertStringIncludes(run, "/tmp/people_sync_out.Zz9/report.json");
  assert(!run.includes("--apply"), "a dry run must not pass --apply");
  assertStringIncludes(run, "--compact");
  assert(!run.includes("--scope"));
});

Deno.test("transport: apply and scope reach the command, quoted", async () => {
  const rec = recorder(happy);
  await new SshTransport(cfg(), rec.exec).run({
    program: await program(),
    people: "[]",
    apply: true,
    scope: "O'Brien-Pat",
  });
  const run = rec.calls.map((c) => c.args[c.args.length - 1]).find((a) =>
    a.includes("people_rdm_apply.py")
  )!;
  assertStringIncludes(run, "--apply");
  assertStringIncludes(run, "--scope");
  assertStringIncludes(run, "O");
  // the scope is one shell word after two layers of quoting: run it for real
  const inner = run.replace(/^sudo -n -u ubuntu bash -lc /, "");
  const out = await new Deno.Command("sh", {
    args: ["-c", `set -- ${inner}; printf '%s' "$1"`],
    stdout: "piped",
  }).output();
  assertStringIncludes(new TextDecoder().decode(out.stdout), "O'\\''Brien-Pat");
});

Deno.test("transport: the work directories are removed even when the program fails", async () => {
  const rec = recorder((cmd, args) => {
    const remote = args[args.length - 1];
    if (remote.includes("people_rdm_apply.py")) {
      return { code: 70, stderr: "boom" };
    }
    return happy(cmd, args);
  });
  const res = await new SshTransport(cfg(), rec.exec).run({
    program: await program(),
    people: "[]",
    apply: true,
  });
  assertEquals(res.code, 70);
  const last = rec.calls[rec.calls.length - 1].args.pop()!;
  assertStringIncludes(last, "rm -rf /tmp/people_sync.Aa1");
  assertStringIncludes(last, "rm -rf /tmp/people_sync_out.Zz9");
});

Deno.test("transport: a dropped connection is 69 and still cleans up", async () => {
  const rec = recorder((cmd, args) => {
    if (args[args.length - 1].includes("people_rdm_apply.py")) {
      return { code: 255, stderr: "reset" };
    }
    return happy(cmd, args);
  });
  const prog = await program();
  const err = await assertRejects(
    () =>
      new SshTransport(cfg(), rec.exec).run({
        program: prog,
        people: "[]",
        apply: true,
      }),
    SyncError,
  );
  assertEquals(err.code, ExitCode.Unavailable);
  assertStringIncludes(rec.calls[rec.calls.length - 1].args.pop()!, "rm -rf");
});

// ---- the ssm transport ------------------------------------------------------

const SSM_ENV =
  "RDM_URL=https://authors.example.test\nPEOPLE_SYNC_TRANSPORT=ssm\n" +
  "RDM_INSTANCE_ID=i-0123456789abcdef0\n";

Deno.test("config: ssm needs an instance id, not a host; ssh still needs a host", async () => {
  const c = loadConfig(SSM_ENV, "/Sites/cold");
  assertEquals(c.transport, "ssm");
  assertEquals(c.instanceId, "i-0123456789abcdef0");
  assertEquals(
    await code(() =>
      loadConfig(
        "RDM_URL=https://x.test\nPEOPLE_SYNC_TRANSPORT=ssm\n",
        "/c",
      )
    ),
    ExitCode.NoInput,
  );
  assertEquals(
    await code(() =>
      loadConfig(SSM_ENV.replace("i-0123456789abcdef0", "nope"), "/c")
    ),
    ExitCode.Config,
  );
  assertEquals(
    await code(() => loadConfig("RDM_URL=https://x.test\n", "/c")),
    ExitCode.NoInput,
  );
  assertEquals(
    loadConfig(SSM_ENV + "AWS_REGION=us-west-2\nAWS_PROFILE=dev\n", "/c")
      .awsRegion,
    "us-west-2",
  );
  assertEquals(
    await code(() => loadConfig(SSM_ENV + "AWS_REGION=a b\n", "/c")),
    ExitCode.Config,
  );
});

Deno.test("makeTransport picks the transport the config names", () => {
  assert(makeTransport(cfg()) instanceof SshTransport);
  assert(makeTransport(loadConfig(SSM_ENV, "/c")) instanceof SsmTransport);
});

/** fakeSsm is `aws ssm` backed by this machine: each command SSM is asked to
 * run is executed here under `sh` (as SSM's RunShellScript does), with
 * stand-ins for sudo, uv and sha256sum on the PATH, so the generated remote
 * scripts are really run. It enforces SSM's size limits. */
async function fakeSsm(
  opts: {
    programExit?: number;
    report?: string;
    failPreflight?: boolean;
    preflightOutput?: string;
  } = {},
) {
  const root = await Deno.makeTempDir({ prefix: "fake_ssm_" });
  const bin = join(root, "bin");
  const checkout = join(root, "checkout");
  await Deno.mkdir(bin);
  await Deno.mkdir(checkout);
  const sh = (name: string, body: string) =>
    Deno.writeTextFile(join(bin, name), `#!/bin/sh\n${body}\n`, {
      mode: 0o755,
    });
  // sudo [-n] [-u USER] CMD...: run CMD as ourselves
  await sh(
    "sudo",
    'while [ "$1" = "-n" ] || [ "$1" = "-u" ]; do if [ "$1" = "-u" ]; then shift 2; else shift; fi; done; if [ "$1" = "bash" ] && [ "$2" = "-lc" ]; then exec bash -c "$3"; fi; exec "$@"',
  );
  // timeout [--kill-after=N] LIMIT CMD...: note the limit, run CMD (macOS has no `timeout`)
  await sh(
    "timeout",
    'echo "$1 $2" > "' + root + '/timeout.txt"; shift 2; exec "$@"',
  );
  await sh(
    "sha256sum",
    'if [ "$1" = "-c" ]; then shasum -a 256 -c -; else shasum -a 256 "$@"; fi',
  );
  const reportBody = opts.report ??
    '{"mode":"dry-run","scope":null,"plan":[],"results":[],"summary":{},"aborted":null,"compact":true,"plan_counts":{"info":3}}';
  await Deno.writeTextFile(join(root, "report_body.json"), reportBody);
  // uv run python ARGS...: a stand-in for the applier. It checks the files
  // arrived beside it, notes its arguments, and writes a report.
  await sh(
    "uv",
    `[ "$1 $2" = "run python" ] || exit 99; shift 2
if [ "$1" = "-c" ]; then ${
      opts.failPreflight
        ? "echo 'uv: broken' >&2; exit 3"
        : `echo '${opts.preflightOutput ?? "1"}'`
    }; exit 0; fi
script="$1"; shift
dir=$(dirname "$script")
for f in people_rdm_match.py people_rdm_apply.py people_rdm_export_names.py people.json; do [ -f "$dir/$f" ] || { echo "missing $f" >&2; exit 98; }; done
echo "$@" > "${root}/args.txt"
cp "$dir/people.json" "${root}/people_seen.json"
while [ $# -gt 0 ]; do [ "$1" = "--out" ] && out="$2"; shift; done
umask 077
cp "${root}/report_body.json" "$out"
exit ${opts.programExit ?? 0}`,
  );
  const results = new Map<
    string,
    { status: string; code: number; out: string; err: string }
  >();
  const sent: string[] = [];
  const exec: Exec = async (cmd, args) => {
    assertEquals(cmd, "aws");
    assertEquals(args[0], "ssm");
    const verb = args[1];
    const flag = (n: string) => args[args.indexOf(n) + 1];
    if (verb === "send-command") {
      assertEquals(flag("--document-name"), "AWS-RunShellScript");
      assertEquals(flag("--instance-ids"), "i-0123456789abcdef0");
      const file = flag("--parameters").replace(/^file:\/\//, "");
      const text = await Deno.readTextFile(file);
      assert(
        text.length < 97_000,
        `a command of ${text.length} characters exceeds SSM's parameter limit`,
      );
      const script = JSON.parse(text).commands.join("\n");
      sent.push(script);
      const r = await new Deno.Command("sh", {
        args: ["-c", script],
        env: { PATH: `${bin}:${Deno.env.get("PATH")}` },
        stdout: "piped",
        stderr: "piped",
      }).output();
      const dec = new TextDecoder();
      const id = `cid-${results.size}`;
      results.set(id, {
        status: r.code === 0 ? "Success" : "Failed",
        code: r.code,
        // SSM truncates stdout at 24,000 characters
        out: dec.decode(r.stdout).slice(0, 24_000),
        err: dec.decode(r.stderr),
      });
      return { code: 0, stdout: `${id}\n`, stderr: "" };
    }
    if (verb === "wait") return { code: 0, stdout: "", stderr: "" };
    if (verb === "get-command-invocation") {
      const r = results.get(flag("--command-id"))!;
      return {
        code: 0,
        stdout: JSON.stringify({
          Status: r.status,
          ResponseCode: r.code,
          StandardOutputContent: r.out,
          StandardErrorContent: r.err,
        }),
        stderr: "",
      };
    }
    throw new Error(`unexpected aws call ${args.join(" ")}`);
  };
  return { exec, root, checkout, sent };
}

function ssmCfg(checkout: string) {
  return loadConfig(SSM_ENV + `RDM_CHECKOUT=${checkout}\n`, "/Sites/cold");
}

function bigPeople(n: number): string {
  return JSON.stringify(Array.from({ length: n }, (_, i) => ({
    clpid: `Person-${i}`,
    family_name: `Family${i}`,
    given_name: `Given${i}`,
    orcid: `0000-0002-${String(1000 + i).padStart(4, "0")}-${
      String(i * 7919 % 10000).padStart(4, "0")
    }`,
    isni: "",
    thesis_id: "",
    authors_id: "",
    advisors_id: "",
    alt_name: [],
  })));
}

Deno.test("ssm: preflight passes when the instance answers 1, 69 when it does not", async () => {
  const ok = await fakeSsm();
  await new SsmTransport(ssmCfg(ok.checkout), ok.exec).preflight();
  const bad = await fakeSsm({ failPreflight: true });
  const err = await assertRejects(
    () => new SsmTransport(ssmCfg(bad.checkout), bad.exec).preflight(),
    SyncError,
  );
  assertEquals(err.code, ExitCode.Unavailable);
  assertStringIncludes(err.message, "uv: broken");
});

Deno.test("ssm: a large people file crosses in pieces, arrives intact, the program runs and the report comes back", async () => {
  const f = await fakeSsm();
  const people = bigPeople(9000); // a full COLD export is about this size
  const res = await new SsmTransport(ssmCfg(f.checkout), f.exec).run({
    program: await program(),
    people,
    apply: false,
  });
  assertEquals(res.code, 0);
  assertEquals(JSON.parse(res.report).plan_counts, { info: 3 });
  // what the program saw is exactly what was sent
  assertEquals(
    await Deno.readTextFile(join(f.root, "people_seen.json")),
    people,
  );
  const args = (await Deno.readTextFile(join(f.root, "args.txt"))).trim();
  assert(!args.includes("--apply"));
  assertStringIncludes(args, "--compact");
  assert(f.sent.length > 3, "a large file must go in several commands");
});

Deno.test("ssm: apply and scope reach the program; compact is always on", async () => {
  const f = await fakeSsm();
  await new SsmTransport(ssmCfg(f.checkout), f.exec).run({
    program: await program(),
    people: "[]",
    apply: true,
    scope: "O'Brien-Pat",
  });
  const args = (await Deno.readTextFile(join(f.root, "args.txt"))).trim();
  assertStringIncludes(args, "--apply");
  assertStringIncludes(args, "--compact");
  assertStringIncludes(args, "--scope O'Brien-Pat");
});

Deno.test("ssm: a report bigger than one SSM answer is fetched whole", async () => {
  const bigReport = JSON.stringify({
    mode: "dry-run",
    scope: null,
    aborted: null,
    summary: {},
    results: [],
    compact: true,
    plan_counts: { warning: 4000 },
    plan: Array.from({ length: 4000 }, (_, i) => ({
      clpid: `P-${i}`,
      rdm_id: `r${i}`,
      action: "orphan_clpid",
      outcome: "warning",
      message: `message number ${i} ${"x".repeat(30)}`,
    })),
  });
  const f = await fakeSsm({ report: bigReport });
  const res = await new SsmTransport(ssmCfg(f.checkout), f.exec).run({
    program: await program(),
    people: "[]",
    apply: false,
  });
  assertEquals(res.report, bigReport);
});

Deno.test("ssm: the program's own exit code and its report come back when it fails", async () => {
  const f = await fakeSsm({ programExit: 70 });
  const res = await new SsmTransport(ssmCfg(f.checkout), f.exec).run({
    program: await program(),
    people: "[]",
    apply: true,
  });
  assertEquals(res.code, 70);
  assert(res.report.length > 0);
});

Deno.test("ssm: a corrupted piece is refused by the check on the instance", async () => {
  const f = await fakeSsm();
  let damaged = false;
  const corrupting: Exec = (cmd, args) => {
    if (args[1] === "send-command" && !damaged) {
      const file = args[args.indexOf("--parameters") + 1].replace(
        /^file:\/\//,
        "",
      );
      const doc = JSON.parse(Deno.readTextFileSync(file));
      const text: string = doc.commands.join("\n");
      // damage the first uploaded piece of people.json
      if (text.includes("people.json.b64") && text.includes(">>")) {
        damaged = true;
        doc.commands = [
          text.replace(/printf %s '(.)(.)/, (_m, _a, b) => `printf %s 'A${b}`),
        ];
        Deno.writeTextFileSync(file, JSON.stringify(doc));
      }
    }
    return f.exec(cmd, args);
  };
  const prog = await program();
  const err = await assertRejects(
    () =>
      new SsmTransport(ssmCfg(f.checkout), corrupting).run({
        program: prog,
        people: "[1,2,3]",
        apply: false,
      }),
    SyncError,
  );
  assert(damaged, "the test did not damage a piece");
  assertEquals(err.code, ExitCode.Unavailable);
});

/** gzipB64 gzips text and base64-encodes it, as the transport does. */
async function gzipB64(text: string): Promise<string> {
  const gz = new Uint8Array(
    await new Response(
      new Blob([text]).stream().pipeThrough(new CompressionStream("gzip")),
    ).arrayBuffer(),
  );
  return toBase64(gz);
}

Deno.test("ssm: a file that arrives as valid gzip of the wrong content is refused by the hash check", async () => {
  const f = await fakeSsm();
  const swap = await gzipB64("[9]");
  let swapped = false;
  const exec: Exec = (cmd, args, o) => {
    if (args[1] === "send-command") {
      const file = args[args.indexOf("--parameters") + 1].replace(
        /^file:\/\//,
        "",
      );
      const doc = JSON.parse(Deno.readTextFileSync(file));
      const text: string = doc.commands.join("\n");
      if (text.includes("people.json.b64") && text.includes(">>")) {
        swapped = true;
        doc.commands = [
          text.replace(
            /printf %s '[^']*' >> "([^"]*people\.json\.b64)"/,
            (_m, path) => `printf %s '${swap}' >> "${path}"`,
          ),
        ];
        Deno.writeTextFileSync(file, JSON.stringify(doc));
      }
    }
    return f.exec(cmd, args, o);
  };
  const prog = await program();
  const err = await assertRejects(
    () =>
      new SsmTransport(ssmCfg(f.checkout), exec).run({
        program: prog,
        people: '[{"clpid":"a"}]',
        apply: false,
      }),
    SyncError,
  );
  assert(swapped);
  assertEquals(err.code, ExitCode.Unavailable);
  assertStringIncludes(err.message, "did not arrive intact");
});

Deno.test("ssm: a report that arrives as valid gzip of something else is refused by its checksum", async () => {
  const f = await fakeSsm();
  const other = await gzipB64('{"mode":"apply","plan":[],"results":[]}');
  const tailCids = new Set<string>();
  let replaced = false;
  const exec: Exec = async (cmd, args, o) => {
    const r = await f.exec(cmd, args, o);
    if (args[1] === "send-command") {
      const file = args[args.indexOf("--parameters") + 1].replace(
        /^file:\/\//,
        "",
      );
      if (Deno.readTextFileSync(file).includes("tail -c +")) {
        tailCids.add(r.stdout.trim());
      }
    }
    if (
      args[1] === "get-command-invocation" &&
      tailCids.has(args[args.indexOf("--command-id") + 1])
    ) {
      replaced = true;
      const inv = JSON.parse(r.stdout);
      inv.StandardOutputContent = other;
      return { ...r, stdout: JSON.stringify(inv) };
    }
    return r;
  };
  const err = await assertRejects(
    async () =>
      new SsmTransport(ssmCfg(f.checkout), exec).run({
        program: await program(),
        people: "[]",
        apply: false,
      }),
    SyncError,
  );
  assert(replaced);
  assertEquals(err.code, ExitCode.Unavailable);
  assertStringIncludes(err.message, "checksum");
});

Deno.test("ssm: a preflight that exits 0 but prints something else is 69", async () => {
  const f = await fakeSsm({ preflightOutput: "2" });
  const err = await assertRejects(
    () => new SsmTransport(ssmCfg(f.checkout), f.exec).preflight(),
    SyncError,
  );
  assertEquals(err.code, ExitCode.Unavailable);
});

Deno.test("ssm: the configured region and profile are passed to every aws call", async () => {
  const f = await fakeSsm();
  const seen: string[][] = [];
  const exec: Exec = (cmd, args, o) => {
    seen.push(args);
    return f.exec(
      cmd,
      args.filter((a, i) =>
        !(a === "--region" || a === "--profile" || args[i - 1] === "--region" ||
          args[i - 1] === "--profile")
      ),
      o,
    );
  };
  const cfgWith = loadConfig(
    SSM_ENV +
      `RDM_CHECKOUT=${f.checkout}\nAWS_REGION=us-west-2\nAWS_PROFILE=dev\n`,
    "/c",
  );
  await new SsmTransport(cfgWith, exec).preflight();
  assert(seen.length > 0);
  for (const a of seen) {
    assertEquals(a.slice(0, 4), ["--region", "us-west-2", "--profile", "dev"]);
  }
});

Deno.test("ssm: the instance's work directories are removed afterwards", async () => {
  const f = await fakeSsm();
  const names = async () =>
    (await Array.fromAsync(Deno.readDir("/tmp"))).map((e) => e.name)
      .filter((n) => /^people_sync(_out)?\./.test(n));
  const before = new Set(await names());
  await new SsmTransport(ssmCfg(f.checkout), f.exec).run({
    program: await program(),
    people: "[]",
    apply: false,
  });
  assertEquals((await names()).filter((n) => !before.has(n)), []);
});

Deno.test("ssm: a command that is undeliverable is 69", async () => {
  const exec: Exec = (_c, args) => {
    if (args[1] === "send-command") {
      return Promise.resolve({ code: 0, stdout: "cid-1\n", stderr: "" });
    }
    if (args[1] === "wait") {
      return Promise.resolve({
        code: 255,
        stdout: "",
        stderr: "Waiter CommandExecuted failed",
      });
    }
    return Promise.resolve({
      code: 0,
      stdout: JSON.stringify({
        Status: "Undeliverable",
        ResponseCode: -1,
        StandardOutputContent: "",
        StandardErrorContent: "",
      }),
      stderr: "",
    });
  };
  const err = await assertRejects(
    () => new SsmTransport(ssmCfg("/x"), exec).preflight(),
    SyncError,
  );
  assertEquals(err.code, ExitCode.Unavailable);
});

Deno.test("ssm: aws itself failing (no credentials) is 69", async () => {
  const exec: Exec = () =>
    Promise.resolve({
      code: 255,
      stdout: "",
      stderr: "Unable to locate credentials",
    });
  const err = await assertRejects(
    () => new SsmTransport(ssmCfg("/x"), exec).preflight(),
    SyncError,
  );
  assertEquals(err.code, ExitCode.Unavailable);
  assertStringIncludes(err.message, "Unable to locate credentials");
});

// ---- the report becomes rows ------------------------------------------------

// A compact report as the program writes it (cold DR-0037): the plan lists what a person would
// review (updates, removals, warnings, the replaces that change a name or an identifier) and
// plan_counts / action_counts count everything, so the creates and quiet replaces are only counts.
const REPORT: Report = {
  mode: "apply",
  scope: null,
  aborted: null,
  index: { status: "rebuilt", message: "" },
  summary: { created: 2, updated: 1, replaced: 2, removed: 1 },
  compact: true,
  plan_counts: { warning: 1, needs_human: 1, applied: 6 },
  action_counts: { create: 2, update: 1, replace: 2, remove: 1 },
  plan: [
    {
      clpid: "Zed-Zoe",
      rdm_id: null,
      action: "malformed_identifier",
      outcome: "warning",
      message: "w",
    },
    {
      clpid: "Mid-Cy",
      rdm_id: "Mid-Cy",
      action: "id_deleted",
      outcome: "needs_human",
      message: "h",
    },
    {
      clpid: "Old-Bob",
      rdm_id: "Old-Bob",
      action: "update",
      outcome: "applied",
      message: "",
      detail: { changes: ["name"] },
    },
    {
      clpid: "Old-Bob",
      rdm_id: "id-b",
      action: "replace",
      outcome: "applied",
      message: "",
      detail: {
        replaced_by: "Old-Bob",
        persons: ["Old-Bob"],
        changes: ["name"],
      },
    },
    {
      clpid: "Gone-Gus",
      rdm_id: "Gone-Gus",
      action: "remove",
      outcome: "applied",
      message: "",
    },
  ],
  results: [
    {
      clpid: "Old-Bob",
      rdm_id: "Old-Bob",
      action: "update",
      status: "updated",
      message: "",
    },
    {
      clpid: "Old-Bob",
      rdm_id: "id-b",
      action: "replace",
      status: "replaced",
      message: "",
    },
    {
      clpid: "Gone-Gus",
      rdm_id: "Gone-Gus",
      action: "remove",
      status: "removed",
      message: "",
    },
  ],
};

Deno.test("items: warnings, needs_human and applied get rows; creates and quiet replaces are only counted", () => {
  const { items, counts, actions } = itemsFromReport(
    REPORT,
    "r1",
    "2026-11-10 09:00:00",
  );
  assertEquals(counts, { warning: 1, needs_human: 1, applied: 6 });
  assertEquals(actions, { create: 2, update: 1, replace: 2, remove: 1 });
  assertEquals(items.length, 5);
});

Deno.test("items: ordered for a person, keyed per run, applied carry what happened", () => {
  const { items } = itemsFromReport(REPORT, "r1", "2026-11-10 09:00:00");
  assertEquals(items.map((i) => i.row.outcome), [
    "needs_human",
    "warning",
    "applied",
    "applied",
    "applied",
  ]);
  assertEquals(items[0].key, "r1-00001");
  assertEquals(items[4].key, "r1-00005");
  const applied = items.filter((i) => i.row.outcome === "applied");
  assertEquals(applied.map((i) => [i.row.action, i.row.clpid, i.row.status]), [
    ["remove", "Gone-Gus", "removed"],
    ["replace", "Old-Bob", "replaced"],
    ["update", "Old-Bob", "updated"],
  ]);
  assertEquals(items[0].row.run_id, "r1");
  assertEquals(items[0].row.recorded, "2026-11-10 09:00:00");
});

Deno.test("items: an update and a replace of one person are told apart by their entry, not mixed up", () => {
  const dry: Report = {
    ...REPORT,
    mode: "dry-run",
    results: [{
      clpid: "Old-Bob",
      rdm_id: "id-b",
      action: "replace",
      status: "would_replace",
      message: "",
    }],
  };
  const { items } = itemsFromReport(dry, "r1", "t");
  const st = (action: string) =>
    items.find((i) => i.row.action === action)!.row.status;
  assertEquals(st("replace"), "would_replace");
  assertEquals(st("update"), "not_attempted");
  assertEquals(st("remove"), "not_attempted");
});

Deno.test("items: a revive is listed, counted by action, and matched to its result by the entry id", () => {
  const report: Report = {
    ...REPORT,
    plan: [{
      clpid: "Doiel-M-S",
      rdm_id: "Doiel-M-S",
      action: "revive",
      outcome: "applied",
      message: "restore entry Doiel-M-S, which was removed and is needed again",
    }],
    results: [{
      clpid: "Doiel-M-S",
      rdm_id: "Doiel-M-S",
      action: "revive",
      status: "revived",
      message: "",
    }],
    compact: undefined,
    plan_counts: undefined,
    action_counts: undefined,
  };
  const { items, actions } = itemsFromReport(report, "r1", "t");
  assertEquals(actions, { revive: 1 });
  assertEquals(items.length, 1);
  assertEquals(items[0].row.status, "revived");
});

Deno.test("items: a create is matched to its result by the entry id", () => {
  const report: Report = {
    ...REPORT,
    plan: [{
      clpid: "New-Ann",
      rdm_id: "New-Ann",
      action: "create",
      outcome: "applied",
      message: "",
    }],
    results: [{
      clpid: "New-Ann",
      rdm_id: "New-Ann",
      action: "create",
      status: "created",
      message: "",
    }],
  };
  assertEquals(
    itemsFromReport(report, "r1", "t").items[0].row.status,
    "created",
  );
});

Deno.test("items: a result message reaches the row", () => {
  const report: Report = {
    ...REPORT,
    results: [{
      clpid: "Gone-Gus",
      rdm_id: "Gone-Gus",
      action: "remove",
      status: "removed",
      message: "delete raised X; the entry is gone",
    }],
  };
  const row =
    itemsFromReport(report, "r1", "t").items.find((i) =>
      i.row.action === "remove"
    )!.row;
  assertEquals(row.result_message, "delete raised X; the entry is gone");
});

Deno.test("items: the matcher's detail reaches the stored row unchanged", () => {
  const row =
    itemsFromReport(REPORT, "r1", "t").items.find((i) =>
      i.row.action === "replace"
    )!.row;
  assertEquals(row.detail, {
    replaced_by: "Old-Bob",
    persons: ["Old-Bob"],
    changes: ["name"],
  });
});

Deno.test("items: a report that is not compact is tallied from its plan", () => {
  const full: Report = {
    ...REPORT,
    compact: undefined,
    plan_counts: undefined,
    action_counts: undefined,
    plan: [
      ...REPORT.plan,
      {
        clpid: "New-Ann",
        rdm_id: "New-Ann",
        action: "create",
        outcome: "applied",
        message: "",
      },
    ],
  };
  const { counts, actions, items } = itemsFromReport(full, "r1", "t");
  assertEquals(counts, { warning: 1, needs_human: 1, applied: 4 });
  assertEquals(actions, { create: 1, update: 1, replace: 1, remove: 1 });
  assertEquals(items.length, 6);
});

Deno.test("items: an item of an older report (a conflict or a repair) still renders as a row", () => {
  const old: Report = {
    ...REPORT,
    plan: [...REPORT.plan, {
      clpid: "Mid-Cy",
      rdm_id: "r3",
      action: "conflict",
      outcome: "needs_human",
      message: "h",
    }, {
      clpid: "Fix-Di",
      rdm_id: "r4",
      action: "needs_repair",
      outcome: "needs_repair",
      message: "r",
    }],
  };
  const { items } = itemsFromReport(old, "r1", "t");
  // needs_repair is no longer an outcome: it is not stored; the conflict is.
  assertEquals(items.length, 6);
  assert(items.every((i) => i.row.outcome !== "needs_repair"));
});

Deno.test("items: there is no list of repair outcomes any more", () => {
  assert(!(ITEM_OUTCOMES as readonly string[]).includes("needs_repair"));
});

Deno.test("items: a one-person run keeps the person's items and the replace of a legacy entry shared with them", () => {
  const shared: Report = {
    ...REPORT,
    scope: "Alpha-B",
    plan: [{
      clpid: "Alpha-A",
      rdm_id: "id-one",
      action: "replace",
      outcome: "applied",
      message: "",
      detail: { replaced_by: "Alpha-A", persons: ["Alpha-A", "Alpha-B"] },
    }, ...REPORT.plan],
  };
  const { items } = itemsFromReport(shared, "r1", "t");
  assertEquals(items.map((i) => i.row.rdm_id), ["id-one"]);
  assertEquals(
    itemsFromReport({ ...shared, scope: "Zed-Z" }, "r1", "t").items.length,
    0,
  );
});

Deno.test("items: a one-person run keeps only that person", () => {
  const { items } = itemsFromReport(
    { ...REPORT, scope: "Old-Bob" },
    "r1",
    "t",
  );
  assertEquals(items.length, 2);
  assert(items.every((i) => i.row.clpid === "Old-Bob"));
});

Deno.test("transport: the program runs under a remote timeout of the run limit, so a hung run ends on the host too", async () => {
  const rec = recorder(happy);
  await new SshTransport({ ...cfg(), staleSeconds: 90 }, rec.exec).run({
    program: await program(),
    people: "[]",
    apply: true,
  });
  const run = rec.calls.find((c) =>
    c.args[c.args.length - 1].includes("people_rdm_apply.py")
  )!;
  assertStringIncludes(
    run.args[run.args.length - 1],
    "timeout --kill-after=30 90 uv run python",
  );
});

Deno.test("transport: the local ssh call has its own backstop a little past the run limit", async () => {
  const rec = recorder(happy);
  await new SshTransport({ ...cfg(), staleSeconds: 90 }, rec.exec).run({
    program: await program(),
    people: "[]",
    apply: false,
  });
  const run = rec.calls.find((c) =>
    c.args[c.args.length - 1].includes("people_rdm_apply.py")
  )!;
  assertEquals(run.opts?.timeoutMs, (90 + 120) * 1000);
  // the quick steps keep their default
  const mk = rec.calls.find((c) =>
    c.args[c.args.length - 1].startsWith("mktemp")
  )!;
  assertEquals(mk.opts?.timeoutMs, undefined);
});

Deno.test("ssm: the program runs under a remote timeout of the run limit", async () => {
  const f = await fakeSsm();
  await new SsmTransport({ ...ssmCfg(f.checkout), staleSeconds: 90 }, f.exec)
    .run({ program: await program(), people: "[]", apply: false });
  assertEquals(
    (await Deno.readTextFile(join(f.root, "timeout.txt"))).trim(),
    "--kill-after=30 90",
  );
});

Deno.test("ssm: it waits for the program as long as the run limit allows, so it never gives up while the host still runs", () => {
  const t = new SsmTransport(
    { ...ssmCfg("/x"), staleSeconds: 600 },
    () => Promise.reject(new Error("unused")),
  );
  assert(t.pollSeconds >= 600 + 30, `waits only ${t.pollSeconds} s`);
});

Deno.test("run: a program ended by the limit is an error run that says so, and the lock is released", async () => {
  for (const exit of [124, 137]) {
    const h = await harness({
      run: () => Promise.resolve({ code: exit, report: "", stderr: "" }),
    });
    const err = await runSync(
      { ...cfg(), staleSeconds: 90 },
      { scope: "all", trigger: "", requestId: "" },
      h,
    ).then(() => null, (e: unknown) => e);
    assert(err instanceof SyncError, `exit ${exit}`);
    assertEquals(err.code, ExitCode.Internal);
    assertStringIncludes(err.message, "ended after 90 seconds");
    assertStringIncludes(err.message, "PEOPLE_SYNC_STALE_SECONDS");
    assertEquals(h.store.history, ["running", "error"]);
    assertStringIncludes(
      String([...h.store.runs.values()][0].error),
      "ended after 90 seconds",
    );
    assertEquals(
      await Deno.stat(h.lockDir).then(() => true, () => false),
      false,
    );
  }
});

Deno.test("run: a program that exits 124 but left a report is still read as the report it left", async () => {
  const h = await harness({}, REPORT, 124);
  const r = await runSync(
    { ...cfg(), staleSeconds: 90 },
    { scope: "all", trigger: "", requestId: "" },
    h,
  );
  assertEquals(r.code, ExitCode.Internal);
  assertEquals(h.store.items.size, 5);
});

// ---- the lock ---------------------------------------------------------------

Deno.test("lock: a second run is refused with 75, then allowed after release", async () => {
  const dir = join(await Deno.makeTempDir(), "l");
  const a = new Lock(dir, 3600);
  await a.acquire();
  assertEquals(
    await code(() => new Lock(dir, 3600).acquire()),
    ExitCode.TempFail,
  );
  await a.release();
  const b = new Lock(dir, 3600);
  await b.acquire();
  await b.release();
});

/** setOwner makes a lock directory with an owner file, and optionally an old modified time. */
async function setOwner(
  dir: string,
  owner: string | null,
  ageSeconds = 0,
): Promise<void> {
  await Deno.mkdir(dir);
  if (owner !== null) await Deno.writeTextFile(join(dir, "owner"), owner);
  if (ageSeconds > 0) {
    const then = new Date(Date.now() - ageSeconds * 1000);
    await Deno.utime(dir, then, then);
  }
}

Deno.test("lock: a dead owner's lock is cleared", async () => {
  const dir = join(await Deno.makeTempDir(), "l");
  await setOwner(dir, `4242 ${new Date().toISOString()}\n`);
  const lock = new Lock(dir, 3600, undefined, () => Promise.resolve(false));
  await lock.acquire();
  await lock.release();
});

Deno.test("lock: a live owner's lock is never broken, however old it is (a hung run ends itself)", async () => {
  const dir = join(await Deno.makeTempDir(), "l");
  await setOwner(
    dir,
    `4242 ${new Date(Date.now() - 7200_000).toISOString()}\n`,
    7200,
  );
  const live = new Lock(dir, 3600, undefined, () => Promise.resolve(true));
  assertEquals(await code(() => live.acquire()), ExitCode.TempFail);
  // the lock is still there and still the other run's
  assertEquals(
    (await Deno.readTextFile(join(dir, "owner"))).startsWith("4242 "),
    true,
  );
});

Deno.test("lock: a lock with no owner file is stale only by the age of the directory", async () => {
  const base = await Deno.makeTempDir();
  const young = join(base, "young");
  await setOwner(young, null);
  assertEquals(
    await code(() => new Lock(young, 3600).acquire()),
    ExitCode.TempFail,
  );
  const old = join(base, "old");
  await setOwner(old, null, 7200);
  const lock = new Lock(old, 3600);
  await lock.acquire();
  await lock.release();
});

Deno.test("lock: an owner file that cannot be read is the same as none", async () => {
  const base = await Deno.makeTempDir();
  const junk = join(base, "junk");
  await setOwner(junk, "not a pid\n");
  assertEquals(
    await code(() => new Lock(junk, 3600).acquire()),
    ExitCode.TempFail,
  );
  const oldJunk = join(base, "oldjunk");
  await setOwner(oldJunk, "not a pid\n", 7200);
  const lock = new Lock(oldJunk, 3600);
  await lock.acquire();
  await lock.release();
});

// ---- the whole run ------------------------------------------------------------

class MemStore implements Store {
  runs = new Map<string, Record<string, unknown>>();
  history: string[] = [];
  items = new Map<string, Record<string, unknown>>();
  putRun(k: string, row: Record<string, unknown>) {
    this.runs.set(k, structuredClone(row));
    this.history.push(String(row.state));
    return Promise.resolve();
  }
  putItem(k: string, row: Record<string, unknown>) {
    this.items.set(k, row);
    return Promise.resolve();
  }
  people() {
    return Promise.resolve([{ clpid: "a" }, { clpid: "b" }, { clpid: "c" }]);
  }
}

async function harness(t: Partial<Transport>, report = REPORT, exit = 0) {
  const lockDir = join(await Deno.makeTempDir(), "lock");
  const store = new MemStore();
  const transport: Transport = {
    preflight: () => Promise.resolve(),
    run: () =>
      Promise.resolve({
        code: exit,
        report: JSON.stringify(report),
        stderr: "",
      }),
    ...t,
  };
  const lock = new Lock(lockDir, 3600);
  return { store, transport, lock, lockDir, program: await program() };
}

Deno.test("run: a good run leaves one closed run row, items, counts and the program hash", async () => {
  const h = await harness({});
  const r = await runSync(cfg(), {
    scope: "all",
    trigger: "cron",
    requestId: "q1",
  }, h);
  assertEquals(r.code, ExitCode.Ok);
  assertEquals(h.store.history, ["running", "completed"]);
  const run = [...h.store.runs.values()][0];
  assertEquals(run.state, "completed");
  assertEquals(run.mode, "dry-run");
  assertEquals(run.rdm_url, "https://authors.example.test");
  assertEquals(run.trigger, "cron");
  assertEquals(run.request_id, "q1");
  assertEquals(run.program_hash, h.program.hash);
  assertEquals((run.counts as Record<string, unknown>).people, 3);
  assertEquals((run.counts as Record<string, unknown>).warning, 1);
  assertEquals((run.counts as Record<string, unknown>).actions, {
    create: 2,
    update: 1,
    replace: 2,
    remove: 1,
  });
  assertEquals(
    ((run.counts as Record<string, unknown>).index as { status: string })
      .status,
    "rebuilt",
  );
  assert(run.finished !== "");
  assertEquals(h.store.items.size, 5);
  assertEquals(await Deno.stat(h.lockDir).then(() => true, () => false), false);
});

Deno.test("run: items needing review still exit 0", async () => {
  const h = await harness({});
  assertEquals(
    (await runSync(cfg(), { scope: "all", trigger: "", requestId: "" }, h))
      .code,
    0,
  );
});

Deno.test("run: an unreachable host leaves the run row error (not running) and the lock released", async () => {
  const h = await harness({
    preflight: () =>
      Promise.reject(new SyncError(ExitCode.Unavailable, "no route")),
  });
  assertEquals(
    await code(() =>
      runSync(cfg(), { scope: "all", trigger: "", requestId: "" }, h)
    ),
    ExitCode.Unavailable,
  );
  assertEquals(h.store.history, ["running", "error"]);
  assertEquals([...h.store.runs.values()][0].error, "no route");
  assertEquals(await Deno.stat(h.lockDir).then(() => true, () => false), false);
});

Deno.test("run: a program that failed some writes records its items, closes the run as error, exits 70", async () => {
  const bad: Report = {
    ...REPORT,
    summary: { updated: 0, error: 1 },
    results: [{
      clpid: "Old-Bob",
      rdm_id: "Old-Bob",
      action: "update",
      status: "error",
      message: "nope",
    }],
  };
  const h = await harness({}, bad, ExitCode.Internal);
  const r = await runSync(
    cfg(),
    { scope: "all", trigger: "", requestId: "" },
    h,
  );
  assertEquals(r.code, ExitCode.Internal);
  assertEquals([...h.store.runs.values()][0].state, "error");
  assertEquals(h.store.items.size, 5);
  const failed = [...h.store.items.values()].find((i) =>
    i.clpid === "Old-Bob" && i.action === "update"
  )!;
  assertEquals(failed.status, "error");
});

Deno.test("run: an aborted program closes the run as error with its reason", async () => {
  const h = await harness(
    {},
    { ...REPORT, aborted: "reading 'x' failed" },
    ExitCode.Internal,
  );
  const r = await runSync(
    cfg(),
    { scope: "all", trigger: "", requestId: "" },
    h,
  );
  assertEquals(r.code, ExitCode.Internal);
  assertEquals([...h.store.runs.values()][0].error, "reading 'x' failed");
});

Deno.test("run: no report at all is an error run, 70", async () => {
  const h = await harness({
    run: () => Promise.resolve({ code: 73, report: "", stderr: "exists" }),
  });
  assertEquals(
    await code(() =>
      runSync(cfg(), { scope: "all", trigger: "", requestId: "" }, h)
    ),
    ExitCode.Internal,
  );
  assertEquals(h.store.history, ["running", "error"]);
});

Deno.test("run: a held lock is 75 and creates no run row", async () => {
  const h = await harness({});
  const other = new Lock(h.lockDir, 3600);
  await other.acquire();
  assertEquals(
    await code(() =>
      runSync(cfg(), { scope: "all", trigger: "", requestId: "" }, h)
    ),
    ExitCode.TempFail,
  );
  assertEquals(h.store.runs.size, 0);
  await other.release();
});

Deno.test("run: a bad scope is a usage error before anything happens", async () => {
  const h = await harness({});
  assertEquals(
    await code(() =>
      runSync(cfg(), { scope: "everyone", trigger: "", requestId: "" }, h)
    ),
    ExitCode.Usage,
  );
  assertEquals(
    await code(() =>
      runSync(cfg(), { scope: "clpid:", trigger: "", requestId: "" }, h)
    ),
    ExitCode.Usage,
  );
  assertEquals(h.store.runs.size, 0);
});

Deno.test("run: a one-person scope reaches the transport and counts one person", async () => {
  let seen: string | undefined = "unset";
  const h = await harness({
    run: (req) => {
      seen = req.scope;
      return Promise.resolve({
        code: 0,
        report: JSON.stringify({ ...REPORT, scope: "Old-Bob" }),
        stderr: "",
      });
    },
  });
  await runSync(cfg(), {
    scope: "clpid:Old-Bob",
    trigger: "human",
    requestId: "",
  }, h);
  assertEquals(seen, "Old-Bob");
  assertEquals(
    ([...h.store.runs.values()][0].counts as Record<string, unknown>).people,
    1,
  );
});

// ---- command line -----------------------------------------------------------

Deno.test("main: help, version and license exit 0; usage errors throw 2", async () => {
  assertEquals(await main(["--help"]), 0);
  assertEquals(await main(["-v"]), 0);
  assertEquals(await main(["--license"]), 0);
  assertEquals(await code(() => main(["--nope"])), ExitCode.Usage);
  assertEquals(await code(() => main(["extra"])), ExitCode.Usage);
});

Deno.test("main: a missing env file is 66", async () => {
  assertEquals(
    await code(() => main(["--env", "/no/such/people_sync.env"])),
    ExitCode.NoInput,
  );
});

Deno.test("main: no --env is 78, naming the option; there is no default env file", async () => {
  const err = await main([]).then(() => null, (e: unknown) => e);
  assert(err instanceof SyncError);
  assertEquals(err.code, ExitCode.Config);
  assertStringIncludes(err.message, "--env");
  assert(!err.message.includes("no such env file"));
});

Deno.test("main: help still works without an env file", async () => {
  assertEquals(await main(["--help"]), 0);
});

// ---- end to end: real datasetd, fake ssh and scp on the PATH ---------------------

Deno.test("end to end: rows reach datasetd; an unreachable host exits 69 and leaves an error run", async () => {
  const { api, stop, port } = await startServer();
  const work = await Deno.makeTempDir({ prefix: "people_sync_e2e_" });
  const bin = join(work, "bin");
  await Deno.mkdir(bin);
  const reportFile = join(work, "report.json");
  await Deno.writeTextFile(reportFile, JSON.stringify(REPORT));
  // fake ssh: answers each remote command the way the real host would
  await Deno.writeTextFile(
    join(bin, "ssh"),
    `#!/bin/bash
last="\${@: -1}"
[ -n "$FAKE_SSH_DOWN" ] && { echo "ssh: connect failed" >&2; exit 255; }
case "$last" in
  *"print(1)"*) echo 1 ;;
  *"mktemp -d /tmp/people_sync_out"*) echo /tmp/people_sync_out.E2e ;;
  "mktemp -d /tmp/people_sync."*) echo /tmp/people_sync.E2e ;;
  *"cat /tmp/people_sync_out.E2e/report.json"*) cat "$FAKE_REPORT" ;;
  *) : ;;
esac
`,
    { mode: 0o755 },
  );
  await Deno.writeTextFile(join(bin, "scp"), "#!/bin/bash\nexit 0\n", {
    mode: 0o755,
  });
  const dir = await scriptsDir();
  const envFile = join(work, "test.env");
  await Deno.writeTextFile(
    envFile,
    `${ENV}IRDMTOOLS_SCRIPTS=${dir}\nCOLD_API_URL=http://127.0.0.1:${port}\n`,
  );
  const oldPath = Deno.env.get("PATH")!;
  const cwd = Deno.cwd();
  try {
    Deno.env.set("PATH", `${bin}:${oldPath}`);
    Deno.env.set("FAKE_REPORT", reportFile);
    Deno.chdir(work); // the lock lives in the working directory
    assertEquals(
      await main(["--env", envFile, "--trigger", "human"]),
      ExitCode.Ok,
    );
    const runs = await api.query(RUNS, "people_sync_latest_run");
    assertEquals(runs.length, 1);
    assertEquals(runs[0].state, "completed");
    assertEquals(runs[0].trigger, "human");
    assertEquals(runs[0].counts.people, 0); // the scratch people.ds is empty
    const items = await api.query(ITEMS, "people_sync_run_items", {
      run_id: runs[0].run_id,
    });
    assertEquals(items.length, 5);
    assertEquals(items[0].outcome, "needs_human");

    await new Promise((r) => setTimeout(r, 1100)); // "latest" orders by whole seconds
    Deno.env.set("FAKE_SSH_DOWN", "1");
    assertEquals(
      await code(() => main(["--env", envFile])),
      ExitCode.Unavailable,
    );
    const latest = await api.query(RUNS, "people_sync_latest_run");
    assertEquals(latest[0].state, "error");
    assert(latest[0].run_id !== runs[0].run_id);
    assertEquals(
      await Deno.stat(join(work, "people_sync.lock")).then(
        () => true,
        () => false,
      ),
      false,
    );
  } finally {
    Deno.chdir(cwd);
    Deno.env.set("PATH", oldPath);
    Deno.env.delete("FAKE_SSH_DOWN");
    await stop();
    await Deno.remove(work, { recursive: true });
  }
});
