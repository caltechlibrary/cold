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
    return renderJSON({
      "ok": false,
      "msg": `${req.method} method not supported`,
    }, 501);
  }
  const apiReq: { [key: string]: string } = apiPathParse(req.url);
  if (apiReq.c_name === undefined) {
    return renderJSON({
      "ok": false,
      "msg": `${apiReq.c_name} collection not found`,
    }, 404);
  }
  if (apiReq.query_name === undefined) {
    return renderJSON({
      "ok": false,
      "msg": `${apiReq.query_name} query not found`,
    }, 404);
  }
  let ds = new DatasetApiClient(apiPort, apiReq.c_name);
  //FIXME: Need to pass in the parameter value(s)
  let body: string = JSON.stringify({ name: apiReq.q, alternative: apiReq.q });
  console.log(
    `DEBUG executing ds.query("${apiReq.query_name}", ["name", "alternative"], body) doing a POST of body -> ${body}`,
  );
  let resp = await ds.query(apiReq.query_name, ["name", "alternative"], body);
  if (resp.ok) {
    console.log(
      `DEBUG resp -> ok ? ${resp.ok}`,
    );
    let data = await resp.json();
    console.log(
      `DEBUG data from response -> ${data} -> ${JSON.stringify(data)}`,
    );
    return renderJSON(data, 200);
  }
  return renderJSON({
    "ok": false,
    "msg": "not found",
    "api": apiReq,
  }, 404);
}
