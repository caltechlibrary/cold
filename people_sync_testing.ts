/**
 * people_sync_testing.ts holds the scratch datasetd the people sync tests share:
 * it starts its OWN `datasetd` on a free port, in a temp directory, with fresh
 * collections and a copy of cold_api.yaml cut to the collections under test, so
 * a test never touches a running COLD. It needs `dataset` and `datasetd` on the
 * PATH, as COLD itself does.
 */
import { assert } from "@std/assert";
import { join } from "@std/path";
import { parse, stringify } from "@std/yaml";

export const RUNS = "people_sync_runs.ds";
export const ITEMS = "people_sync_items.ds";
export const PEOPLE = "people.ds";
export const REPORTS = "reports.ds";

/** freePort returns a TCP port nothing is listening on.
 *
 * @returns {number} a port number
 * @example
 * const port = freePort();
 */
function freePort(): number {
  const l = Deno.listen({ port: 0, hostname: "127.0.0.1" });
  const port = (l.addr as Deno.NetAddr).port;
  l.close();
  return port;
}

/** Api is a minimal client for the scratch datasetd. */
export class Api {
  constructor(public base: string) {}

  /** create stores one object under a key.
   *
   * @param c {string} collection name, such as "people_sync_runs.ds"
   * @param key {string} the object key
   * @param obj {unknown} the object
   * @returns {Promise<void>} resolves when stored, throws otherwise
   * @example
   * await api.create(RUNS, "run-1", { state: "running" });
   */
  async create(c: string, key: string, obj: unknown): Promise<void> {
    const res = await fetch(`${this.base}/api/${c}/object/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj),
    });
    const body = await res.text();
    assert(res.ok, `create ${c}/${key}: ${res.status} ${body}`);
  }

  /** read returns one object by key.
   *
   * @param c {string} collection name
   * @param key {string} the object key
   * @returns {Promise<any>} the object
   * @example
   * const run = await api.read(RUNS, "run-1");
   */
  // deno-lint-ignore no-explicit-any
  async read(c: string, key: string): Promise<any> {
    const res = await fetch(`${this.base}/api/${c}/object/${key}`);
    const body = await res.text();
    assert(res.ok, `read ${c}/${key}: ${res.status} ${body}`);
    return JSON.parse(body);
  }

  /** query runs a named query. A query with a bound parameter is called as
   * POST /api/<c>/query/<name>/<field> with a JSON body carrying the field.
   *
   * @param c {string} collection name
   * @param name {string} the named query
   * @param params {Record<string,string>} bound parameters, in order
   * @returns {Promise<any[]>} the rows
   * @example
   * const rows = await api.query(ITEMS, "people_sync_run_items", { run_id: "r1" });
   */
  // deno-lint-ignore no-explicit-any
  async query(
    c: string,
    name: string,
    params: Record<string, string> = {},
    // deno-lint-ignore no-explicit-any
  ): Promise<any[]> {
    const fields = Object.keys(params);
    const path = fields.length ? `${name}/${fields.join("/")}` : name;
    const res = await fetch(`${this.base}/api/${c}/query/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const body = await res.text();
    assert(res.ok, `query ${c}/${name}: ${res.status} ${body}`);
    return JSON.parse(body);
  }
}

/** run executes a command in a directory and throws if it fails.
 *
 * @param cwd {string} working directory
 * @param cmd {string[]} the command and arguments
 * @returns {Promise<void>} resolves on exit 0
 * @example
 * await run(dir, ["dataset", "init", "x.ds", "sqlite://collection.db"]);
 */
async function run(cwd: string, cmd: string[]): Promise<void> {
  const out = await new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    cwd,
    stdout: "piped",
    stderr: "piped",
  }).output();
  assert(
    out.success,
    `${cmd.join(" ")} failed: ${new TextDecoder().decode(out.stderr)}`,
  );
}

/** startServer builds the scratch directory, collections and config, and
 * starts datasetd.
 *
 * @returns {Promise<{api: Api, stop: () => Promise<void>}>} the client and a stopper
 * @example
 * const { api, stop } = await startServer();          // the people sync collections
 * const { api: a2 } = await startServer([REPORTS]);    // and the report queue as well
 */
export async function startServer(extra: string[] = []): Promise<
  { api: Api; stop: () => Promise<void>; port: number }
> {
  const dir = await Deno.makeTempDir({ prefix: "people_sync_test_" });
  const port = freePort();
  const cfg = parse(
    await Deno.readTextFile(new URL("./cold_api.yaml", import.meta.url)),
    // deno-lint-ignore no-explicit-any
  ) as any;
  const wanted = [RUNS, ITEMS, PEOPLE, ...extra];
  const collections = cfg.collections.filter(
    // deno-lint-ignore no-explicit-any
    (c: any) => wanted.includes(c.dataset),
  );
  for (const w of wanted) {
    assert(
      // deno-lint-ignore no-explicit-any
      collections.some((c: any) => c.dataset === w),
      `cold_api.yaml has no ${w} stanza`,
    );
    await run(dir, ["dataset", "init", w, "sqlite://collection.db"]);
  }
  cfg.host = `127.0.0.1:${port}`;
  delete cfg.htdocs;
  cfg.collections = collections;
  await Deno.writeTextFile(join(dir, "scratch_api.yaml"), stringify(cfg));
  const child = new Deno.Command("datasetd", {
    args: ["scratch_api.yaml"],
    cwd: dir,
    stdout: "null",
    stderr: "null",
  }).spawn();
  const base = `http://127.0.0.1:${port}`;
  let up = false;
  for (let i = 0; i < 50 && !up; i++) {
    try {
      const r = await fetch(`${base}/api/${RUNS}/keys`);
      await r.body?.cancel();
      up = true;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  assert(up, "scratch datasetd did not start");
  return {
    api: new Api(base),
    port,
    stop: async () => {
      child.kill("SIGTERM");
      await child.status;
      await Deno.remove(dir, { recursive: true });
    },
  };
}
