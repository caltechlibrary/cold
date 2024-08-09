/**
 * funders.ts implements the funder object handler for listing, creating, retrieving, updating and delete funder objects.
 */
import {
  apiPort,
  Dataset,
  formDataToObject,
  pathIdentifier,
  renderPage,
} from "./deps.ts";

const base_path = "";
const ds = new Dataset(apiPort, "funders.ds");

/**
 * handleFunders provides the dataset collection UI for managing Funders.
 * It is response for the following actions
 *
 * - list or search for funders
 * - create a funder
 * - view a funder
 * - update a funder
 * - remove a funder
 *
 * http methods and their interpretation
 *
 * - `GET /` list objects, use `?q=...` for search
 * - `POST /` creates an object
 * - `GET /{id}` retrieve an object
 * - `PUT /{id}` update an object
 * - `DELETE /{id}` delete an object
 *
 * @param {Request} req holds the request to the funder handler
 * @param {debug: boolean, htdocs: string} options holds options passed from ColdReadWriteHandlerr.
 * @returns {Response}
 */
export async function handleFunders(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  if (req.method === "GET") {
    return await handleGetFunders(req, options);
  }
  const body = `<html>${req.method} not supported</html>`;
  return new Response(body, {
    status: 405,
    headers: { "content-type": "text/html" },
  });
}

/**
 * handleGetFunders handle GET actions on funder object(s).
 *
 * @param {Request} req holds the request to the funder handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleFunder.
 * @returns {Response}
 *
 * The expected paths are in the form
 *
 * - `/` list the funders by funder name (`?q=...` would perform a search by funder name)
 * - `/{clfid}` indicates retrieving a single object by the Caltech Library funder id
 */
async function handleGetFunders(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  /* parse the URL */
  const url = new URL(req.url);
  const clfid = pathIdentifier(req.url);
  const params = url.searchParams;
  let view = params.get("view");
  let tmpl = "funder_list";
  if (clfid !== undefined && clfid !== "") {
    if (view !== undefined && view === "edit") {
      tmpl = "funder_edit";
    } else {
      tmpl = "funder";
    }
  } else {
    if (view !== "undefined" && view === "create") {
      tmpl = "funder_edit";
    }
  }

  if (tmpl === "funder_list") {
    /* display a list of funders */
    const funder_list = await ds.query("funder_names", [], {});
    if (funder_list !== undefined) {
      return renderPage(tmpl, {
        base_path: base_path,
        funder_list: funder_list,
      });
    } else {
      return renderPage(tmpl, {
        base_path: base_path,
        funder_list: [],
      });
    }
  } else {
    /* decide if we are in display view or edit view and pick the right template */
    /* retrieve a specific record */
    const clfid = pathIdentifier(req.url);
    const isCreateObject = clfid === "";
    const obj = await ds.read(clfid);
    console.log(`We have a GET for funder object ${clfid}, view = ${view}`);
    return renderPage(tmpl, {
      base_path: base_path,
      isCreateObject: isCreateObject,
      funder: obj,
      debug_src: JSON.stringify(obj, null, 2),
    });
  }
}

