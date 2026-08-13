import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderPersonDetails } from "./person_details.ts";

// --- renderPersonDetails -----------------------------------------------

Deno.test("renderPersonDetails prefers display_name over family/given name", () => {
  const html = renderPersonDetails({
    display_name: "Doiel, R. S.",
    family_name: "Doiel",
    given_name: "R. S.",
  });
  assertStringIncludes(html, "<h2>Doiel, R. S.</h2>");
});

Deno.test("renderPersonDetails falls back to family_name, given_name when display_name is absent", () => {
  const html = renderPersonDetails({
    family_name: "Doiel",
    given_name: "R. S.",
  });
  assertStringIncludes(html, "<h2>Doiel, R. S.</h2>");
});

Deno.test("renderPersonDetails omits the comma when given_name is absent", () => {
  const html = renderPersonDetails({ family_name: "Doiel" });
  assertStringIncludes(html, "<h2>Doiel</h2>");
});

Deno.test("renderPersonDetails links clpid to feeds when include_in_feeds is true", () => {
  const html = renderPersonDetails({
    clpid: "Doiel-R-S",
    include_in_feeds: true,
  });
  assertStringIncludes(
    html,
    `<a href="https://feeds.library.caltech.edu/people/Doiel-R-S" target="_blank">Doiel-R-S</a>`,
  );
});

Deno.test("renderPersonDetails renders clpid as plain text when include_in_feeds is false", () => {
  const html = renderPersonDetails({
    clpid: "Doiel-R-S",
    include_in_feeds: false,
  });
  assertStringIncludes(
    html,
    `<div class="identifier">Caltech Library ID: Doiel-R-S</div>`,
  );
});

Deno.test("renderPersonDetails omits the identifier block when clpid is absent", () => {
  const html = renderPersonDetails({ family_name: "Doiel" });
  assertEquals(html.includes("Caltech Library ID"), false);
});

Deno.test("renderPersonDetails links a group when clgid is present", () => {
  const html = renderPersonDetails({
    groups: [{ group_name: "Library", clgid: "Library-1" }],
  });
  assertStringIncludes(
    html,
    `<li><a href="../groups/Library-1">Library</a></li>`,
  );
});

Deno.test("renderPersonDetails renders a group name without a link when clgid is missing", () => {
  const html = renderPersonDetails({
    groups: [{ group_name: "Library", clgid: "" }],
  });
  assertStringIncludes(html, `<li>Library</li>`);
});

Deno.test("renderPersonDetails omits the groups block when there are no groups", () => {
  const html = renderPersonDetails({ family_name: "Doiel" });
  assertEquals(html.includes("class=\"groups\""), false);
});

Deno.test("renderPersonDetails lists only the institute affiliations that are true", () => {
  const html = renderPersonDetails({ caltech: true, jpl: false });
  assertStringIncludes(html, `<li class="is_caltech">Active Caltech</li>`);
  assertEquals(html.includes("is_jpl"), false);
});

Deno.test("renderPersonDetails lists only the affiliation types that are true", () => {
  const html = renderPersonDetails({
    faculty: true,
    staff: false,
    alumn: true,
    postdoc: false,
    visitor: false,
    retired: false,
    emeritus: false,
  });
  assertStringIncludes(html, `<li class="is_faculty">Faculty</li>`);
  assertStringIncludes(html, `<li class="is_alumn">Alumn</li>`);
  assertEquals(html.includes("is_staff"), false);
  assertEquals(html.includes("is_postdoc"), false);
});

Deno.test("renderPersonDetails reports feeds status when included", () => {
  const html = renderPersonDetails({
    given_name: "R. S.",
    family_name: "Doiel",
    include_in_feeds: true,
  });
  assertStringIncludes(html, "R. S. Doiel is included in feeds");
});

Deno.test("renderPersonDetails reports feeds status when not included", () => {
  const html = renderPersonDetails({
    given_name: "R. S.",
    family_name: "Doiel",
    include_in_feeds: false,
  });
  assertStringIncludes(html, "R. S. Doiel is NOT included in feeds");
});

Deno.test("renderPersonDetails escapes HTML special characters in internal_notes", () => {
  const html = renderPersonDetails({
    internal_notes: "<script>alert('x')</script> & more",
  });
  assertStringIncludes(
    html,
    "&lt;script&gt;alert('x')&lt;/script&gt; &amp; more",
  );
  assertEquals(html.includes("<script>"), false);
});

