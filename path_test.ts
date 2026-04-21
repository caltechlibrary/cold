import { assertEquals } from "@std/assert";
import { join } from "./path.ts";

Deno.test("join simple parts", () => {
  assertEquals(join("foo", "bar", "baz"), "foo/bar/baz");
});

Deno.test("join with parent traversal", () => {
  assertEquals(join("foo", "bar", "../baz"), "foo/baz");
});

Deno.test("join traversal to empty", () => {
  assertEquals(join("foo", "bar", "../.."), "");
});

Deno.test("join with current directory dot", () => {
  assertEquals(join("foo", "./bar", "../baz"), "foo/baz");
});

Deno.test("join multiple traversals", () => {
  assertEquals(join("foo", "bar", "../bar", "../baz"), "foo/baz");
});

Deno.test("join traversal beyond parts", () => {
  assertEquals(join("foo", "bar", "../bar", "../.."), "");
});

Deno.test("join traversal with dot segment", () => {
  assertEquals(join("foo", "bar", "../bar", "..", "baz"), "foo/baz");
});

Deno.test("join traversal with dot-slash segment", () => {
  assertEquals(join("foo", "bar", "../bar", "..", "./baz"), "foo/baz");
});

Deno.test("join traversal ending in parent", () => {
  assertEquals(join("foo", "bar", "../bar", "..", "./baz", ".."), "foo");
});

Deno.test("join leading parent traversal", () => {
  assertEquals(join("..", "foo", "bar"), "../foo/bar");
});

Deno.test("join collapse middle segment", () => {
  assertEquals(join("foo", "..", "bar"), "bar");
});

Deno.test("join double parent collapse", () => {
  assertEquals(join("foo", "..", "..", "bar"), "../bar");
});

Deno.test("join slash-separated part with traversal", () => {
  assertEquals(join("foo/bar", "../baz"), "foo/baz");
});

Deno.test("join slash-separated part with double traversal", () => {
  assertEquals(join("foo/bar", "../../baz"), "baz");
});

Deno.test("join slash-separated part with triple traversal", () => {
  assertEquals(join("foo/bar", "../../../baz"), "../baz");
});
