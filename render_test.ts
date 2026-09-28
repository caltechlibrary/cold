import { assertEquals } from "@std/assert";
import { renderJSON, renderPage } from "./render.ts";

Deno.test("renderJSON sets Cache-Control: no-store", async () => {
  const resp = await renderJSON({ ok: true });
  assertEquals(resp.headers.get("Cache-Control"), "no-store");
});

Deno.test("renderJSON sets Cache-Control: no-store on error status", async () => {
  const resp = await renderJSON({ error: "bad" }, 500);
  assertEquals(resp.headers.get("Cache-Control"), "no-store");
});

Deno.test("renderPage sets Cache-Control: no-store", async () => {
  const resp = await renderPage("group", {
    group: { clgid: "x", name: "y" },
  });
  assertEquals(resp.headers.get("Cache-Control"), "no-store");
});
