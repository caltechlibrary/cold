/**
 * people_sync.ts is the COLD side of the COLD/RDM people sync (cold#122;
 * DR-0029 to DR-0035). It exports COLD's people, ships the instance-side
 * program from irdmtools to the RDM host, runs it there, and records the result
 * in `people_sync_runs.ds` and `people_sync_items.ds`.
 *
 * It does no matching and no writing to RDM itself: that is the irdmtools
 * program's job (people_rdm_apply.py), and it runs on the RDM instance.
 *
 * Exit codes follow the workspace convention (DR-0014); see ExitCode.
 */
import { parse as parseEnvText } from "@std/dotenv";
import { parseArgs } from "@std/cli/parse-args";
import { join, resolve } from "@std/path";
import { isValidClpid } from "./validator.ts";
import { licenseText, version } from "./version.ts";

/** ExitCode holds the exit codes this tool can return (workspace DR-0014). */
export const ExitCode = {
  Ok: 0,
  Usage: 2,
  NoInput: 66,
  Unavailable: 69,
  Internal: 70,
  IO: 74,
  TempFail: 75,
  Config: 78,
} as const;

/** SyncError is a failure that carries the exit code it should end the run with.
 *
 * @example
 * throw new SyncError(ExitCode.Config, "RDM_HOST has a space in it");
 */
export class SyncError extends Error {
  constructor(public code: number, message: string) {
    super(message);
    this.name = "SyncError";
  }
}

/** The three files shipped to the RDM instance, as a set (DR-0035 decision 2). */
export const PROGRAM_FILES = [
  "people_rdm_match.py",
  "people_rdm_apply.py",
  "people_rdm_export_names.py",
] as const;

/** Outcomes that get an item row (plan Phase 3); everything else is a count. */
export const ITEM_OUTCOMES = [
  "applied",
  "needs_human",
  "needs_repair",
  "warning",
] as const;

/** `info` actions that also get an item row (plan Phase 5 decision 1,
 * 2026-11-11): a possible alternate name is something a person may act on.
 * Every other `info` item (a person with no ORCID) is only counted. */
export const STORED_INFO_ACTIONS = ["alt_name_candidate"] as const;

/** Config is the per-deployment setting the sync runs with (DR-0033). */
export interface Config {
  rdmHost: string;
  instanceId: string;
  awsRegion: string;
  awsProfile: string;
  rdmUrl: string;
  rdmCheckout: string;
  rdmRunUser: string;
  scriptsDir: string;
  mode: "dry-run" | "apply";
  transport: "ssh" | "ssm";
  apiUrl: string;
  staleSeconds: number;
}

/** Exec runs a program and returns what it printed; tests replace it. */
export type Exec = (
  cmd: string,
  args: string[],
  opts?: { timeoutMs?: number },
) => Promise<{ code: number; stdout: string; stderr: string }>;

/** defaultExec runs a program with Deno.Command.
 *
 * @param cmd {string} the program
 * @param args {string[]} its arguments
 * @returns {Promise<{code:number,stdout:string,stderr:string}>} exit code and output
 * @example
 * const r = await defaultExec("echo", ["hi"]);
 */
export const defaultExec: Exec = async (cmd, args, opts) => {
  try {
    const out = await new Deno.Command(cmd, {
      args,
      stdout: "piped",
      stderr: "piped",
      signal: opts?.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
    }).output();
    const dec = new TextDecoder();
    return {
      code: out.code,
      stdout: dec.decode(out.stdout),
      stderr: dec.decode(out.stderr),
    };
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    return {
      code: timedOut ? 124 : 127,
      stdout: "",
      stderr: timedOut ? `${cmd} timed out` : String(err),
    };
  }
};

/** shellQuote quotes one word for a POSIX shell.
 *
 * @param s {string} the word
 * @returns {string} the word, single-quoted
 * @example
 * shellQuote("it's"); // 'it'\''s'
 */
