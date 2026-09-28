import { assert, assertEquals } from "@std/assert";

const mockAltNameElem = {
  toCSV: () => "Journal of Science\nSci. J.\n",
};

async function mockFetchOk(
  _url: string,
  _opts: RequestInit,
): Promise<{ ok: boolean; url: string; status: number }> {
  return {
    ok: true,
    url: "http://localhost:8111/journals/1234-567X",
    status: 200,
  };
}

async function mockFetchFail(
  _url: string,
  _opts: RequestInit,
): Promise<{ ok: boolean; url: string; status: number }> {
  return { ok: false, url: "", status: 500 };
}

async function handleJournalEditSubmit(
  event: { preventDefault: () => void },
  formAction: string,
  formMethod: string,
  formData: FormData,
  altNameElem: { toCSV: () => string } | null,
  fetchFn: (
    url: string,
    opts: RequestInit,
  ) => Promise<{ ok: boolean; url: string; status: number }>,
  navigateFn: (url: string) => void,
): Promise<void> {
  event.preventDefault();
  if (altNameElem !== null) {
    formData.set("alt_name", altNameElem.toCSV());
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

Deno.test("handleJournalEditSubmit navigates to response.url on success", async () => {
  let navigatedTo = "";
  const formData = new FormData();
  formData.set("issn", "1234-567X");

  await handleJournalEditSubmit(
    { preventDefault: () => {} },
    "http://localhost:8111/journals/",
    "post",
    formData,
    mockAltNameElem,
    mockFetchOk,
    (url) => { navigatedTo = url; },
  );

  assertEquals(navigatedTo, "http://localhost:8111/journals/1234-567X");
});

Deno.test("handleJournalEditSubmit does not navigate on server error", async () => {
  let navigatedTo = "";
  const formData = new FormData();
  formData.set("issn", "1234-567X");

  await handleJournalEditSubmit(
    { preventDefault: () => {} },
    "http://localhost:8111/journals/",
    "post",
    formData,
    mockAltNameElem,
    mockFetchFail,
    (url) => { navigatedTo = url; },
  );

  assertEquals(navigatedTo, "");
});

Deno.test("handleJournalEditSubmit sets alt_name from csv-textarea", async () => {
  let capturedBody: FormData | null = null;
  const formData = new FormData();
  formData.set("issn", "1234-567X");

  await handleJournalEditSubmit(
    { preventDefault: () => {} },
    "http://localhost:8111/journals/",
    "post",
    formData,
    mockAltNameElem,
    async (_url, opts) => {
      capturedBody = opts.body as FormData;
      return { ok: true, url: "http://localhost:8111/journals/1234-567X", status: 200 };
    },
    (_url) => {},
  );

  assert(capturedBody !== null);
  assertEquals(
    (capturedBody as unknown as FormData).get("alt_name"),
    "Journal of Science\nSci. J.\n",
  );
});

Deno.test("handleJournalEditSubmit handles null altNameElem gracefully", async () => {
  let navigatedTo = "";
  const formData = new FormData();
  formData.set("issn", "1234-567X");

  await handleJournalEditSubmit(
    { preventDefault: () => {} },
    "http://localhost:8111/journals/",
    "post",
    formData,
    null,
    mockFetchOk,
    (url) => { navigatedTo = url; },
  );

  assertEquals(navigatedTo, "http://localhost:8111/journals/1234-567X");
});
