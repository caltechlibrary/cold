/**
 * caltechauthors_api.ts provides a shared helper for querying the
 * CaltechAUTHORS RDM records API (https://authors.library.caltech.edu/api/records)
 * without silently truncating results at the requested page size.
 *
 * See caltechauthors_api_pagination.md for the design and decision behind
 * this module: it owns HTTP + pagination + 429 retry/backoff only. Callers
 * keep their own query-building and record typing, since the reports that
 * use this API differ enough in the fields they need (funding, contributors,
 * custom_fields, additional_descriptions, ...) that a shared record type
 * would add coupling without real benefit.
 */

const DEFAULT_MAX_PAGES = 50; // 50 * size=1000 == 50,000 records, far beyond any single query's expected result set
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_SECONDS = 60;

export interface FetchAllRecordsOptions {
    /** Safety ceiling on the number of pages followed via links.next. */
    maxPages?: number;
    /** How many times to retry a single page after a 429 response. */
    maxRetries?: number;
    /** Backoff (seconds) used when a 429 response has no Retry-After header. */
    defaultBackoffSeconds?: number;
    /** Injectable fetch, for testing without network access. */
    fetchFn?: typeof fetch;
    /** Injectable sleep, for testing without waiting out real backoffs. */
    sleepFn?: (ms: number) => Promise<void>;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetchAllRecords fetches every page of results for apiUrl (a fully-built
 * CaltechAUTHORS records API URL, including q= and size=), following
 * data.links.next until it is absent, and returns the accumulated
 * data.hits.hits across all pages.
 *
 * Retries a page up to maxRetries times on HTTP 429 (rate limited), honoring
 * the Retry-After header when present. Any other non-ok response throws
 * immediately without retrying. If maxPages is reached while links.next is
 * still present, a warning is logged to stderr and the records collected so
 * far are returned rather than looping indefinitely.
 */
export async function fetchAllRecords(
    apiUrl: string,
    opts: FetchAllRecordsOptions = {},
): Promise<unknown[]> {
    const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
    const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
    const defaultBackoffSeconds = opts.defaultBackoffSeconds ??
        DEFAULT_BACKOFF_SECONDS;
    const fetchFn = opts.fetchFn ?? fetch;
    const sleepFn = opts.sleepFn ?? sleep;

    const records: unknown[] = [];
    let nextUrl: string | undefined = apiUrl;
    let pageCount = 0;

    while (nextUrl && pageCount < maxPages) {
        const url: string = nextUrl;
        let response: Response | undefined;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            response = await fetchFn(url);
            if (response.status !== 429) break;
            if (attempt === maxRetries) {
                throw new Error(
                    `fetchAllRecords: exhausted ${maxRetries} retries on HTTP 429 (rate limited) for ${url}`,
                );
            }
            const retryAfter = parseInt(
                response.headers.get("Retry-After") ?? "",
                10,
            );
            const waitSeconds = retryAfter > 0
                ? retryAfter
                : defaultBackoffSeconds;
            console.error(
                `fetchAllRecords: rate limited (429), waiting ${waitSeconds}s before retry ${
                    attempt + 1
                }/${maxRetries} for ${url}`,
            );
            await sleepFn(waitSeconds * 1000);
        }

        if (!response) {
            throw new Error(`fetchAllRecords: no response received for ${url}`);
        }
        if (!response.ok) {
            const body = await response.text();
            throw new Error(
                `fetchAllRecords: failed to fetch records (HTTP ${response.status}) for ${url}: ${body}`,
            );
        }

        const data = await response.json();
        const hits = data?.hits?.hits ?? [];
        records.push(...hits);
        pageCount++;
        nextUrl = data?.links?.next;
    }

    if (nextUrl && pageCount >= maxPages) {
        console.error(
            `fetchAllRecords: reached the ${maxPages}-page safety ceiling with more results available (next: ${nextUrl}); returning ${records.length} records collected so far`,
        );
    }

    return records;
}
