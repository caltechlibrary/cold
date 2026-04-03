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
  // NOTE: We have more than FIXME: Need to pass in the parameter value(s)
  let qObj: {[key: string]: string} = {};
  let body: string = '';
  let pList: string[] = [];
  if (apiReq.query_name === 'lookup_clgid') {
    body = JSON.stringify({ name: apiReq.q, alternative: apiReq.q });
    pList = ["name", "alternative"];
  } else {
    for (let k of Object.keys(apiReq)) {
      if (k !== 'query_name' && k !== 'c_name') {
        if (apiReq.hasOwnProperty(k)) {
          // handle special case for alternative name search ..., pre-paramaterized requests
          const v = apiReq[k];
          qObj[k] = v;
          pList.push(k);
        }
      }
    }
    body = JSON.stringify(qObj);
  }
  console.log(
    `DEBUG (apiReq -> ${JSON.stringify(apiReq)}) executing ds.query("${apiReq.query_name}", ${JSON.stringify(pList)}, body) doing a POST of body -> ${body}`,
  );
  let resp = await ds.query(apiReq.query_name, pList, body);
  if (resp.ok) {
    console.log(
      `DEBUG resp -> ok ? ${resp.ok}`,
    );
    let data = await resp.json();
    console.log(
      `DEBUG data from response -> ${typeof data} -> ${JSON.stringify(data)}`,
    );
    return renderJSON(data, 200);
  }
  return renderJSON({
    "ok": false,
    "msg": "not found",
    "api": apiReq,
  }, 404);
}
