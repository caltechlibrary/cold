/**
 * rdm_test.ts
 *
 * Tests for rdm.ts: the `/rdm` routes (plan Phase 5 finding 7) and the one route
 * so far, `/rdm/people_sync/target`, which tells the sync page where the NEXT run
 * will go (Phase 5 decision 3: no production button until the page shows it). The
 * route returns three whitelisted, non-secret settings from the env file the
 * sync shim uses, and nothing else.
 *
 * Run:
 *   deno test --allow-read --allow-write --allow-env rdm_test.ts
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import * as path from "@std/path";
import { join } from "@std/path";
import { ColdReadWriteHandler } from "./cold.ts";
import { handleRDM, isRdmPath, TARGET_KEYS } from "./rdm.ts";

/** An env file with secrets and settings the page must never see. */
const ENV = `# a development target
RDM_URL=https://authors.example.test
PEOPLE_SYNC_TRANSPORT=ssm
RDM_INSTANCE_ID=i-0123456789abcdef0
RDM_HOST=secret-host.internal
AWS_PROFILE=secret-profile
AWS_REGION=us-west-2
RDM_CHECKOUT=/Sites/secret-checkout
RDM_RUN_USER=secretuser
COLD_API_URL=http://secret-api:9999
SOME_TOKEN=tok-abc-123
PEOPLE_SYNC_MODE=apply
`;

/** envFile writes an env file and returns its path. */
async function envFile(text = ENV): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix: "rdm_env_" });
  const file = join(dir, "x.env");
  await Deno.writeTextFile(file, text);
  return file;
}

/** target asks the route with PEOPLE_SYNC_ENV set (or unset) for the duration of the call. */
async function target(
  file: string | undefined,
  init: RequestInit = {},
): Promise<Response> {
  const saved = Deno.env.get("PEOPLE_SYNC_ENV");
  if (file === undefined) Deno.env.delete("PEOPLE_SYNC_ENV");
  else Deno.env.set("PEOPLE_SYNC_ENV", file);
  try {
    return await handleRDM(
      new Request("http://localhost:8111/rdm/people_sync/target", init),
      "/rdm/people_sync/target",
    );
  } finally {
    if (saved === undefined) Deno.env.delete("PEOPLE_SYNC_ENV");
    else Deno.env.set("PEOPLE_SYNC_ENV", saved);
  }
}

Deno.test("isRdmPath: /rdm and /rdm/... only, on a path boundary", () => {
  for (const yes of ["/rdm", "/rdm/", "/rdm/people_sync/target", "/rdm/x/y"]) {
    assert(isRdmPath(yes), yes);
  }
  for (
    const no of [
      "/rdm_people_sync.html",
      "/rdmx",
      "/rdm.html",
      "/rdms/people",
      "/people",
      "/",
      "",
      "/x/rdm",
    ]
  ) assert(!isRdmPath(no), no);
});

Deno.test("target: returns the mode, the RDM URL and the transport, and nothing else", async () => {
  const res = await target(await envFile());
  assertEquals(res.status, 200);
  assertEquals(await res.json(), {
    mode: "apply",
    rdm_url: "https://authors.example.test",
    transport: "ssm",
  });
});

Deno.test("target: the whitelist is exactly three keys", () => {
  assertEquals([...TARGET_KEYS].sort(), ["mode", "rdm_url", "transport"]);
});

Deno.test("target: no secret, host, profile, checkout or token is ever in the body", async () => {
  const body = await (await target(await envFile())).text();
  for (
    const secret of [
      "secret-host",
      "secret-profile",
      "secret-checkout",
      "secretuser",
      "secret-api",
      "tok-abc-123",
      "i-0123456789abcdef0",
      "us-west-2",
    ]
  ) assert(!body.includes(secret), `${secret} leaked`);
});

Deno.test("target: defaults are the sync's own: dry-run and ssh", async () => {
  const res = await target(
    await envFile("RDM_URL=https://a.example.test\nRDM_HOST=h\n"),
  );
  assertEquals(await res.json(), {
    mode: "dry-run",
    rdm_url: "https://a.example.test",
    transport: "ssh",
  });
});

Deno.test("target: JSON, never cached, so a changed env file shows on the next look", async () => {
  const res = await target(await envFile());
  assertStringIncludes(
    res.headers.get("content-type") ?? "",
    "application/json",
  );
  assertEquals(res.headers.get("cache-control"), "no-store");
  await res.body?.cancel();
});

Deno.test("target: PEOPLE_SYNC_ENV unset is a 503 that names the setting", async () => {
  const res = await target(undefined);
  assertEquals(res.status, 503);
  const body = await res.json();
  assertStringIncludes(body.error, "PEOPLE_SYNC_ENV");
});

Deno.test("target: an env file that cannot be read is a 503 that does not name its path", async () => {
  const res = await target("/no/such/dir/people_sync.env");
  assertEquals(res.status, 503);
  const text = JSON.stringify(await res.json());
  assertStringIncludes(text, "cannot be read");
  assert(!text.includes("/no/such/dir"));
});

