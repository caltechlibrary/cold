/**
 * people.ts implements the people object handler for listing, creating, retrieving, updating and delete people objects.
 */
import {
  apiPort,
  Dataset,
  formDataToObject,
  matchType,
  pathIdentifier,
  renderPage,
} from "./deps.ts";

//import type { People } from "./admin/deps.ts";

const ds = new Dataset(apiPort, "people.ds");

/**
 * handlePeople implements a middleware that supports several path end points.
 *
 * - list or search people objects
 * - create a person object
 * - view a person object
 * - update a person object
 * - remove a person object
 *
 * http methods and their role
 *
 * - `GET /` list objects, use `?q=...` for search
 * - `POST /` create an object
 * - `GET /{clpid}` retrieve an object
 * - `PUT /{clpid}` update an object
 * - `DELETE /{clpid}` delete and object
 *
 * @param {Request} req holds the request to the people handler
 * @param {debug: boolean, htdocs: string} options holds options passed from ColdReadWriteHandlerr.
 * @returns {Response}
 */
export async function handlePeople(
  req: Request,
  options: { debug: boolean; htdocs: string },
): Promise<Response> {
  if (req.method === "GET") {
    return await handleGetPeople(req, options);
  }
  const body = `<html>${req.method} not supported</html>`;
  return new Response(body, {
    status: 405,
    headers: { "content-type": "text/html" },
  });
}

/**
 * handleGetPeople hands two end points that returns either a list of people records
 * or a specific people record.
 *
 * @param {Request} req holds the request to the people handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handlePeople.
 * @returns {Promise<Response>}
 *
 * The expected paths are in the form
 *
 * - `/` list the people by name (`?q=...` would perform a search by name fields)
 * - `/{clpid}` indicates retrieving a single object by the Caltech Library people id
 */
async function handleGetPeople(
  req: Request,
  options: { debug: boolean; htdocs: string },
): Promise<Response> {
  /* parse the URL */
  const url = new URL(req.url);
  const clpid = pathIdentifier(req.url);
  const params = url.searchParams;
  let view = params.get("view");
  let tmpl = "people_list";
  /* decide if we are in display view or edit view and pick the right template */
  if (clpid !== undefined && clpid !== "") {
    if (view !== undefined && view === "edit") {
      tmpl = "people_edit";
    } else {
      tmpl = "people";
    }
  } else {
    if (view !== "undefined" && view === "create") {
      tmpl = "people_edit";
    }
  }
  if (tmpl === "people_list") {
    /* display a list of people */
    const people_list = await ds.query("people_names", [], {});
    if (people_list !== undefined) {
      return renderPage(tmpl, {
        base_path: "",
        people_list: people_list,
      });
    } else {
      return renderPage(tmpl, {
        base_path: "",
        people_list: [],
      });
    }
  } else {
    /* retrieve a specific record */
    const clpid = pathIdentifier(req.url);
    const isCreateObject = clpid === "";
    const obj = await ds.read(clpid);
    console.log(`We have a GET for people object ${clpid}, view = ${view}`);
    return renderPage(tmpl, {
      base_path: "",
      isCreateObject: isCreateObject,
      people: obj,
      debug_src: JSON.stringify(obj, null, 2),
    });
  }
}