export function shellQuote(s: string): string {
  return `'${s.replaceAll("'", `'\\''`)}'`;
}

/** loadConfig reads the per-deployment env file and checks it.
 *
 * @param text {string} the env file's text
 * @param baseDir {string} COLD's directory, the base for the default scripts directory
 * @param overrides {Record<string,string>} command line values that win over the file
 * @returns {Config} the validated configuration
 * @example
 * const cfg = loadConfig("RDM_HOST=h\nRDM_URL=https://x.test\n", "/Sites/cold", {});
 */
export function loadConfig(
  text: string,
  baseDir: string,
  overrides: Record<string, string> = {},
): Config {
  const env = { ...parseEnvText(text), ...overrides };
  const need = (k: string): string => {
    const v = (env[k] ?? "").trim();
    if (v === "") {
      throw new SyncError(
        ExitCode.NoInput,
        `${k} is not set in the env file: it names the target, so the sync will not run without it`,
      );
    }
    return v;
  };
  const check = (k: string, v: string, re: RegExp): string => {
    if (!re.test(v)) {
      throw new SyncError(ExitCode.Config, `${k} has an unusable value`);
    }
    return v;
  };
  const transport = env.PEOPLE_SYNC_TRANSPORT?.trim() || "ssh";
  if (transport !== "ssh" && transport !== "ssm") {
    throw new SyncError(
      ExitCode.Config,
      `PEOPLE_SYNC_TRANSPORT ${JSON.stringify(transport)} is not ssh or ssm`,
    );
  }
  const rdmHost = transport === "ssh"
    ? check("RDM_HOST", need("RDM_HOST"), /^[A-Za-z0-9._@-]+$/)
    : "";
  const instanceId = transport === "ssm"
    ? check("RDM_INSTANCE_ID", need("RDM_INSTANCE_ID"), /^i-[0-9a-f]{8,17}$/)
    : "";
  const awsRegion = env.AWS_REGION?.trim()
    ? check("AWS_REGION", env.AWS_REGION.trim(), /^[a-z]{2}(-[a-z]+)+-[0-9]$/)
    : "";
  const awsProfile = env.AWS_PROFILE?.trim()
    ? check("AWS_PROFILE", env.AWS_PROFILE.trim(), /^[A-Za-z0-9_.-]+$/)
    : "";
  const rdmUrl = check("RDM_URL", need("RDM_URL"), /^https?:\/\/[^\s']+$/);
  const rdmCheckout = check(
    "RDM_CHECKOUT",
    env.RDM_CHECKOUT?.trim() || "/Sites/caltechauthors",
    /^\/[A-Za-z0-9._\/-]+$/,
  );
  const rdmRunUser = check(
    "RDM_RUN_USER",
    env.RDM_RUN_USER?.trim() || "ubuntu",
    /^[a-z_][a-z0-9_-]*$/,
  );
  const mode = env.PEOPLE_SYNC_MODE?.trim() || "dry-run";
  if (mode !== "dry-run" && mode !== "apply") {
    throw new SyncError(
      ExitCode.Config,
      `PEOPLE_SYNC_MODE must be dry-run or apply, not ${JSON.stringify(mode)}`,
    );
  }
  const stale = Number(env.PEOPLE_SYNC_STALE_SECONDS ?? "3600");
  if (!Number.isFinite(stale) || stale <= 0) {
    throw new SyncError(
      ExitCode.Config,
      "PEOPLE_SYNC_STALE_SECONDS must be a positive number",
    );
  }
  return {
    rdmHost,
    instanceId,
    awsRegion,
    awsProfile,
    rdmUrl,
    rdmCheckout,
    rdmRunUser,
    scriptsDir: resolve(
      baseDir,
      env.IRDMTOOLS_SCRIPTS?.trim() || "../irdmtools/scripts",
    ),
    mode,
    transport,
    apiUrl: (env.COLD_API_URL?.trim() || "http://localhost:8112").replace(
      /\/+$/,
      "",
    ),
    staleSeconds: stale,
  };
}

/** Program is the shipped file set and its identity. */
export interface Program {
  files: { name: string; content: Uint8Array }[];
  hash: string;
  version: string;
}

/** loadProgram reads the three program files from the irdmtools scripts
 * directory, refusing an incomplete set, and hashes them (DR-0035 decisions 2, 3).
 *
 * @param dir {string} the irdmtools scripts directory
 * @returns {Promise<Program>} the files, a sha256 over names and contents, and the irdmtools version if readable
 * @example
 * const prog = await loadProgram("/Sites/irdmtools/scripts");
 */
export async function loadProgram(dir: string): Promise<Program> {
  const files: Program["files"] = [];
  const missing: string[] = [];
  for (const name of PROGRAM_FILES) {
    try {
      files.push({ name, content: await Deno.readFile(join(dir, name)) });
    } catch {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    throw new SyncError(
      ExitCode.NoInput,
      `${dir} is missing ${
        missing.join(", ")
      }; the program ships as a set, so nothing was sent`,
    );
  }
  const h = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      concat(
        files.flatMap((
          f,
        ) => [new TextEncoder().encode(`${f.name}\n`), f.content]),
      ),
    ),
  );
  let ver = "";
  try {
    const cm = JSON.parse(
      await Deno.readTextFile(join(dir, "..", "codemeta.json")),
    );
    ver = typeof cm.version === "string" ? cm.version : "";
  } catch { /* version is optional */ }
  return {
    files,
    hash: Array.from(h).map((b) => b.toString(16).padStart(2, "0")).join(""),
    version: ver,
  };
}

function concat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** remoteRunCommand builds the command string run on the RDM host under the
 * instance's own user, in the checkout, with a login shell (DR-0034).
 *
 * @param cfg {Config} the deployment settings
 * @param inner {string} the shell command to run in the checkout
 * @returns {string} the string handed to ssh
 * @example
 * remoteRunCommand(cfg, "uv run python -c 'print(1)'");
 */
export function remoteRunCommand(cfg: Config, inner: string): string {
  return `sudo -n -u ${cfg.rdmRunUser} bash -lc ${
    shellQuote(`cd ${shellQuote(cfg.rdmCheckout)} && ${inner}`)
  }`;
}

/** Transport moves the program to the RDM host, runs it and brings the report back. */
export interface Transport {
  preflight(): Promise<void>;
  run(
    req: { program: Program; people: string; apply: boolean; scope?: string },
  ): Promise<{ code: number; report: string; stderr: string }>;
}

const SSH_OPTS = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=15"];

/** SshTransport reaches the RDM host with ssh and scp, as the harvests do. */
export class SshTransport implements Transport {
  constructor(public cfg: Config, public exec: Exec = defaultExec) {}

  private ssh(remote: string) {
    return this.exec("ssh", [...SSH_OPTS, this.cfg.rdmHost, remote]);
  }

  private unavailable(what: string, r: { code: number; stderr: string }) {
    return new SyncError(
      ExitCode.Unavailable,
      `${what} failed (exit ${r.code}): ${r.stderr.trim()}`,
    );
  }

  /** preflight checks that the host answers and that sudo, the checkout and
   * uv work, before anything is shipped (DR-0034 decision 3). */
  async preflight(): Promise<void> {
    const r = await this.ssh(
      remoteRunCommand(this.cfg, `uv run python -c 'print(1)'`),
    );
    if (r.code !== 0 || r.stdout.trim() !== "1") {
      throw this.unavailable(
        `the preflight on ${this.cfg.rdmHost} (sudo to ${this.cfg.rdmRunUser}, ${this.cfg.rdmCheckout}, uv)`,
        r,
      );
    }
  }

  /** run ships the set, runs the program and fetches the report. The code is
   * the program's exit code; the working directories are removed either way. */
  async run(
    req: { program: Program; people: string; apply: boolean; scope?: string },
  ): Promise<{ code: number; report: string; stderr: string }> {
    const { cfg } = this;
    const mk = await this.ssh("mktemp -d /tmp/people_sync.XXXXXX");
    const dir = mk.stdout.trim();
    if (mk.code !== 0 || !/^\/tmp\/people_sync\.[A-Za-z0-9]+$/.test(dir)) {
      throw this.unavailable("creating a work directory", mk);
    }
    let out = "";
    const tmp = await Deno.makeTempDir({ prefix: "people_sync_ship_" });
    try {
      for (const f of req.program.files) {
        await Deno.writeFile(join(tmp, f.name), f.content);
      }
      await Deno.writeTextFile(join(tmp, "people.json"), req.people);
      const names = [...req.program.files.map((f) => f.name), "people.json"];
      const cp = await this.exec("scp", [
        ...SSH_OPTS,
        "-q",
        ...names.map((n) => join(tmp, n)),
        `${cfg.rdmHost}:${dir}/`,
      ]);
      if (cp.code !== 0) throw this.unavailable("copying the program", cp);
      // The run user reads the files from here, so they need to be readable
      // but stay writable only by the ssh user: the run user executes them.
      const ch = await this.ssh(`chmod 755 ${dir} && chmod 644 ${dir}/*`);
      if (ch.code !== 0) throw this.unavailable("setting permissions", ch);
      const mo = await this.ssh(
        `sudo -n -u ${cfg.rdmRunUser} mktemp -d /tmp/people_sync_out.XXXXXX`,
      );
      out = mo.stdout.trim();
      if (
        mo.code !== 0 || !/^\/tmp\/people_sync_out\.[A-Za-z0-9]+$/.test(out)
      ) {
        throw this.unavailable("creating the report directory", mo);
      }
      const args = [
        `${dir}/people_rdm_apply.py`,
        "--people",
        `${dir}/people.json`,
        "--out",
        `${out}/report.json`,
      ].map(shellQuote);
      args.push("--compact");
      if (req.apply) args.push("--apply");
      if (req.scope) args.push("--scope", shellQuote(req.scope));
      const run = await this.ssh(
        remoteRunCommand(this.cfg, `uv run python ${args.join(" ")}`),
      );
      if (run.code === 255) throw this.unavailable("the connection", run);
      // The report is owned by the run user and private, so read it as that user.
      const rep = await this.ssh(
        `sudo -n -u ${cfg.rdmRunUser} cat ${out}/report.json`,
      );
      return {
        code: run.code,
        report: rep.code === 0 ? rep.stdout : "",
        stderr: run.stderr,
      };
    } finally {
      await this.ssh(
        `rm -rf ${dir}; ${
          out ? `sudo -n -u ${cfg.rdmRunUser} rm -rf ${out}` : "true"
        }`,
      ).catch(() => {});
      await Deno.remove(tmp, { recursive: true }).catch(() => {});
    }
  }
}

/** toBase64 encodes bytes as base64 without building one huge argument list.
 *
 * @param bytes {Uint8Array} the data
 * @returns {string} base64 text, one line
 * @example
 * toBase64(new TextEncoder().encode("hi")); // "aGk="
 */
export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/** fromBase64 decodes base64 text to bytes.
 *
 * @param text {string} base64 text
 * @returns {Uint8Array} the data
 * @example
 * fromBase64("aGk="); // bytes of "hi"
 */
export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function streamBytes(
  data: Uint8Array<ArrayBuffer>,
  t: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Response(
    new Blob([data]).stream().pipeThrough(t as ReadableWritablePair),
  );
  return new Uint8Array(await out.arrayBuffer());
}

async function sha256Hex(data: Uint8Array<ArrayBuffer>): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(h).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** SSM limits (AWS-RunShellScript): a command's parameters stay under about
 * 97,000 characters, and an answer carries at most 24,000 of output. */
const SSM_PIECE = 60_000;
const SSM_COMMAND_MAX = 85_000;
const SSM_FETCH = 20_000;

/** SsmTransport reaches the RDM instance through AWS Systems Manager, for
 * hosts that ssh cannot reach (the development instance). Everything crosses
 * in SSM-sized pieces: files are gzipped, base64-encoded and appended to a
 * file on the instance, checked against their SHA-256 there; the report comes
 * back the same way and is checked here. The scripts it sends are POSIX sh,
 * because RunShellScript runs `sh`, not bash. */
export class SsmTransport implements Transport {
  constructor(
    public cfg: Config,
    public exec: Exec = defaultExec,
    public sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
    public pollSeconds = 1800,
  ) {}

  private aws(args: string[], timeoutMs = 60_000) {
    const pre: string[] = [];
    if (this.cfg.awsRegion) pre.push("--region", this.cfg.awsRegion);
    if (this.cfg.awsProfile) pre.push("--profile", this.cfg.awsProfile);
    return this.exec("aws", [...pre, ...args], { timeoutMs });
  }

  private unavailable(what: string, r: { code: number; stderr: string }) {
    return new SyncError(
      ExitCode.Unavailable,
      `${what} failed (exit ${r.code}): ${r.stderr.trim()}`,
    );
  }

  /** remote runs one shell script on the instance and returns its exit code
   * and output. A command SSM never ran, or lost, is an Unavailable error. */
  private async remote(
    script: string,
    what: string,
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    const dir = await Deno.makeTempDir({ prefix: "people_sync_ssm_" });
    try {
      const file = join(dir, "params.json");
      await Deno.writeTextFile(file, JSON.stringify({ commands: [script] }));
      const sent = await this.aws([
        "ssm",
        "send-command",
        "--instance-ids",
        this.cfg.instanceId,
        "--document-name",
        "AWS-RunShellScript",
        "--parameters",
        `file://${file}`,
        "--query",
        "Command.CommandId",
        "--output",
        "text",
      ]);
      const cid = sent.stdout.trim();
      if (sent.code !== 0 || cid === "") {
        throw this.unavailable(
          `sending ${what} to ${this.cfg.instanceId}`,
          sent,
        );
      }
      const deadline = Date.now() + this.pollSeconds * 1000;
      let misses = 0;
      while (true) {
        const got = await this.aws([
          "ssm",
          "get-command-invocation",
          "--command-id",
          cid,
          "--instance-id",
          this.cfg.instanceId,
          "--output",
          "json",
        ]);
        let inv: Record<string, unknown> | null = null;
        try {
          inv = got.code === 0 ? JSON.parse(got.stdout) : null;
        } catch { /* treated as a miss */ }
        if (inv === null) {
          // the invocation can be briefly unknown right after the send
          if (++misses > 5) {
            throw this.unavailable(`reading the result of ${what}`, got);
          }
          await this.sleep(1000);
          continue;
        }
        const status = String(inv.Status);
        if (status === "Success" || status === "Failed") {
          return {
            code: Number(inv.ResponseCode),
            stdout: String(inv.StandardOutputContent ?? ""),
            stderr: String(inv.StandardErrorContent ?? ""),
          };
        }
        if (!["Pending", "InProgress", "Delayed"].includes(status)) {
          throw new SyncError(
            ExitCode.Unavailable,
            `${what} on ${this.cfg.instanceId} ended as ${status}: ${
              String(inv.StandardErrorContent ?? "").trim()
            }`,
          );
        }
        if (Date.now() > deadline) {
          throw new SyncError(
            ExitCode.Unavailable,
            `${what} on ${this.cfg.instanceId} was still ${status} after ${this.pollSeconds} s`,
          );
        }
        await this.sleep(1000);
      }
    } finally {
      await Deno.remove(dir, { recursive: true }).catch(() => {});
    }
  }

  /** preflight checks the instance answers, has the tools the transport uses,
   * and that sudo, the checkout and uv work. */
  async preflight(): Promise<void> {
    const r = await this.remote(
      "command -v sha256sum base64 gzip >/dev/null && " +
        remoteRunCommand(this.cfg, `uv run python -c 'print(1)'`),
      "the preflight",
    );
    if (r.code !== 0 || r.stdout.trim() !== "1") {
      throw this.unavailable(
        `the preflight on ${this.cfg.instanceId} (sudo to ${this.cfg.rdmRunUser}, ${this.cfg.rdmCheckout}, uv)`,
        r,
      );
    }
  }

  /** run uploads the set and the people file, runs the program as the run
   * user, and fetches the report. The code is the program's exit code. */
  async run(
    req: { program: Program; people: string; apply: boolean; scope?: string },
  ): Promise<{ code: number; report: string; stderr: string }> {
    const { cfg } = this;
    const mk = await this.remote(
      `set -eu; W=$(mktemp -d /tmp/people_sync.XXXXXX); chmod 755 "$W"; ` +
        `O=$(sudo -n -u ${cfg.rdmRunUser} mktemp -d /tmp/people_sync_out.XXXXXX); ` +
        `echo "W=$W"; echo "O=$O"`,
      "creating the work directories",
    );
    const dir = /^W=(\/tmp\/people_sync\.[A-Za-z0-9]+)$/m.exec(mk.stdout)?.[1];
    const out = /^O=(\/tmp\/people_sync_out\.[A-Za-z0-9]+)$/m.exec(mk.stdout)
      ?.[1];
    if (mk.code !== 0 || !dir || !out) {
      if (dir || out) await this.cleanup(dir, out);
      throw this.unavailable("creating the work directories", mk);
    }
    try {
      const files = [
        ...req.program.files,
        { name: "people.json", content: new TextEncoder().encode(req.people) },
      ];
      // 1. upload, in pieces grouped into commands under SSM's limit
      const statements: string[] = [];
      const sums: string[] = [];
      for (const f of files) {
        const content = new Uint8Array(f.content);
        sums.push(`${await sha256Hex(content)}  ${f.name}`);
        const b64 = toBase64(
          await streamBytes(content, new CompressionStream("gzip")),
        );
        for (let at = 0; at < b64.length || at === 0; at += SSM_PIECE) {
          statements.push(
            `printf %s '${
              b64.slice(at, at + SSM_PIECE)
            }' >> "${dir}/${f.name}.b64"`,
          );
        }
      }
      let batch: string[] = [];
      let size = 0;
      const flush = async () => {
        if (batch.length === 0) return;
        const r = await this.remote(
          `set -eu; ${batch.join("; ")}`,
          "uploading the program",
        );
        if (r.code !== 0) throw this.unavailable("uploading the program", r);
        batch = [];
        size = 0;
      };
      for (const st of statements) {
        if (size + st.length > SSM_COMMAND_MAX) await flush();
        batch.push(st);
        size += st.length + 2;
      }
      await flush();
      // 2. decode, then verify every file against the hash computed here
      const names = files.map((f) => f.name).join(" ");
      const verify = await this.remote(
        `set -eu; cd "${dir}"; for f in ${names}; do ` +
          `base64 -d < "$f.b64" | gunzip > "$f"; rm -f "$f.b64"; done; ` +
          `printf '%s\\n' ${
            sums.map(shellQuote).join(" ")
          } | sha256sum -c - >/dev/null; ` +
          `chmod 644 ${names}`,
        "checking the uploaded files",
      );
      if (verify.code !== 0) {
        throw this.unavailable(
          "the uploaded files did not arrive intact; the check",
          verify,
        );
      }
      // 3. run the program as the run user
      const args = [
        `${dir}/people_rdm_apply.py`,
        "--people",
        `${dir}/people.json`,
        "--out",
        `${out}/report.json`,
      ].map(shellQuote);
      args.push("--compact");
      if (req.apply) args.push("--apply");
      if (req.scope) args.push("--scope", shellQuote(req.scope));
      const run = await this.remote(
        remoteRunCommand(cfg, `uv run python ${args.join(" ")}`),
        "the program",
      );
      // 4. pack the report on the instance (it is private to the run user)
      const pack = await this.remote(
        `set -eu; if [ -f "${out}/report.json" ]; then ` +
          `sudo -n -u ${cfg.rdmRunUser} gzip -9 -c "${out}/report.json" > "${dir}/report.gz"; ` +
          `base64 < "${dir}/report.gz" | tr -d '\\n' > "${dir}/report.b64"; ` +
          `echo "SIZE=$(wc -c < "${dir}/report.b64" | tr -d ' ')"; ` +
          `echo "SHA=$(sha256sum "${dir}/report.gz" | cut -d' ' -f1)"; ` +
          `else echo SIZE=0; fi`,
        "packing the report",
      );
      if (pack.code !== 0) throw this.unavailable("packing the report", pack);
      const reportSize = Number(
        /^SIZE=(\d+)$/m.exec(pack.stdout)?.[1] ?? "0",
      );
      if (reportSize === 0) {
        return { code: run.code, report: "", stderr: run.stderr };
      }
      const sha = /^SHA=([0-9a-f]{64})$/m.exec(pack.stdout)?.[1];
      // 5. fetch it in answer-sized pieces and check it
      let b64 = "";
      for (let off = 1; off <= reportSize; off += SSM_FETCH) {
        const piece = await this.remote(
          `tail -c +${off} "${dir}/report.b64" | head -c ${SSM_FETCH}`,
          "fetching the report",
        );
        if (piece.code !== 0) {
          throw this.unavailable("fetching the report", piece);
        }
        b64 += piece.stdout.replace(/\s+/g, "");
      }
      const gz = fromBase64(b64);
      if (!sha || (await sha256Hex(gz)) !== sha) {
        throw new SyncError(
          ExitCode.Unavailable,
          "the report did not arrive intact (checksum mismatch)",
        );
      }
      const report = new TextDecoder().decode(
        await streamBytes(gz, new DecompressionStream("gzip")),
      );
      return { code: run.code, report, stderr: run.stderr };
    } finally {
      await this.cleanup(dir, out);
    }
  }

  private async cleanup(dir?: string, out?: string) {
    const parts: string[] = [];
    if (dir) parts.push(`rm -rf "${dir}"`);
    if (out) parts.push(`sudo -n -u ${this.cfg.rdmRunUser} rm -rf "${out}"`);
    if (parts.length === 0) return;
    await this.remote(parts.join("; "), "cleaning up").catch(() => {});
  }
}

/** makeTransport returns the transport the configuration names.
 *
 * @param cfg {Config} the deployment settings
 * @returns {Transport} an SshTransport or an SsmTransport
 * @example
 * const t = makeTransport(cfg);
 */
export function makeTransport(cfg: Config): Transport {
  return cfg.transport === "ssm"
    ? new SsmTransport(cfg)
    : new SshTransport(cfg);
}

/** Plan item and result shapes read from the instance-side report. */
interface PlanItem {
  clpid: string;
  rdm_id: string | null;
  action: string;
  outcome: string;
  [k: string]: unknown;
}
interface Result {
  clpid: string;
  rdm_id: string | null;
  action: string;
  status: string;
  message: string;
  [k: string]: unknown;
}
/** Report is what people_rdm_apply.py writes. */
export interface Report {
  mode: string;
  scope: string | null;
  plan: PlanItem[];
  results: Result[];
  summary: Record<string, number>;
  aborted: string | null;
  /** set by --compact: `plan` has no info items and plan_counts counts every outcome */
  compact?: boolean;
  plan_counts?: Record<string, number>;
}

/** aboutPerson reports whether a plan item concerns one COLD person. An item's
 * own clpid is not enough: on a conflict it can be the RDM entry's clpid, which
 * COLD does not hold, while the COLD person it concerns is named in detail.cold.
 * Dropping those from a one-person run would make an unresolved problem look
 * resolved.
 *
 * @param item {PlanItem} a plan item
 * @param clpid {string} a COLD clpid
 * @returns {boolean} true when the item carries that clpid or names that person
 * @example
 * aboutPerson({ clpid: "Old-Id", detail: { cold: { "Alpha-A": {} } } }, "Alpha-A"); // true
 */
export function aboutPerson(item: PlanItem, clpid: string): boolean {
  const cold = (item.detail as { cold?: Record<string, unknown> } | undefined)
    ?.cold;
  return item.clpid === clpid ||
    (cold !== undefined && Object.hasOwn(cold, clpid));
}

/** itemsFromReport turns a report into the item rows to store and the
 * per-outcome counts for the run row (plan Phase 3).
 *
 * Only applied, needs_human, needs_repair and warning get a row, and so does
 * an `info` item whose action is in STORED_INFO_ACTIONS (an alt_name_candidate);
 * every other `info` item is counted. An applied item carries the status of
 * what happened to it. A one-person run keeps only that person's items and
 * counts.
 *
 * @param report {Report} the parsed report
 * @param runId {string} the run the rows belong to
 * @param recorded {string} "YYYY-MM-DD HH:MM:SS"
 * @returns {{items: {key: string, row: Record<string, unknown>}[], counts: Record<string, number>}} rows and counts
 * @example
 * const { items, counts } = itemsFromReport(report, "r1", "2026-11-10 09:00:00");
 */
export function itemsFromReport(
  report: Report,
  runId: string,
  recorded: string,
): {
  items: { key: string; row: Record<string, unknown> }[];
  counts: Record<string, number>;
} {
  const scope = report.scope;
  const plan = report.plan.filter((i) =>
    scope == null || aboutPerson(i, scope)
  );
  const byEntry = new Map<string, Result>();
  const byCreate = new Map<string, Result>();
  for (const r of report.results) {
    if (r.action === "create") byCreate.set(r.clpid, r);
    else if (r.rdm_id != null) byEntry.set(r.rdm_id, r);
  }
  const counts: Record<string, number> = {};
  const rows: Record<string, unknown>[] = [];
  const keep = new Set<string>(ITEM_OUTCOMES);
  const keepInfo = new Set<string>(STORED_INFO_ACTIONS);
  for (const it of plan) {
    counts[it.outcome] = (counts[it.outcome] ?? 0) + 1;
    if (
      !keep.has(it.outcome) &&
      !(it.outcome === "info" && keepInfo.has(it.action))
    ) continue;
    const row: Record<string, unknown> = { run_id: runId, ...it, recorded };
    if (it.outcome === "applied") {
      const res = it.action === "create"
        ? byCreate.get(it.clpid)
        : byEntry.get(String(it.rdm_id));
      row.status = res?.status ?? "not_attempted";
      if (res?.message) row.result_message = res.message;
    }
    rows.push(row);
  }
  const order = (o: unknown) => {
    const i = ["needs_human", "needs_repair", "warning", "applied", "info"]
      .indexOf(String(o));
    return i < 0 ? 9 : i;
  };
  rows.sort((a, b) =>
    order(a.outcome) - order(b.outcome) ||
    String(a.clpid).localeCompare(String(b.clpid))
  );
  if (report.compact && report.plan_counts) {
    for (const k of Object.keys(counts)) delete counts[k];
    Object.assign(counts, report.plan_counts);
  }
  return {
    items: rows.map((row, i) => ({
      key: `${runId}-${String(i + 1).padStart(5, "0")}`,
      row,
    })),
    counts,
  };
}

/** Store keeps run and item rows; the real one talks to datasetd. */
export interface Store {
  people(): Promise<unknown[]>;
  putRun(key: string, row: Record<string, unknown>): Promise<void>;
  putItem(key: string, row: Record<string, unknown>): Promise<void>;
}

/** ApiStore is a Store over COLD's datasetd JSON API. */
export class ApiStore implements Store {
  constructor(public base: string) {}

  private async send(method: string, url: string, body: unknown) {
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new SyncError(
        ExitCode.Unavailable,
        `COLD's API at ${this.base} cannot be reached: ${err}`,
      );
    }
    const text = await res.text();
    if (!res.ok) {
      throw new SyncError(
        ExitCode.IO,
        `${method} ${url}: ${res.status} ${text.trim()}`,
      );
    }
    return text;
  }

  /** people returns COLD's identity export (the people_sync_export query). */
  async people(): Promise<unknown[]> {
    const text = await this.send(
      "POST",
      `${this.base}/api/people.ds/query/people_sync_export`,
      {},
    );
    return JSON.parse(text);
  }

  /** putRun creates the run row, or replaces it when it exists. */
  async putRun(key: string, row: Record<string, unknown>): Promise<void> {
    await this.put("people_sync_runs.ds", key, row);
  }

  /** putItem creates one item row. */
  async putItem(key: string, row: Record<string, unknown>): Promise<void> {
    await this.put("people_sync_items.ds", key, row);
  }

  private async put(c: string, key: string, row: Record<string, unknown>) {
    const url = `${this.base}/api/${c}/object/${encodeURIComponent(key)}`;
    try {
      await this.send("POST", url, row);
    } catch (err) {
      if (err instanceof SyncError && err.code === ExitCode.IO) {
        await this.send("PUT", url, row); // the row exists: update it
      } else throw err;
    }
  }
}

