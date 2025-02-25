import { apiPort, DatasetApiClient } from "./deps.ts";
import { apiPathParse } from "./utils.ts";
import { renderJSON } from "./render.ts";

/**
 * handleBrowserAPI implements the browser accessible API represented in COLD.
 * It is a read API only and responses are always in JSON.
 */
export async function handleBrowserAPI(
  req: Request,
  options: { debug: boolean; htdocs: string; baseUrl: string; apiUrl: string },
): Promise<Response> {
  if (req.method !== "GET") {
    return renderJSON({ "ok": false, "msg": "method not supported" }, 501);
  }
  const apiReq: { [key: string]: string } = apiPathParse(req.url);
  if (apiReq.c_name === undefined) {
    return renderJSON({ "ok": false, "msg": "collection not found" }, 404);
  }
  if (apiReq.query_name === undefined) {
    return renderJSON({ "ok": false, "msg": "query not found" }, 404);
  }
  let ds = new DatasetApiClient(apiPort, apiReq.c_name);
  //FIXME: Need to pass in the parameter value(s)
  /*
    let resp = ds.query(apiReq.query_name, [ "name", "alternative" ], apiReq.q, apiRwq.q);
    */
  /*
          if (lookup !== null) {
            for (const group of group_list) {
              // FIXME: if we did an approximate compare we could suggests an autocomplete
              if (group.name === lookup) {
                return renderJSON(group, 200);
              }
            }
            return renderJSON({"ok": false, "msg": `"${lookup}", not found`}, 404);
          }
    */
  return renderJSON({
    "ok": false,
    "msg": "not implemented",
    "api": apiReq,
  }, 501);
}
