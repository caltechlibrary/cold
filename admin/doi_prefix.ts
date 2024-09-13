/**
 * doi_prefix.ts implements the doi_prefix object handler for listing, creating, retrieving, updating and delete doi_prefix objects.
 */
import {
  apiPort,
  Dataset,
  formDataToObject,
  pathIdentifier,
  renderPage,
} from "./deps.ts";

const ds = new Dataset(apiPort, "doi_prefix.ds");

/**
 * DOIPrefixInterface
 */
export interface DOIPrefixInterface {
  doi_prefix: string;
  include_in_feeds: boolean;
  name: string;
  description: string;
  updated: string;
}

/**
 * DOIPrefix class defines the data shape of the doi_prefix object managed by cold.
 */
export class DOIPrefix implements DOIPrefixInterface {
  doi_prefix: string = "";
  include_in_feeds: boolean = false;
  name: string = "";
  description: string = "";
  updated: string = "";

  migrateCsv(row: any): boolean {
    if (row.hasOwnProperty("prefix")) {
      this.include_in_feeds = true;
      this.doi_prefix = row.prefix;
    } else {
      return false;
    }
    if (row.hasOwnProperty("name")) {
      this.name = row.name;
    }
    if (row.hasOwnProperty("description")) {
      this.description = row.description;
    }
    if (row.hasOwnProperty("updated")) {
      this.updated = row.updated;
    } else {
      this.updated = new Date().toLocaleDateString("en-US");
    }
    return true;
  }

  /**
   * asObject() returns a simple object version of a instantiated doi_prefix object.
   */
  asObject(): Object {
    return {
      doi_prefix: this.doi_prefix,
      include_in_feeds: this.include_in_feeds,
      name: this.name,
      description: this.description,
      updated: this.updated,
    };
  }

  /**
   * toJSON() returns a clean JSON representation of the doi_prefix object.
   */
  toJSON(): string {
    return JSON.stringify(this.asObject());
  }
}

/**
 * handleDOIPrefix provides the dataset collection UI for managing DOIPrefix.
 * It is response for the following actions
 *
 * - list or search for doi_prefix
 * - create a doi_prefix
 * - view a doi_prefix
 * - update a doi_prefix
 * - remove a doi_prefix
 *
 * http methods and their interpretation
 *
 * - `GET /` list objects, use `?q=...` for search
 * - `POST /` creates an object
 * - `GET /{id}` retrieve an object
 * - `PUT /{id}` update an object
 * - `DELETE /{id}` delete an object
 *
 * @param {Request} req holds the request to the doi_prefix handler
 * @param {debug: boolean, htdocs: string} options holds options passed from ColdReadWriteHandlerr.
 * @returns {Response}
 */
export async function handleDOIPrefix(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  if (req.method === "GET") {
    return await handleGetDOIPrefix(req, options);
  }
  if (req.method === "POST") {
    return await handlePostDOIPrefix(req, options);
  }
  const body = `<html>${req.method} not supported</html>`;
  return new Response(body, {
    status: 405,
    headers: { "content-type": "text/html" },
  });
}

/**
 * handleGetDOIPrefix handle GET actions on doi_prefix object(s).
 *
 * @param {Request} req holds the request to the doi_prefix handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleDOIPrefix.
 * @returns {Response}
 *
 * The expected paths are in the form
 *
 * - `/` list the doi_prefix by doi_prefix name (`?q=...` would perform a search by doi_prefix name)
 * - `/{doi_prefix}` indicates retrieving a single object by the Caltech Library doi_prefix id
 */
async function handleGetDOIPrefix(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  /* parse the URL */
  const url = new URL(req.url);
  const doi_prefix = pathIdentifier(req.url);
  const params = url.searchParams;
  let view = params.get("view");
  let tmpl = "doi_prefix_list";
  if (doi_prefix !== undefined && doi_prefix !== "") {
    if (view !== undefined && view === "edit") {
      tmpl = "doi_prefix_edit";
    } else {
      tmpl = "doi_prefix";
    }
  } else {
    if (view !== "undefined" && view === "create") {
      tmpl = "doi_prefix_edit";
    }
  }

  if (tmpl === "doi_prefix_list") {
    /* display a list of doi_prefix */
    const doi_prefix_list = await ds.query("doi_prefix_names", [], {});
    if (doi_prefix_list !== undefined) {
      return renderPage(tmpl, {
        base_path: "",
        doi_prefix_list: doi_prefix_list,
      });
    } else {
      return renderPage(tmpl, {
        base_path: "",
        doi_prefix_list: [],
      });
    }
  } else {
    /* decide if we are in display view or edit view and pick the right template */
    /* retrieve a specific record */
    const doi_prefix = pathIdentifier(req.url);
    const isCreateObject = doi_prefix === "";
    const obj = await ds.read(doi_prefix);
    console.log(
      `We have a GET for doi_prefix object ${doi_prefix}, view = ${view}`,
      obj,
    );
    return renderPage(tmpl, {
      base_path: "",
      isCreateObject: isCreateObject,
      doi_prefix: obj,
      debug_src: JSON.stringify(obj, null, 2),
    });
  }
}

/**
 * handlePostDOIPrefix handle POST actions on doi_prefix object(s).
 *
 * @param {Request} req holds the request to the doi_prefix handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleDOIPrefix.
 * @returns {Response}
 */
async function handlePostDOIPrefix(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  let doi_prefix = pathIdentifier(req.url);
  const isCreateObject = doi_prefix === "";

  if (req.body !== null) {
    const form = await req.formData();
    let obj = formDataToObject(form);
    console.log(
      `DEBUG form data after converting to object -> ${JSON.stringify(obj)}`,
    );
    if (!("doi_prefix" in obj)) {
      console.log("doi_prefix missing", obj);
      return new Response(`missing doi_prefix identifier`, {
        status: 400,
        headers: { "content-type": "text/html" },
      });
    }
    if (isCreateObject) {
      console.log("DEBUG detected create request");
      doi_prefix = obj.doi_prefix as unknown as string;
    }
    if (obj.doi_prefix !== doi_prefix) {
      return new Response(
        `mismatched doi_prefix identifier ${doi_prefix} != ${obj.doi_prefix}`,
        {
          status: 400,
          headers: { "content-type": "text/html" },
        },
      );
    }
    if (isCreateObject) {
      console.log(`send to dataset create object ${doi_prefix}`);
      if (!(await ds.create(doi_prefix, obj))) {
        console.log(
          `failed to send to dataset create object ${doi_prefix}, ${
            JSON.stringify(
              obj,
            )
          }`,
        );
        return new Response(
          `<html>problem creating object ${doi_prefix}, try again later`,
          {
            status: 500,
            headers: { "content-type": "text/html" },
          },
        );
      }
    } else {
      console.log(`send to dataset update object ${doi_prefix}`);
      if (!(await ds.update(doi_prefix, obj))) {
        return new Response(
          `<html>problem updating object ${doi_prefix}, try again later`,
          {
            status: 500,
            headers: { "content-type": "text/html" },
          },
        );
      }
    }
    return new Response(`<html>Redirect to ${doi_prefix}</html>`, {
      status: 303,
      headers: { Location: `${doi_prefix}` },
    });
  }
  return new Response(`<html>problem creating doi_prefix data</html>`, {
    status: 400,
    headers: { "content-type": "text/html" },
  });
}