/** stamp formats a date as "YYYY-MM-DD HH:MM:SS" in UTC.
 *
 * @param d {Date} the time
 * @returns {string} the stamp
 * @example
 * stamp(new Date(0)); // "1970-01-01 00:00:00"
 */
export function stamp(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/** Lock is a mkdir lock with stale-owner recovery, as the harvest's (DR-0020). */
export class Lock {
  held = false;
  constructor(
    public dir: string,
    public staleSeconds: number,
    public now: () => Date = () => new Date(),
    public pidAlive: (pid: number) => Promise<boolean> = defaultPidAlive,
  ) {}

  /** acquire takes the lock or throws TempFail when another run holds it. A
   * lock whose owner is gone, or which is older than the stale window, is
   * cleared first. */
  async acquire(): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await Deno.mkdir(this.dir);
        await Deno.writeTextFile(
          join(this.dir, "owner"),
          `${Deno.pid} ${this.now().toISOString()}\n`,
        );
        this.held = true;
        return;
      } catch (err) {
        if (!(err instanceof Deno.errors.AlreadyExists)) throw err;
      }
      let pid = 0;
      let when = 0;
      try {
        const [p, t] = (await Deno.readTextFile(join(this.dir, "owner")))
          .trim().split(" ");
        pid = Number(p);
        when = Date.parse(t);
      } catch { /* no owner file: treat as unknown and stale by age below */ }
      const age = Number.isFinite(when)
        ? (this.now().getTime() - when) / 1000
        : Infinity;
      const dead = pid > 0 && !(await this.pidAlive(pid));
      if (dead || age > this.staleSeconds) {
        await Deno.remove(this.dir, { recursive: true });
        continue;
      }
      throw new SyncError(
        ExitCode.TempFail,
        `another people sync is running (pid ${pid || "unknown"}, since ${
          Number.isFinite(when) ? new Date(when).toISOString() : "unknown"
        })`,
      );
    }
    throw new SyncError(
      ExitCode.TempFail,
      "could not take the people sync lock",
    );
  }

  /** release gives the lock up if this run holds it. */
  async release(): Promise<void> {
    if (!this.held) return;
    this.held = false;
    await Deno.remove(this.dir, { recursive: true }).catch(() => {});
  }
}

