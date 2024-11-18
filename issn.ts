/**
 * issn.ts implements the issn object handler for listing, creating, retrieving, updating and delete issn objects.
 */
import { apiPort, Dataset, pathIdentifier, renderPage } from "./deps.ts";

import { timeStamp } from "./utils.ts";

const ds = new Dataset(apiPort, "issn.ds");

/**
 * ISSNInterface
 */
export interface ISSNInterface {
  /* ISSN is the primary identifier for record */
  issn: string;
  /* Name of Journal */
  name: string;
  /* Other Journal names */
  alternate_names: string[];
  /* Publisher Name */
  publisher_name: string;
  /* Publisher Address */
  publisher_address: string;
  /* Publisher Country, State/Province/Region of Journal */
  publisher_location: string;
  /* Decription of Journal */
  description: string;
  /* Internal Notes */
  internal_notes: string;
  /* Date record was updated */
  updated: string;
}

/**
 * ISSN class defines the data shape of the issn object managed by cold.
 */
export class ISSN implements ISSNInterface {
  issn: string = "";
  name: string = "";
  alternate_names: string[] = [];
  publisher_name: string = "";
  publisher_location: string = "";
  publisher_address: string = "";
  description: string = "";
  internal_notes: string = "";
  updated: string = "";

  migrateCsv(row: any): boolean {
    if (row.hasOwnProperty("ISSN") && row.issn !== "") {
      this.issn = row.ISSN;
    } else {
      return false;
    }
    if (row.hasOwnProperty("name")) {
      this.name = row.name;
    }
    if (row.hasOwnProperty("Journal Name")) {
      this.name = row["Journal Name"];
    }
    if (row.hasOwnProperty("Publisher")) {
      this.publisher_name = row.Publisher;
    }
    if (row.hasOwnProperty("Internal Notes")) {
      this.internal_notes = row.internal_notes;
    }
    if (row.hasOwnProperty("alternate_names")) {
      this.alternate_names = row.alernate_name.split(/;/g);
    }
    if (row.hasOwnProperty("publisher_name")) {
      this.publisher_name = row.publisher_name;
    }
    if (row.hasOwnProperty("publisher_location")) {
      this.publisher_location = row.publisher_location;
    }
    if (row.hasOwnProperty("publisher_address")) {
      this.publisher_address = row.publisher_address;
    }
    if (row.hasOwnProperty("description")) {
      this.description = row.description;
    }
    if (row.hasOwnProperty("updated")) {
      this.updated = row.updated;
    } else {
      this.updated = new Date().toJSON().substring(0, 10);
    }
    return true;
  }

  /**
   * asObject() returns a simple object version of a instantiated issn object.
   */
  asObject(): Object {
    return {
      issn: this.issn,
      name: this.name,
      alternate_names: this.alternate_names,
      publisher_name: this.publisher_name,
      publisher_location: this.publisher_location,
      publisher_address: this.publisher_address,
      description: this.description,
      internal_notes: this.internal_notes,
      updated: this.updated,
    };
  }

  /**
   * toJSON() returns a clean JSON representation of the issn object.
   */
  toJSON(): string {
    return JSON.stringify(this.asObject());
  }
}

/**
 * formDataToJournal turn the form data into a ISSN object.
 * The difference from the utils.ts forDataToObject is that the
 * alternative names fields needs to be converted from form text to an
 * array of string, one per line of form text.
 *
 * @param {FormData} form data the form object to process
 * @returns {Object}
 */
export function formDataToJournal(form: FormData): object {
  const obj: { [k: string]: string | string[] | boolean } = {};
  for (const v of form.entries()) {
    const key: string = v[0];
    if (key !== "submit") {
      const val: any = v[1];
      if (key === "alternative_names") {
        const alt_names: string = (v[1] as any as string).trim();
        if (alt_names != "") {
          obj[key] = alt_names.split(/\n/g) as string[];
        } else {
          obj[key] = [];
        }
      } else if (val === "true" || val === "on") {
        obj[key] = true;
      } else if (val === "false" || val === "off") {
        obj[key] = false;
      } else {
        obj[key] = val;
      }
    }
  }
  /*  NOTE: Make sure we update obj.updated */
  obj["updated"] = timeStamp(new Date());
  return obj;
}

