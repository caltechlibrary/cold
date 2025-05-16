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

const ds = new Dataset(apiPort, "funders.ds");

/**
 * FunderInterface
 */
export interface FunderInterface {
  clfid: string;
  include_in_feeds: boolean;
  name: string;
  acronyms: string[];
  description: string;
  type: string;
  url: string;
  ror: string;
  ofr: string;
  doi: string;
  grant_numbers: string[];
  updated: string;
}

/**
 * Funder class defines the data shape of the funder object managed by cold.
 */
export class Funder implements FunderInterface {
  clfid: string = "";
  include_in_feeds: boolean = false;
  name: string = "";
  acronyms: string[] = [];
  description: string = "";
  type: string = "";
  url: string = "";
  ror: string = "";
  ofr: string = "";
  doi: string = "";
  grant_numbers: string[] = [];
  updated: string = "";

  migrateCsv(row: any): boolean {
    if (row.hasOwnProperty("key")) {
      this.include_in_feeds = true;
      this.clfid = row.key;
    } else {
      return false;
    }
    if (row.hasOwnProperty("name")) {
      this.name = row.name;
    }
    if (row.hasOwnProperty("grant_numbers") && row.grant_numbers !== "") {
      this.grant_numbers = row.grant_numbers.trim().split(/;/g);
    }
    if (row.hasOwnProperty("description")) {
      this.description = row.description;
    }
    if (row.hasOwnProperty("type")) {
      this.type = row.type;
    }
    if (row.hasOwnProperty("url")) {
      this.url = row.rul;
    }
    if (row.hasOwnProperty("ror")) {
      this.ror = row.ror;
    }
    if (row.hasOwnProperty("ofr")) {
      this.ofr = row.ofr;
    }
    if (row.hasOwnProperty("doi")) {
      this.doi = row.doi;
    }
    if (row.hasOwnProperty("updated")) {
      this.updated = row.updated;
    } else {
      this.updated = new Date().toJSON().substring(0, 10);
    }
    return true;
  }

  /**
   * asObject() returns a simple object version of a instantiated funder object.
   */
  asObject(): Object {
    return {
      clfid: this.clfid,
      include_in_feeds: this.include_in_feeds,
      name: this.name,
      acronyms: this.acronyms,
      description: this.description,
      type: this.type,
      url: this.url,
      grant_numbers: this.grant_numbers,
      ror: this.ror,
      ofr: this.ofr,
      doi: this.doi,
      updated: this.updated,
    };
  }

  /**
   * toJSON() returns a clean JSON representation of the funder object.
   */
  toJSON(): string {
    return JSON.stringify(this.asObject());
  }
}

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
  if (req.method === "POST") {
    return await handlePostFunders(req, options);
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
        base_path: "",
        funder_list: funder_list,
      });
    } else {
      return renderPage(tmpl, {
        base_path: "",
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
      base_path: "",
      isCreateObject: isCreateObject,
      funder: obj,
      debug_src: JSON.stringify(obj, null, 2),
    });
  }
}

/**
 * handlePostFunder handle POST actions on funder object(s).
 *
 * @param {Request} req holds the request to the funder handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleFunder.
 * @returns {Response}
 */
async function handlePostFunders(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  let clfid = pathIdentifier(req.url);
  const isCreateObject = clfid === "";

  if (req.body !== null) {
    const form = await req.formData();
    let obj = formDataToObject(form);
    console.log(
      `DEBUG form data after converting to object -> ${JSON.stringify(obj)}`,
    );
    if (!("clfid" in obj)) {
      console.log("clfid missing", obj);
      return new Response(`missing funder identifier`, {
        status: 400,
        headers: { "content-type": "text/html" },
      });
    }
    if (isCreateObject) {
      console.log("DEBUG detected create request");
      clfid = obj.clfid as unknown as string;
    }
    if (obj.clfid !== clfid) {
      return new Response(
        `mismatched funder identifier ${clfid} != ${obj.clfid}`,
        {
          status: 400,
          headers: { "content-type": "text/html" },
        },
      );
    }
    if (isCreateObject) {
      console.log(`send to dataset create object ${clfid}`);
      if (!(await ds.create(clfid, obj))) {
        return new Response(
          `<html>problem creating object ${clfid}, try again later`,
          {
            status: 500,
            headers: { "content-type": "text/html" },
          },
        );
      }
    } else {
      console.log(`send to dataset update object ${clfid}`);
      if (!(await ds.update(clfid, obj))) {
        return new Response(
          `<html>problem updating object ${clfid}, try again later`,
          {
            status: 500,
            headers: { "content-type": "text/html" },
          },
        );
      }
    }
    return new Response(`<html>Redirect to ${clfid}</html>`, {
      status: 303,
      headers: { Location: `${clfid}` },
    });
  }
  return new Response(`<html>problem creating funder data</html>`, {
    status: 400,
    headers: { "content-type": "text/html" },
  });
}