/** defaultPidAlive asks the OS whether a process exists.
 *
 * @param pid {number} the process id
 * @returns {Promise<boolean>} true when it is running
 * @example
 * await defaultPidAlive(Deno.pid); // true
 */
export async function defaultPidAlive(pid: number): Promise<boolean> {
  const r = await defaultExec("kill", ["-0", String(pid)]);
  return r.code === 0;
}

/** Options are the per-run inputs. */
export interface Options {
  scope: string;
  trigger: string;
  requestId: string;
}

/** runSync performs one sync: lock, run row, export, ship, run, store, close.
 *
 * A run row exists from the start in state `running`, and is closed as
 * `completed` or `error` whatever happens after it was created.
 *
 * @param cfg {Config} the deployment settings
 * @param opts {Options} scope ("all" or "clpid:<id>"), trigger and request id
 * @param deps {{store: Store, transport: Transport, lock: Lock, program: Program, now?: () => Date}} collaborators
 * @returns {Promise<{code: number, summary: string}>} the exit code and the one-line summary
 * @example
 * const r = await runSync(cfg, { scope: "all", trigger: "cron", requestId: "" }, deps);
 */
export async function runSync(
  cfg: Config,
  opts: Options,
  deps: {
    store: Store;
    transport: Transport;
    lock: Lock;
    program: Program;
    now?: () => Date;
  },
): Promise<{ code: number; summary: string }> {
  const now = deps.now ?? (() => new Date());
  const { store, transport, program } = deps;
  const scopeClpid = opts.scope.startsWith("clpid:") ? opts.scope.slice(6) : "";
  if (opts.scope !== "all" && !isValidClpid(scopeClpid)) {
    throw new SyncError(
      ExitCode.Usage,
      `scope must be "all" or "clpid:<id>", not ${JSON.stringify(opts.scope)}`,
    );
  }
  await deps.lock.acquire();
  const runId = `${stamp(now()).replace(/[-: ]/g, "")}-${
    crypto.randomUUID().slice(0, 8)
  }`;
  const run: Record<string, unknown> = {
    run_id: runId,
    request_id: opts.requestId,
    trigger: opts.trigger,
    scope: opts.scope,
    rdm_url: cfg.rdmUrl,
    mode: cfg.mode,
    state: "running",
    started: stamp(now()),
    finished: "",
    counts: {},
    program_hash: program.hash,
    irdmtools_version: program.version,
  };
  try {
    await store.putRun(runId, run);
    await transport.preflight();
    const people = await store.people();
    const res = await transport.run({
      program,
      people: JSON.stringify(people),
      apply: cfg.mode === "apply",
      scope: scopeClpid || undefined,
    });
    if (res.report === "") {
      throw new SyncError(
        res.code === 69 ? ExitCode.Unavailable : ExitCode.Internal,
        `the program exited ${res.code} and left no report: ${res.stderr.trim()}`,
      );
    }
    let report: Report;
    try {
      report = JSON.parse(res.report);
    } catch {
      throw new SyncError(ExitCode.Internal, "the report is not JSON");
    }
    const { items, counts } = itemsFromReport(report, runId, stamp(now()));
    for (const it of items) await store.putItem(it.key, it.row);
    const failed = res.code !== 0 || report.aborted != null;
    run.counts = {
      ...counts,
      people: scopeClpid ? 1 : people.length,
      results: report.summary,
    };
    run.state = failed ? "error" : "completed";
    if (failed) {
      run.error = report.aborted ??
        `the program exited ${res.code}: some writes failed`;
    }
    run.finished = stamp(now());
    await store.putRun(runId, run);
    const line = `people sync ${runId} (${cfg.mode}, ${opts.scope}): ` +
      Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ");
    return { code: failed ? ExitCode.Internal : ExitCode.Ok, summary: line };
  } catch (err) {
    run.state = "error";
    run.error = err instanceof Error ? err.message : String(err);
    run.finished = stamp(now());
    await store.putRun(runId, run).catch(() => {});
    throw err;
  } finally {
    await deps.lock.release();
  }
}

