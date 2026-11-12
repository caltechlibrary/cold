/**
 * rdm.ts holds COLD's dynamic RDM-specific routes, all under `/rdm/...` (plan
 * Phase 5 finding 7). Static RDM pages stay in `htdocs/` as `rdm_*.html`; a path
 * only reaches this handler when it is `/rdm` or begins `/rdm/`, so
 * `/rdm_people_sync.html` and `/rdmx` are not routed here.
 *
 * The one route so far is `GET /rdm/people_sync/target`: where the NEXT people
 * sync will go. There is no production button until the sync page shows it
 * (Phase 5 decision 3). It reads the env file the sync shim uses, named by
 * PEOPLE_SYNC_ENV in this process's environment, and returns a whitelist of three
 * non-secret settings. The host, instance id, AWS profile, checkout, run user and
 * every other key stay in the file.
 */
import { loadConfig, SyncError } from "./people_sync.ts";

/** TARGET_KEYS are the only settings the target route returns. */
export const TARGET_KEYS = ["mode", "rdm_url", "transport"] as const;

/** isRdmPath reports whether a path belongs to the `/rdm` handler.
 *
 * The match is on a path boundary, so look-alikes such as `/rdm_people_sync.html`
 * and `/rdmx` are not routed here.
 *
 * @param pathname {string} the request path with the deployment base path removed
 * @returns {boolean} true for `/rdm` and anything beginning `/rdm/`
 * @example
 * isRdmPath("/rdm/people_sync/target"); // true
 * isRdmPath("/rdm_people_sync.html");   // false
 */
export function isRdmPath(pathname: string): boolean {
  return pathname === "/rdm" || pathname.startsWith("/rdm/");
}

function json(status: number, body: unknown, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

/** targetResponse reads the env file and returns the whitelisted target. */
async function targetResponse(): Promise<Response> {
  let file: string | undefined;
  try {
    file = Deno.env.get("PEOPLE_SYNC_ENV");
  } catch (err) {
    // Without env permission Deno.env.get throws (and prompts at a terminal), so
    // say what is missing instead of failing the request.
    if (
      err instanceof Deno.errors.NotCapable ||
      err instanceof Deno.errors.PermissionDenied
    ) {
      return json(503, {
        error:
          "this process may not read PEOPLE_SYNC_ENV: start cold with --allow-env=PEOPLE_SYNC_ENV",
      });
    }
    throw err;
  }
  if (!file) {
    return json(503, {
      error:
        "PEOPLE_SYNC_ENV is not set for this process, so the next run's target is unknown",
    });
  }
  let text: string;
  try {
    text = await Deno.readTextFile(file);
  } catch {
    return json(503, {
      error: "the env file named by PEOPLE_SYNC_ENV cannot be read",
    });
  }
  try {
    const cfg = loadConfig(text, Deno.cwd());
    return json(200, {
      mode: cfg.mode,
      rdm_url: cfg.rdmUrl,
      transport: cfg.transport,
    });
  } catch (err) {
    if (err instanceof SyncError) return json(503, { error: err.message });
    throw err;
  }
}

/** handleRDM answers the `/rdm/...` routes.
 *
 * @param req {Request} the request
 * @param pathname {string} the path with the deployment base path removed
 * @returns {Promise<Response>} the response: JSON, never cached
 * @example
 * const res = await handleRDM(req, "/rdm/people_sync/target");
 */
export async function handleRDM(
  req: Request,
  pathname: string,
): Promise<Response> {
  if (pathname === "/rdm/people_sync/target") {
    if (req.method !== "GET") {
      return json(405, { error: "GET only" }, { allow: "GET" });
    }
    return await targetResponse();
  }
  return json(404, { error: "not found" });
}
