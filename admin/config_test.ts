import { assertStrictEquals, ConfigureHandler } from "./deps.ts";

Deno.test("testConfigureHandler", () => {
  const ch = new ConfigureHandler();
  let expectedApiUrl: string = "http://localhost:8112";
  let expectedHtdocs: string = "htdocs";
  let expectedDebug: boolean = false;

  assertStrictEquals(
    ch.apiUrl,
    expectedApiUrl,
    `expected ${expectedApiUrl}, got ${ch.apiUrl}`,
  );
  assertStrictEquals(
    ch.htdocs,
    expectedHtdocs,
    `expected ${expectedHtdocs}, got ${ch.htdocs}`,
  );
  assertStrictEquals(
    ch.debug,
    expectedDebug,
    `expected ${expectedDebug}, got ${ch.debug}`,
  );

  let got: { debug: boolean; htdocs: string; apiUrl: string } = ch.cfg();

  assertStrictEquals(
    got.apiUrl,
    expectedApiUrl,
    `expected ${expectedApiUrl}, got ${got.apiUrl}`,
  );
  assertStrictEquals(
    got.htdocs,
    expectedHtdocs,
    `expected ${expectedHtdocs}, got ${got.htdocs}`,
  );
  assertStrictEquals(
    got.debug,
    expectedDebug,
    `expected ${expectedDebug}, got ${got.debug}`,
  );
});
