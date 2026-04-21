import { assertEquals, assert } from "@std/assert";

// Pure logic functions mirroring group_view.ts, testable without DOM or ClientAPI.

function getClgidFromPath(pathname: string): string {
  const parts = pathname.split("/");
  return parts[parts.length - 1];
}

function buildMemberLinks(
  members: { clpid: string; family_name: string; given_name: string }[],
): { href: string; text: string }[] {
  return members.map((obj) => ({
    href: `../people/${obj.clpid}`,
    text: `${obj.family_name}, ${obj.given_name}`,
  }));
}

function parseAlternativeNames(html: string): string[] {
  return html.split(/\n/g).filter((n) => n.trim() !== "");
}

// Sample data matching what the API returns for group membership.
const sampleMembers = [
  { clpid: "Doiel-R-S", family_name: "Doiel", given_name: "Robert" },
  { clpid: "Newman-D-K", family_name: "Newman", given_name: "Dianne" },
];

Deno.test("getClgidFromPath extracts last path segment", () => {
  assertEquals(getClgidFromPath("/groups/LIGO"), "LIGO");
  assertEquals(getClgidFromPath("/groups/Caltech-Library"), "Caltech-Library");
});

Deno.test("getClgidFromPath handles trailing slash", () => {
  assertEquals(getClgidFromPath("/groups/"), "");
});

Deno.test("buildMemberLinks produces correct hrefs and text", () => {
  const links = buildMemberLinks(sampleMembers);
  assertEquals(links.length, 2);
  assertEquals(links[0].href, "../people/Doiel-R-S");
  assertEquals(links[0].text, "Doiel, Robert");
  assertEquals(links[1].href, "../people/Newman-D-K");
  assertEquals(links[1].text, "Newman, Dianne");
});

Deno.test("buildMemberLinks returns empty for no members", () => {
  assertEquals(buildMemberLinks([]).length, 0);
});

Deno.test("parseAlternativeNames splits on newlines and filters blanks", () => {
  const result = parseAlternativeNames(
    "Physics Lab\nCaltech Physics\n\nExperimental Physics\n",
  );
  assertEquals(result.length, 3);
  assert(result.includes("Physics Lab"));
  assert(result.includes("Caltech Physics"));
  assert(result.includes("Experimental Physics"));
});

Deno.test("parseAlternativeNames returns empty for blank content", () => {
  assertEquals(parseAlternativeNames("\n\n\n"), []);
});

Deno.test("parseAlternativeNames handles single name", () => {
  const result = parseAlternativeNames("LIGO Lab");
  assertEquals(result, ["LIGO Lab"]);
});