const HELP = `
people_sync - run the COLD/RDM people sync and record the result in COLD

USAGE: people_sync [OPTIONS]

Exports COLD's people, ships the irdmtools program to the RDM host, runs it
there, and writes a run row and item rows to people_sync_runs.ds and
people_sync_items.ds. The default is a dry run; PEOPLE_SYNC_MODE=apply in the
env file turns writing on.

OPTIONS
  -e, --env FILE       env file (default caltechauthors.env)
  -s, --scope CLPID    sync one person (default: everyone)
      --trigger NAME   who started it: human, cron (recorded; default unknown)
      --request-id ID  the report request that started it (recorded)
  -h, --help           show this help
  -v, --version        show the version
  -l, --license        show the license

ENV FILE KEYS
  PEOPLE_SYNC_TRANSPORT  ssh (default) or ssm (AWS Systems Manager)
  RDM_HOST             ssh host of the RDM instance (required for ssh)
  RDM_INSTANCE_ID      EC2 instance id i-... (required for ssm)
  AWS_REGION, AWS_PROFILE  optional, for the aws CLI (ssm)
  RDM_URL (required)   the target's public URL, recorded on every run
  RDM_CHECKOUT         the RDM checkout on that host (/Sites/caltechauthors)
  RDM_RUN_USER         the user the program runs as (ubuntu)
  IRDMTOOLS_SCRIPTS    irdmtools scripts directory (../irdmtools/scripts)
  PEOPLE_SYNC_MODE     dry-run (default) or apply
  PEOPLE_SYNC_STALE_SECONDS  age after which a lock is stale (3600)
  COLD_API_URL         COLD's datasetd (http://localhost:8112)

EXIT STATUS
  0 completed (items needing a person are in the page, not an error)
  2 usage    66 no env file, no target or no program files
  69 RDM host or COLD API unreachable    70 the program failed or a write failed
  74 a COLD write failed    75 another sync holds the lock    78 bad env file
`;

