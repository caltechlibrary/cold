import { assert, assertEquals } from "@std/assert";

// Mock csv-textarea element
const mockAlternativeElem = {
  toCSV: () => "Physics\nChemistry\n",
};

// Mock for a successful fetch that follows a 303 to the group view
async function mockFetchOk(
  _url: string,
  _opts: RequestInit,
): Promise<{ ok: boolean; url: string; status: number }> {
  return { ok: true, url: "http://localhost:8111/groups/TEST-1", status: 200 };
}

// Mock for a failed fetch (e.g. 500 from server)
async function mockFetchFail(
  _url: string,
  _opts: RequestInit,
): Promise<{ ok: boolean; url: string; status: number }> {
  return { ok: false, url: "", status: 500 };
}

// Testable version of the submit handler with injected dependencies.
async function handleGroupEditSubmit(
  event: { preventDefault: () => void },
  formAction: string,
  formMethod: string,
  formData: FormData,
  alternativeElem: { toCSV: () => string } | null,
  fetchFn: (
    url: string,
    opts: RequestInit,
  ) => Promise<{ ok: boolean; url: string; status: number }>,
  navigateFn: (url: string) => void,
): Promise<void> {
  event.preventDefault();
  if (alternativeElem !== null) {
    formData.set("alternative", alternativeElem.toCSV());
  }
  try {
    const response = await fetchFn(formAction, {
      method: formMethod,
      body: formData,
    });
    if (response.ok) {
      navigateFn(response.url);
    } else {
      console.error(`Form submission failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error submitting form:", error);
  }
}

Deno.test("handleGroupEditSubmit navigates to response.url on success", async () => {
  let navigatedTo = "";
  const formData = new FormData();
  formData.set("clgid", "TEST-1");

  await handleGroupEditSubmit(
    { preventDefault: () => {} },
    "http://localhost:8111/groups/",
    "post",
    formData,
    mockAlternativeElem,
    mockFetchOk,
    (url) => { navigatedTo = url; },
  );

  assertEquals(navigatedTo, "http://localhost:8111/groups/TEST-1");
});

Deno.test("handleGroupEditSubmit does not navigate on server error", async () => {
  let navigatedTo = "";
  const formData = new FormData();
  formData.set("clgid", "TEST-1");

  await handleGroupEditSubmit(
    { preventDefault: () => {} },
    "http://localhost:8111/groups/",
    "post",
    formData,
    mockAlternativeElem,
    mockFetchFail,
    (url) => { navigatedTo = url; },
  );

  assertEquals(navigatedTo, "");
});

Deno.test("handleGroupEditSubmit sets alternative field from csv-textarea", async () => {
  let capturedBody: FormData | null = null;
  const formData = new FormData();
  formData.set("clgid", "TEST-1");

  await handleGroupEditSubmit(
    { preventDefault: () => {} },
    "http://localhost:8111/groups/",
    "post",
    formData,
    mockAlternativeElem,
    async (_url, opts) => {
      capturedBody = opts.body as FormData;
      return { ok: true, url: "http://localhost:8111/groups/TEST-1", status: 200 };
    },
    (_url) => {},
  );

  assert(capturedBody !== null);
  assertEquals((capturedBody as unknown as FormData).get("alternative"), "Physics\nChemistry\n");
});

Deno.test("handleGroupEditSubmit handles null alternativeElem gracefully", async () => {
  let navigatedTo = "";
  const formData = new FormData();
  formData.set("clgid", "TEST-1");

  await handleGroupEditSubmit(
    { preventDefault: () => {} },
    "http://localhost:8111/groups/",
    "post",
    formData,
    null,
    mockFetchOk,
    (url) => { navigatedTo = url; },
  );

  assertEquals(navigatedTo, "http://localhost:8111/groups/TEST-1");
});