/**
 * handleISSN provides the dataset collection UI for managing ISSN.
 * It is response for the following actions
 *
 * - list or search for issn
 * - create a issn
 * - view a issn
 * - update a issn
 * - remove a issn
 *
 * http methods and their interpretation
 *
 * - `GET /` list objects, use `?q=...` for search
 * - `POST /` creates an object
 * - `GET /{id}` retrieve an object
 * - `PUT /{id}` update an object
 * - `DELETE /{id}` delete an object
 *
 * @param {Request} req holds the request to the issn handler
 * @param {debug: boolean, htdocs: string} options holds options passed from ColdReadWriteHandlerr.
 * @returns {Response}
 */
export async function handleISSN(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  if (req.method === "GET") {
    return await handleGetISSN(req, options);
  }
  if (req.method === "POST") {
    return await handlePostISSN(req, options);
  }
  const body = `<html>${req.method} not supported</html>`;
  return new Response(body, {
    status: 405,
    headers: { "content-type": "text/html" },
  });
}

/**
 * handleGetISSN handle GET actions on issn object(s).
 *
 * @param {Request} req holds the request to the issn handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleISSN.
 * @returns {Response}
 *
 * The expected paths are in the form
 *
 * - `/` list the issn by issn name (`?q=...` would perform a search by issn name)
 * - `/{issn}` indicates retrieving a single object by the Caltech Library issn id
 */
async function handleGetISSN(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  /* parse the URL */
  const url = new URL(req.url);
  const issn = pathIdentifier(req.url);
  const params = url.searchParams;
  let view = params.get("view");
  let tmpl = "issn_list";
  if (issn !== undefined && issn !== "") {
    if (view !== undefined && view === "edit") {
      tmpl = "issn_edit";
    } else {
      tmpl = "issn";
    }
  } else {
    if (view !== "undefined" && view === "create") {
      tmpl = "issn_edit";
    }
  }

  if (tmpl === "issn_list") {
    /* display a list of issn */
    const issn_list = await ds.query("issn_names", [], {});
    if (issn_list !== undefined) {
      return renderPage(tmpl, {
        base_path: "",
        issn_list: issn_list,
      });
    } else {
      return renderPage(tmpl, {
        base_path: "",
        issn_list: [],
      });
    }
  } else {
    /* decide if we are in display view or edit view and pick the right template */
    /* retrieve a specific record */
    const issn = pathIdentifier(req.url);
    const isCreateObject = issn === "";
    const obj = await ds.read(issn);
    console.log(`We have a GET for issn object ${issn}, view = ${view}`);
    return renderPage(tmpl, {
      base_path: "",
      isCreateObject: isCreateObject,
      issn: obj,
      debug_src: JSON.stringify(obj, null, 2),
    });
  }
}

/**
 * handlePostISSN handle POST actions on issn object(s).
 *
 * @param {Request} req holds the request to the issn handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleISSN.
 * @returns {Response}
 */
async function handlePostISSN(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  let issn = pathIdentifier(req.url);
  const isCreateObject = issn === "";

  if (req.body !== null) {
    const form = await req.formData();
    let obj = formDataToJournal(form);
    console.log(
      `DEBUG form data after converting to object -> ${JSON.stringify(obj)}`,
    );
    if (!("issn" in obj)) {
      console.log("issn missing", obj);
      return new Response(`missing issn identifier`, {
        status: 400,
        headers: { "content-type": "text/html" },
      });
    }
    if (isCreateObject) {
      console.log("DEBUG detected create request");
      issn = obj.issn as unknown as string;
    }
    if (obj.issn !== issn) {
      return new Response(`mismatched issn identifier ${issn} != ${obj.issn}`, {
        status: 400,
        headers: { "content-type": "text/html" },
      });
    }
    if (isCreateObject) {
      console.log(`send to dataset create object ${issn}`);
      if (!(await ds.create(issn, obj))) {
        return new Response(
          `<html>problem creating object ${issn}, try again later`,
          {
            status: 500,
            headers: { "content-type": "text/html" },
          },
        );
      }
    } else {
      console.log(`send to dataset update object ${issn}`);
      if (!(await ds.update(issn, obj))) {
        return new Response(
          `<html>problem updating object ${issn}, try again later`,
          {
            status: 500,
            headers: { "content-type": "text/html" },
          },
        );
      }
    }
    return new Response(`<html>Redirect to ${issn}</html>`, {
      status: 303,
      headers: { Location: `${issn}` },
    });
  }
  return new Response(`<html>problem creating issn data</html>`, {
    status: 400,
    headers: { "content-type": "text/html" },
  });
}