Deno.test("target: an env file the sync would refuse is a 503 with the sync's own reason", async () => {
  const res = await target(
    await envFile(
      "RDM_URL=https://a.example.test\nRDM_HOST=h\nPEOPLE_SYNC_MODE=yolo\n",
    ),
  );
  assertEquals(res.status, 503);
  assertStringIncludes((await res.json()).error, "PEOPLE_SYNC_MODE");
});

Deno.test("target: only GET; anything else is 405 with Allow", async () => {
  for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
    const res = await target(await envFile(), { method, body: "{}" });
    assertEquals(res.status, 405, method);
    assertEquals(res.headers.get("allow"), "GET");
    await res.body?.cancel();
  }
});

Deno.test("rdm: any other path under /rdm is a 404, including /rdm itself", async () => {
  for (
    const p of [
      "/rdm",
      "/rdm/",
      "/rdm/people_sync",
      "/rdm/people_sync/target/x",
      "/rdm/nope",
    ]
  ) {
    const res = await handleRDM(new Request(`http://localhost:8111${p}`), p);
    assertEquals(res.status, 404, p);
    await res.body?.cancel();
  }
});

// ---- the router -------------------------------------------------------------

const OPTIONS = {
  debug: false,
  htdocs: "./htdocs",
  baseUrl: "http://localhost:8111",
  apiUrl: "http://localhost:8112",
};

Deno.test("router: /rdm/people_sync/target reaches the handler, with and without the base path", async () => {
  const file = await envFile();
  const saved = Deno.env.get("PEOPLE_SYNC_ENV");
  Deno.env.set("PEOPLE_SYNC_ENV", file);
  try {
    const plain = await ColdReadWriteHandler(
      new Request("http://localhost:8111/rdm/people_sync/target"),
      OPTIONS,
    );
    assertEquals(plain.status, 200);
    assertEquals((await plain.json()).mode, "apply");
    const based = await ColdReadWriteHandler(
      new Request("https://apps.example.test/cold/rdm/people_sync/target"),
      { ...OPTIONS, baseUrl: "https://apps.example.test/cold" },
    );
    assertEquals(based.status, 200);
    await based.body?.cancel();
  } finally {
    if (saved === undefined) Deno.env.delete("PEOPLE_SYNC_ENV");
    else Deno.env.set("PEOPLE_SYNC_ENV", saved);
  }
});

Deno.test("router: the static RDM pages and look-alike paths do not reach the /rdm handler", async () => {
  const page = await ColdReadWriteHandler(
    new Request("http://localhost:8111/rdm_people_sync.html"),
    OPTIONS,
  );
  assertEquals(page.status, 200);
  assertStringIncludes(page.headers.get("content-type") ?? "", "text/html");
  await page.body?.cancel();
  for (const p of ["/rdmx", "/rdm.html", "/rdms/people_sync/target"]) {
    const res = await ColdReadWriteHandler(
      new Request(`http://localhost:8111${p}`),
      OPTIONS,
    );
    assertEquals(res.status, 404, p);
    await res.body?.cancel();
  }
});

// ---- running without the env permission --------------------------------------------------
//
// `cold` is started with a narrow set of permissions. Without --allow-env, Deno.env.get
// does not just fail: at a terminal it PROMPTS and the request waits for an answer, so a
// route that needs the variable must not be able to hang the page that asks for it.

Deno.test("target: a process without env permission answers 503 and names the permission, and never prompts", async () => {
  const dir = await Deno.makeTempDir({ prefix: "rdm_noenv_" });
  const probe = path.join(dir, "probe.ts");
  const handler = new URL("./rdm.ts", import.meta.url).href;
  const config = path.fromFileUrl(new URL("./deno.json", import.meta.url));
  await Deno.writeTextFile(
    probe,
    `import { handleRDM } from "${handler}";
     const r = await handleRDM(new Request("http://x/rdm/people_sync/target"), "/rdm/people_sync/target");
     console.log(r.status, await r.text());`,
  );
  // `deno run` with no --allow-env (and --no-prompt, so a missing permission is an error, not a question)
  const out = await new Deno.Command(Deno.execPath(), {
    args: ["run", "--no-prompt", "--allow-read", "--config", config, probe],
    env: { PEOPLE_SYNC_ENV: "/does/not/matter" },
    stdout: "piped",
    stderr: "piped",
  }).output();
  const text = new TextDecoder().decode(out.stdout);
  assertStringIncludes(text, "503");
  assertStringIncludes(text, "--allow-env");
  assertStringIncludes(text, "PEOPLE_SYNC_ENV");
});