Deno.test("renderPersonDetails omits the internal notes block when absent", () => {
  const html = renderPersonDetails({ family_name: "Doiel" });
  assertEquals(html.includes("Internal Notes"), false);
});

// --- focusout handler ---------------------------------------------------
//
// The real handler in people_rename.ts is wired directly to
// `document.addEventListener("focusout", ...)` and reads/writes specific
// element ids via `document.getElementById`. This is a testable version of
// the handler body with the DOM elements and the lookup call injected as
// parameters, mirroring the pattern used in group_edit_test.ts and
// people_edit_test.ts for other document-bound handlers.

interface MockElem {
  disabled: boolean;
  focused: boolean;
  focus: () => void;
}

interface MockDetailsDiv {
  color: string;
  innerHTML: string;
  textContent: string;
}

function newMockElem(): MockElem {
  const elem: MockElem = {
    disabled: false,
    focused: false,
    focus: () => {},
  };
  elem.focus = () => {
    elem.focused = true;
  };
  return elem;
}

function newMockDetailsDiv(): MockDetailsDiv {
  return { color: "", innerHTML: "", textContent: "" };
}

async function handlePersonLookup(
  clpid: string,
  newClpidElem: MockElem | null,
  submitElem: MockElem | null,
  detailsDiv: MockDetailsDiv | null,
  lookupFn: (clpid: string) => Promise<Record<string, unknown>[]>,
): Promise<void> {
  if (clpid === "") {
    if (newClpidElem) newClpidElem.disabled = true;
    if (submitElem) submitElem.disabled = true;
    if (detailsDiv) detailsDiv.innerHTML = "";
    return;
  }

  const results = await lookupFn(clpid);
  if (results && results.length > 0) {
    const person = results[0];
    if (detailsDiv) {
      detailsDiv.color = "";
      detailsDiv.innerHTML = renderPersonDetails(person);
    }
    if (newClpidElem) {
      newClpidElem.disabled = false;
      newClpidElem.focus();
    }
    if (submitElem) submitElem.disabled = false;
  } else {
    if (detailsDiv) {
      detailsDiv.color = "red";
      detailsDiv.textContent = "Person ID not found.";
    }
    if (newClpidElem) newClpidElem.disabled = true;
    if (submitElem) submitElem.disabled = true;
  }
}

Deno.test("handlePersonLookup disables fields and clears details for an empty clpid", async () => {
  const newClpidElem = newMockElem();
  const submitElem = newMockElem();
  const detailsDiv = newMockDetailsDiv();
  detailsDiv.innerHTML = "<h2>Stale</h2>";

  await handlePersonLookup(
    "",
    newClpidElem,
    submitElem,
    detailsDiv,
    (_clpid) => {
      throw new Error("lookupFn should not be called for an empty clpid");
    },
  );

  assertEquals(newClpidElem.disabled, true);
  assertEquals(submitElem.disabled, true);
  assertEquals(detailsDiv.innerHTML, "");
});

Deno.test("handlePersonLookup enables fields and renders details when the person is found", async () => {
  const newClpidElem = newMockElem();
  const submitElem = newMockElem();
  const detailsDiv = newMockDetailsDiv();
  newClpidElem.disabled = true;
  submitElem.disabled = true;

  await handlePersonLookup(
    "Doiel-R-S",
    newClpidElem,
    submitElem,
    detailsDiv,
    async (_clpid) => [{ family_name: "Doiel", given_name: "R. S." }],
  );

  assertEquals(newClpidElem.disabled, false);
  assertEquals(newClpidElem.focused, true);
  assertEquals(submitElem.disabled, false);
  assertEquals(detailsDiv.color, "");
  assertStringIncludes(detailsDiv.innerHTML, "<h2>Doiel, R. S.</h2>");
});

Deno.test("handlePersonLookup shows an error and disables fields when the person is not found", async () => {
  const newClpidElem = newMockElem();
  const submitElem = newMockElem();
  const detailsDiv = newMockDetailsDiv();

  await handlePersonLookup(
    "Unknown-X",
    newClpidElem,
    submitElem,
    detailsDiv,
    async (_clpid) => [],
  );

  assertEquals(newClpidElem.disabled, true);
  assertEquals(submitElem.disabled, true);
  assertEquals(detailsDiv.color, "red");
  assertEquals(detailsDiv.textContent, "Person ID not found.");
});