/** main is the command line entry point.
 *
 * @param argv {string[]} the arguments
 * @returns {Promise<number>} the exit code
 * @example
 * Deno.exit(await main(Deno.args));
 */
export async function main(argv: string[]): Promise<number> {
  const a = parseArgs(argv, {
    string: ["env", "scope", "trigger", "request-id"],
    boolean: ["help", "version", "license"],
    alias: { e: "env", s: "scope", h: "help", v: "version", l: "license" },
    default: { env: "caltechauthors.env", trigger: "unknown" },
    unknown: (arg) => {
      if (arg.startsWith("-")) {
        throw new SyncError(ExitCode.Usage, `unknown option ${arg}`);
      }
      return true;
    },
  });
  if (a.help) {
    console.log(HELP);
    return ExitCode.Ok;
  }
  if (a.version) {
    console.log(`people_sync ${version}`);
    return ExitCode.Ok;
  }
  if (a.license) {
    console.log(licenseText);
    return ExitCode.Ok;
  }
  if (a._.length > 0) {
    throw new SyncError(ExitCode.Usage, "no arguments are taken; see --help");
  }
  let text: string;
  try {
    text = await Deno.readTextFile(a.env);
  } catch {
    throw new SyncError(ExitCode.NoInput, `${a.env}: no such env file`);
  }
  const cfg = loadConfig(text, Deno.cwd());
  const program = await loadProgram(cfg.scriptsDir);
  const result = await runSync(
    cfg,
    {
      scope: a.scope ? `clpid:${a.scope}` : "all",
      trigger: a.trigger,
      requestId: a["request-id"] ?? Deno.env.get("COLD_REQUEST_ID") ?? "",
    },
    {
      store: new ApiStore(cfg.apiUrl),
      transport: makeTransport(cfg),
      lock: new Lock(join(Deno.cwd(), "people_sync.lock"), cfg.staleSeconds),
      program,
    },
  );
  console.log(result.summary);
  return result.code;
}

if (import.meta.main) {
  try {
    Deno.exit(await main(Deno.args));
  } catch (err) {
    if (err instanceof SyncError) {
      console.error(`people_sync: ${err.message}`);
      Deno.exit(err.code);
    }
    console.error(`people_sync: ${err}`);
    Deno.exit(ExitCode.Internal);
  }
}