Deno.test("deno.json: the tasks that run or compile cold grant env access to PEOPLE_SYNC_ENV and nothing wider", async () => {
  const tasks = JSON.parse(
    await Deno.readTextFile(new URL("./deno.json", import.meta.url)),
  ).tasks as Record<string, string>;
  for (const name of ["cold", "cold.ts"]) {
    assertStringIncludes(tasks[name], "--allow-env=PEOPLE_SYNC_ENV");
    assert(!/--allow-env(\s|$)/.test(tasks[name]), `${name} grants all env`);
    assert(!tasks[name].includes("--allow-all"), `${name} grants everything`);
  }
});

// ---- static files are revalidated, not trusted from the browser's cache ------------------
//
// An ES module a page imports is cached by the browser with no questions asked unless the
// server says otherwise. After a rebuild a person kept running the old people_sync_page.js
// and saw items worded by the old code. `no-cache` makes the browser ask each time; the
// ETag keeps that cheap (a 304 when nothing changed).

Deno.test("router: static files carry Cache-Control: no-cache and keep their ETag", async () => {
  for (const p of ["/rdm_people_sync.html", "/modules/people_sync_page.js"]) {
    const res = await ColdReadWriteHandler(
      new Request(`http://localhost:8111${p}`),
      OPTIONS,
    );
    assertEquals(res.status, 200, p);
    assertEquals(res.headers.get("cache-control"), "no-cache", p);
    assert(res.headers.get("etag"), `${p} lost its ETag`);
    await res.body?.cancel();
  }
});

Deno.test("router: a conditional request for an unchanged static file is a 304", async () => {
  const first = await ColdReadWriteHandler(
    new Request("http://localhost:8111/modules/people_sync_page.js"),
    OPTIONS,
  );
  const etag = first.headers.get("etag")!;
  await first.body?.cancel();
  const again = await ColdReadWriteHandler(
    new Request("http://localhost:8111/modules/people_sync_page.js", {
      headers: { "if-none-match": etag },
    }),
    OPTIONS,
  );
  assertEquals(again.status, 304);
  assertEquals(again.headers.get("cache-control"), "no-cache");
  await again.body?.cancel();
});

Deno.test("router: the /rdm JSON routes are unaffected (still no-store)", async () => {
  const res = await handleRDM(
    new Request("http://localhost:8111/rdm/nope"),
    "/rdm/nope",
  );
  assertEquals(res.headers.get("cache-control"), "no-store");
  await res.body?.cancel();
});

// ---- no response from COLD is ever left cacheable by accident ----------------------------
//
// Librarians curate data through these pages. A browser showing yesterday's list, or a
// form built from yesterday's record, is worse than a slow page. Each handler sets its own
// policy, but a handler that forgets must not leave a response cacheable: the router
// gives any response without a Cache-Control header `no-store`.

import { noStoreUnlessSet } from "./cold.ts";

Deno.test("noStoreUnlessSet: a response with no Cache-Control gets no-store, everything else kept", async () => {
  const res = await noStoreUnlessSet(
    new Response("body", {
      status: 404,
      statusText: "Not Found",
      headers: { "content-type": "text/plain", "x-keep": "1" },
    }),
  );
  assertEquals(res.headers.get("cache-control"), "no-store");
  assertEquals(res.status, 404);
  assertEquals(res.statusText, "Not Found");
  assertEquals(res.headers.get("content-type"), "text/plain");
  assertEquals(res.headers.get("x-keep"), "1");
  assertEquals(await res.text(), "body");
});

Deno.test("noStoreUnlessSet: a policy a handler chose is never overridden", async () => {
  for (const policy of ["no-cache", "no-store", "private, max-age=0"]) {
    const res = await noStoreUnlessSet(
      new Response("x", { headers: { "cache-control": policy } }),
    );
    assertEquals(res.headers.get("cache-control"), policy);
    await res.body?.cancel();
  }
});

Deno.test("noStoreUnlessSet: takes a promise too, as the handlers return", async () => {
  const res = await noStoreUnlessSet(Promise.resolve(new Response("x")));
  assertEquals(res.headers.get("cache-control"), "no-store");
  await res.body?.cancel();
});

Deno.test("router: every routed prefix answers with a Cache-Control policy, whatever the handler did", async () => {
  const prefixes = [
    "/rename/people",
    "/people",
    "/groups",
    "/funders",
    "/subjects",
    "/journals",
    "/thesis_options",
    "/doi_prefix",
    "/reports",
    "/directory_api",
    "/api/people.ds/keys",
    "/rdm/people_sync/target",
    "/rdm/nope",
    "/nothing_here.html",
    "/modules/people_sync_page.js",
    "/rdm_people_sync.html",
  ];
  for (const p of prefixes) {
    let res: Response;
    try {
      res = await ColdReadWriteHandler(
        new Request(`http://localhost:8111${p}`),
        { ...OPTIONS, apiUrl: "http://127.0.0.1:1" },
      );
    } catch {
      continue; // a handler that throws never reaches a browser as a cacheable page
    }
    const policy = res.headers.get("cache-control");
    assert(policy && /no-store|no-cache/.test(policy), `${p}: ${policy}`);
    await res.body?.cancel();
  }
});
