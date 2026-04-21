import { assert, assertEquals } from "@std/assert";

// Mock csv-textarea elements
const mockGrantNumbersElem = {
  toCSV: () => "NSF-1234\nNSF-5678\n",
};

const mockAcronymsElem = {
  toCSV: () => "NSF\nNSERC\n",
};

// Mock for a successful fetch that follows a 303 to the funder view
async function mockFetchOk(
  _url: string,
  _opts: RequestInit,
): Promise<{ ok: boolean; url: string; status: number }> {
  return {
    ok: true,
    url: "http://localhost:8111/funders/national-science-foundation",
    status: 200,
  };
}

// Mock for a failed fetch (e.g. 500 from server)
async function mockFetchFail(
  _url: string,
  _opts: RequestInit,
): Promise<{ ok: boolean; url: string; status: number }> {
  return { ok: false, url: "", status: 500 };
}

// Testable version of the submit handler with injected dependencies.
async function handleFunderEditSubmit(
  event: { preventDefault: () => void },
  formAction: string,
  formMethod: string,
  formData: FormData,
  grantNumbersElem: { toCSV: () => string } | null,
  acronymsElem: { toCSV: () => string } | null,
  fetchFn: (
    url: string,
    opts: RequestInit,
  ) => Promise<{ ok: boolean; url: string; status: number }>,
  navigateFn: (url: string) => void,
): Promise<void> {
  event.preventDefault();
  if (grantNumbersElem !== null) {
    formData.set("grant_numbers", grantNumbersElem.toCSV());
  }
  if (acronymsElem !== null) {
    formData.set("acronyms", acronymsElem.toCSV());
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

Deno.test("handleFunderEditSubmit navigates to response.url on success", async () => {
  let navigatedTo = "";
  const formData = new FormData();
  formData.set("clfid", "national-science-foundation");

  await handleFunderEditSubmit(
    { preventDefault: () => {} },
    "http://localhost:8111/funders/",
    "post",
    formData,
    mockGrantNumbersElem,
    mockAcronymsElem,
    mockFetchOk,
    (url) => { navigatedTo = url; },
  );

  assertEquals(
    navigatedTo,
    "http://localhost:8111/funders/national-science-foundation",
  );
});

Deno.test("handleFunderEditSubmit does not navigate on server error", async () => {
  let navigatedTo = "";
  const formData = new FormData();
  formData.set("clfid", "national-science-foundation");

  await handleFunderEditSubmit(
    { preventDefault: () => {} },
    "http://localhost:8111/funders/",
    "post",
    formData,
    mockGrantNumbersElem,
    mockAcronymsElem,
    mockFetchFail,
    (url) => { navigatedTo = url; },
  );

  assertEquals(navigatedTo, "");
});

Deno.test("handleFunderEditSubmit sets grant_numbers from csv-textarea", async () => {
  let capturedBody: FormData | null = null;
  const formData = new FormData();
  formData.set("clfid", "national-science-foundation");

  await handleFunderEditSubmit(
    { preventDefault: () => {} },
    "http://localhost:8111/funders/",
    "post",
    formData,
    mockGrantNumbersElem,
    mockAcronymsElem,
    async (_url, opts) => {
      capturedBody = opts.body as FormData;
      return {
        ok: true,
        url: "http://localhost:8111/funders/national-science-foundation",
        status: 200,
      };
    },
    (_url) => {},
  );

  assert(capturedBody !== null);
  assertEquals(
    (capturedBody as unknown as FormData).get("grant_numbers"),
    "NSF-1234\nNSF-5678\n",
  );
  assertEquals(
    (capturedBody as unknown as FormData).get("acronyms"),
    "NSF\nNSERC\n",
  );
});

Deno.test("handleFunderEditSubmit handles null csv-textarea elements gracefully", async () => {
  let navigatedTo = "";
  const formData = new FormData();
  formData.set("clfid", "national-science-foundation");

  await handleFunderEditSubmit(
    { preventDefault: () => {} },
    "http://localhost:8111/funders/",
    "post",
    formData,
    null,
    null,
    mockFetchOk,
    (url) => { navigatedTo = url; },
  );

  assertEquals(
    navigatedTo,
    "http://localhost:8111/funders/national-science-foundation",
  );
});
