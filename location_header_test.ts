import { assertEquals, assertThrows } from "@std/assert";
import { pathIdentifier } from "./utils.ts";

// Regression test for cold#85: HTTP header field values are restricted to
// the ByteString/Latin-1 range. Every save handler builds a redirect
// Location header from a raw identifier -- if that identifier contains a
// code point outside Latin-1 the Response constructor throws outright
// (save fails). Even a Latin-1-range diacritic is technically wrong on the
// wire (one raw byte, not valid UTF-8), though that can't be observed
// through the JS Headers API, which normalizes back to a decoded string.
// The fix is to encodeURIComponent() the identifier before it becomes a
// header value; this pins that contract so it cannot regress silently.

const problemIds = [
  "Bandić-Z-Z", // outside Latin-1, throws unencoded
  "Bernander-Jan-Ӧjvind", // outside Latin-1, throws unencoded
  "Cossé-Julia-Theresa", // inside Latin-1, wrong on the wire unencoded
];

Deno.test("raw non-Latin-1 identifier in Location header throws", () => {
  for (const id of ["Bandić-Z-Z", "Bernander-Jan-Ӧjvind"]) {
    assertThrows(() => {
      new Response("body", { status: 303, headers: { Location: id } });
    });
  }
});

for (const id of problemIds) {
  Deno.test(`encodeURIComponent'd identifier survives as a header and round-trips: ${id}`, () => {
    const encoded = encodeURIComponent(id);
    const resp = new Response("body", {
      status: 303,
      headers: { Location: encoded },
    });
    assertEquals(resp.headers.get("Location"), encoded);
    const decoded = pathIdentifier(`http://localhost:8111/people/${encoded}`);
    assertEquals(decoded, id);
  });
}
