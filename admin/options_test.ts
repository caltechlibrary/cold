import { assertStrictEquals } from "@std/assert";
import * as Color from "@std/fmt/colors";
import { firstAndRest, matchType, OptionsProcessor } from "./options.ts";

let tests: Object = {};

// Test matchType
Deno.test("testMatchType", () => {
  const a: string = "a",
    b: number = 2,
    c: boolean = true;
  let x: any;
  x = matchType(a, "121");
  assertStrictEquals(typeof x, typeof a);
  assertStrictEquals(x, "121");
  x = matchType(b, 100);
  assertStrictEquals(typeof x, typeof b);
  assertStrictEquals(x, 100);
  x = matchType(c, false);
  assertStrictEquals(typeof x, typeof c);
  assertStrictEquals(x, false);
  x = matchType(b, "7");
  assertStrictEquals(typeof x, typeof b);
  assertStrictEquals(x, 7);
});

// Test firstAndRest
Deno.test("testFirstAndRest", () => {
  let s = "fred zip",
    parts: string[] = [];
  parts = firstAndRest(s, / /);
  assertStrictEquals(parts.length, 2);
  assertStrictEquals(parts[0], "fred");
  assertStrictEquals(parts[1], "zip");
});

// Test Options object
Deno.test("testOptionsObject", () => {
  const argv = ["-help", "-url=http://localhost:3030", "-retry", "7"];
  let op = new OptionsProcessor();
  op.booleanVar("help", false, "display help");
  op.stringVar("url", "", "set URL");
  op.numberVar("retry", 1, "set retries");
  op.parse(argv);
  //console.log("DEBUG op -> ", op)
  assertStrictEquals(op.options.help, true);
  assertStrictEquals(op.options.url, "http://localhost:3030");
  assertStrictEquals(op.options.retry, 7);

  op = new OptionsProcessor();
  op.booleanVar("help", false, "display help");
  op.stringVar("url", "", "set URL");
  op.numberVar("retry", 1, "set retries");
  op.parse(argv.slice(1, argv.length));
  //console.log("DEBUG op -> ", op)
  assertStrictEquals(op.options.help, false);
  assertStrictEquals(op.options.url, "http://localhost:3030");
  assertStrictEquals(op.options.retry, 7);
});
