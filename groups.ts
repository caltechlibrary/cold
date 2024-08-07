/**
 * groups.ts implements the groups object handler for listing, creating, retrieving, updating and delete group objects.
 */
import {
  apiPort,
  Dataset,
  formDataToObject,
  matchType,
  pathIdentifier,
  renderPage,
} from "./deps.ts";

const ds = new Dataset(apiPort, "groups.ds");

/**
 * handleGroups provides the dataset collection UI for managing Groups.
 * It is response for the following actions
 *
 * - list or search for groups
 * - create a group
 * - view a group
 * - update a group
 * - remove a group
 *
 * http methods and their interpretation
 *
 * - `GET /` list objects, use `?q=...` for search
 * - `POST /` creates an object
 * - `GET /{id}` retrieve an object
 * - `PUT /{id}` update an object
 * - `DELETE /{id}` delete an object
 *
 * @param {Request} req holds the request to the group handler
 * @param {debug: boolean, htdocs: string} options holds options passed from ColdReadWriteHandlerr.
 * @returns {Response}
 */
export async function handleGroups(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  if (req.method === "GET") {
    return await handleGetGroups(req, options);
  }
  const body = `<html>${req.method} not supported</html>`;
  return new Response(body, {
    status: 405,
    headers: { "content-type": "text/html" },
  });
}

/**
 * handleGetGroups handle GET actions on group object(s).
 *
 * @param {Request} req holds the request to the group handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleGroups.
 * @returns {Response}
 *
 * The expected paths are in the form
 *
 * - `/` list the groups by group name (`?q=...` would perform a search by group name)
 * - `/{clgid}` indicates retrieving a single object by the Caltech Library group id
 */
async function handleGetGroups(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  /* parse the URL */
  const url = new URL(req.url);
  const clgid = pathIdentifier(req.url);
  const params = url.searchParams;
  let view = params.get("view");
  let tmpl = "group_list";
  if (clgid !== undefined && clgid !== "") {
    if (view !== undefined && view === "edit") {
      tmpl = "group_edit";
    } else {
      tmpl = "group";
    }
  } else {
    if (view !== "undefined" && view === "create") {
      tmpl = "group_edit";
    }
  }

  if (tmpl === "group_list") {
    /* display a list of groups */
    const group_list = await ds.query("group_names", [], {});
    if (group_list !== undefined) {
      return renderPage(tmpl, {
        base_path: "",
        group_list: group_list,
      });
    } else {
      return renderPage(tmpl, {
        base_path: "",
        group_list: [],
      });
    }
  } else {
    /* decide if we are in display view or edit view and pick the right template */
    /* retrieve a specific record */
    const clgid = pathIdentifier(req.url);
    const isCreateObject = clgid === "";
    const obj = await ds.read(clgid);
    console.log(`We have a GET for group object ${clgid}, view = ${view}`);
    return renderPage(tmpl, {
      base_path: "",
      isCreateObject: isCreateObject,
      group: obj,
      debug_src: JSON.stringify(obj, null, 2),
    });
  }
}

