import { assertEquals, assert } from "@std/assert";

// Pure logic extracted from AToZUL for unit testing without a DOM.

function groupByFirstLetter(
  items: string[],
): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  for (const item of items) {
    const letter = (item.trim()[0] ?? "").toUpperCase();
    if (!sections[letter]) sections[letter] = [];
    sections[letter].push(item);
  }
  return sections;
}

function alphabetSections(
  sections: Record<string, string[]>,
): string[] {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return alphabet.split("").filter((letter) => sections[letter] !== undefined);
}

const sampleItems = [
  "Banana", "Apple", "Cherry", "Avocado", "Blueberry", "Apricot",
];

Deno.test("groupByFirstLetter groups correctly", () => {
  const result = groupByFirstLetter(sampleItems);
  assertEquals(result["A"], ["Apple", "Avocado", "Apricot"]);
  assertEquals(result["B"], ["Banana", "Blueberry"]);
  assertEquals(result["C"], ["Cherry"]);
});

Deno.test("groupByFirstLetter is case-insensitive on first letter", () => {
  const result = groupByFirstLetter(["alice", "Bob", "CAROL"]);
  assert("A" in result);
  assert("B" in result);
  assert("C" in result);
});

Deno.test("alphabetSections returns present letters in order", () => {
  const sections = groupByFirstLetter(sampleItems);
  const letters = alphabetSections(sections);
  assertEquals(letters, ["A", "B", "C"]);
});

Deno.test("alphabetSections returns empty for no items", () => {
  assertEquals(alphabetSections({}), []);
});

Deno.test("groupByFirstLetter handles empty list", () => {
  assertEquals(groupByFirstLetter([]), {});
});

Deno.test("groupByFirstLetter handles single item", () => {
  const result = groupByFirstLetter(["Zebra"]);
  assertEquals(result["Z"], ["Zebra"]);
});
