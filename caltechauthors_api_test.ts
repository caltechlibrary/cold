/**
 * caltechauthors_api_test.ts
 *
 * Unit tests for fetchAllRecords() run without any network access. All HTTP
 * calls are stubbed via the injectable fetchFn/sleepFn options, per
 * caltechauthors_api_pagination.md.
 *
 * Run:
 *   deno test caltechauthors_api_test.ts
 */

import { assertEquals, assertRejects } from "@std/assert";
import { fetchAllRecords } from "./caltechauthors_api.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface MockPage {
  status: number;
  hits?: unknown[];
  next?: string;
  headers?: Record<string, string>;
}

function mockResponse(page: MockPage): Response {
  const body = {
    hits: { hits: page.hits ?? [], total: page.hits?.length ?? 0 },
    links: page.next ? { next: page.next } : {},
  };
  const headers = new Headers(page.headers ?? {});
  return {
    ok: page.status >= 200 && page.status < 300,
    status: page.status,
    headers,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    // deno-lint-ignore no-explicit-any
  } as any;
}

/** Builds a fetchFn that returns queued responses in order, one per call,
 * and records every URL it was called with. */
function queuedFetch(pages: MockPage[]) {
  const calls: string[] = [];
  let i = 0;
  const fetchFn = (input: string | URL | Request) => {
    calls.push(String(input));
    const page = pages[i];
    i++;
    if (page === undefined) {
      throw new Error(`queuedFetch: no page queued for call ${i}`);
    }
    return Promise.resolve(mockResponse(page));
  };
  return { fetchFn, calls };
}

/** A sleepFn that resolves immediately but records how long it was asked to wait. */
function fakeSleep() {
  const waits: number[] = [];
  const sleepFn = (ms: number) => {
    waits.push(ms);
    return Promise.resolve();
  };
  return { sleepFn, waits };
}

// ---------------------------------------------------------------------------
// Single page
// ---------------------------------------------------------------------------

Deno.test("fetchAllRecords - single page with no links.next returns its hits", async () => {
  const { fetchFn, calls } = queuedFetch([
    { status: 200, hits: [{ id: "a" }, { id: "b" }] },
  ]);
  const records = await fetchAllRecords("https://example.org/api/records?q=x", {
    fetchFn,
  });
  assertEquals(records, [{ id: "a" }, { id: "b" }]);
  assertEquals(calls.length, 1);
});

// ---------------------------------------------------------------------------
// Multi-page follow
// ---------------------------------------------------------------------------

Deno.test("fetchAllRecords - follows links.next across multiple pages in order", async () => {
  const { fetchFn, calls } = queuedFetch([
    { status: 200, hits: [{ id: 1 }, { id: 2 }], next: "https://example.org/page2" },
    { status: 200, hits: [{ id: 3 }, { id: 4 }], next: "https://example.org/page3" },
    { status: 200, hits: [{ id: 5 }, { id: 6 }] },
  ]);
  const records = await fetchAllRecords("https://example.org/page1", { fetchFn });
  assertEquals(records, [
    { id: 1 },
    { id: 2 },
    { id: 3 },
    { id: 4 },
    { id: 5 },
    { id: 6 },
  ]);
  assertEquals(calls, [
    "https://example.org/page1",
    "https://example.org/page2",
    "https://example.org/page3",
  ]);
});

// ---------------------------------------------------------------------------
// Page ceiling (safety net)
// ---------------------------------------------------------------------------

Deno.test("fetchAllRecords - stops at maxPages and warns instead of looping forever", async () => {
  const { fetchFn, calls } = queuedFetch([
    { status: 200, hits: [{ id: 1 }], next: "https://example.org/page2" },
    { status: 200, hits: [{ id: 2 }], next: "https://example.org/page3" },
    { status: 200, hits: [{ id: 3 }] },
  ]);
  const originalError = console.error;
  let warned = false;
  console.error = (...args: unknown[]) => {
    warned = true;
    originalError(...args);
  };
  try {
    const records = await fetchAllRecords("https://example.org/page1", {
      fetchFn,
      maxPages: 2,
    });
    assertEquals(records, [{ id: 1 }, { id: 2 }]);
    assertEquals(calls.length, 2);
    assertEquals(warned, true);
  } finally {
    console.error = originalError;
  }
});

// ---------------------------------------------------------------------------
// 429 retry/backoff
// ---------------------------------------------------------------------------

Deno.test("fetchAllRecords - retries once on 429 then succeeds", async () => {
  const { fetchFn, calls } = queuedFetch([
    { status: 429, headers: { "Retry-After": "1" } },
    { status: 200, hits: [{ id: "a" }] },
  ]);
  const { sleepFn, waits } = fakeSleep();
  const records = await fetchAllRecords("https://example.org/page1", {
    fetchFn,
    sleepFn,
  });
  assertEquals(records, [{ id: "a" }]);
  assertEquals(calls.length, 2);
  assertEquals(waits.length, 1);
});

Deno.test("fetchAllRecords - throws once retries are exhausted on repeated 429s", async () => {
  const { fetchFn } = queuedFetch([
    { status: 429 },
    { status: 429 },
    { status: 429 },
  ]);
  const { sleepFn } = fakeSleep();
  await assertRejects(
    () =>
      fetchAllRecords("https://example.org/page1", {
        fetchFn,
        sleepFn,
        maxRetries: 3,
      }),
    Error,
  );
});

// ---------------------------------------------------------------------------
// Non-429 errors fail fast, no retry
// ---------------------------------------------------------------------------

Deno.test("fetchAllRecords - throws immediately on a non-429 error without retrying", async () => {
  const { fetchFn, calls } = queuedFetch([
    { status: 500 },
  ]);
  await assertRejects(
    () => fetchAllRecords("https://example.org/page1", { fetchFn }),
    Error,
  );
  assertEquals(calls.length, 1);
});
