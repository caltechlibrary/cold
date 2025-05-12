/**
 * thesis_option.ts implements the thesis option object handler for listing, creating, retrieving, updating and delete thesis option objects.
 */
import { apiPort, Dataset, pathIdentifier, renderPage } from "./deps.ts";

import { timeStamp } from "./utils.ts";

const ds = new Dataset(apiPort, "thesis_options.ds");

/**
 * ThesisOptionInterface
 */
export interface ThesisOptionInterface {
  /* option_id identifier for thesis option */
  option_id: string;
  /* Name of thesis option */
  name: string;
  /* Division offering the option */
  division: string;
  /* Internal Notes */
  internal_notes: string;
  /* Date record was updated */
  updated: string;
}

/**
 * ThesisOption class defines the data shape of the ThesisOption object managed by cold.
 */
export class ThesisOption implements ThesisOptionInterface {
  option_id: string = "";
  name: string = "";
  division: string = "";
  internal_notes: string = "";
  updated: string = "";

  migrateCsv(row: any): boolean {
    if (row.hasOwnProperty("option_id") && row.option_id !== "") {
      this.option_id = row.option_id;
    } else {
      return false;
    }
    if (row.hasOwnProperty("name")) {
      this.name = row.name;
    }
    if (row.hasOwnProperty("division")) {
      this.name = row.divisison;
    }
    if (row.hasOwnProperty("Internal Notes")) {
      this.internal_notes = row.internal_notes;
    }
    if (row.hasOwnProperty("updated")) {
      this.updated = row.updated;
    } else {
      this.updated = new Date().toJSON().substring(0, 10);
    }
    return true;
  }

  /**
   * asObject() returns a simple object version of a instantiated ThesisOption object.
   */
  asObject(): Object {
    return {
      option_id: this.option_id,
      name: this.name,
      division: this.division,
      internal_notes: this.internal_notes,
      updated: this.updated,
    };
  }

  /**
   * toJSON() returns a clean JSON representation of the ThesisOption object.
   */
  toJSON(): string {
    return JSON.stringify(this.asObject());
  }
}

/**
 * formDataToThesisOption turn the form data into a option_id object.
 * The difference from the utils.ts forDataToObject is that the
 * alternative names fields needs to be converted from form text to an
 * array of string, one per line of form text.
 *
 * @param {FormData} form data the form object to process
 * @returns {Object}
 */
export function formDataToThesisOption(form: FormData): object {
  const obj: { [k: string]: string | string[] | boolean } = {};
  for (const v of form.entries()) {
    const key: string = v[0];
    if (key !== "submit") {
      const val: any = v[1];
      if (val === "true" || val === "on") {
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
 * handleThesisOption provides the dataset collection UI for managing ThesisOption.
 * It is response for the following actions
 *
 * - list or search for ThesisOption
 * - create a ThesisOption
 * - view a ThesisOption
 * - update a ThesisOption
 * - remove a ThesisOption
 *
 * http methods and their interpretation
 *
 * - `GET /` list objects, use `?q=...` for search
 * - `POST /` creates an object
 * - `GET /{id}` retrieve an object
 * - `PUT /{id}` update an object
 * - `DELETE /{id}` delete an object
 *
 * @param {Request} req holds the request to the ThesisOption handler
 * @param {debug: boolean, htdocs: string} options holds options passed from ColdReadWriteHandlerr.
 * @returns {Response}
 */
export async function handleThesisOption(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  if (req.method === "GET") {
    return await handleGetThesisOption(req, options);
  }
  if (req.method === "POST") {
    return await handlePostThesisOption(req, options);
  }
  const body = `<html>${req.method} not supported</html>`;
  return new Response(body, {
    status: 405,
    headers: { "content-type": "text/html" },
  });
}

/**
 * handleGetThesisOption handle GET actions on ThesisOption object(s).
 *
 * @param {Request} req holds the request to the ThesisOption handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleThesisOption.
 * @returns {Response}
 *
 * The expected paths are in the form
 *
 * - `/` list the ThesisOption by ThesisOption name (`?q=...` would perform a search by ThesisOption name)
 * - `/{ThesisOption}` indicates retrieving a single object by the Caltech Library ThesisOption option_id
 */
async function handleGetThesisOption(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  /* parse the URL */
  const url = new URL(req.url);
  const option_id = pathIdentifier(req.url);
  const params = url.searchParams;
  let view = params.get("view");
  let tmpl = "thesis_option_list";
  if (option_id !== undefined && option_id !== "") {
    if (view !== undefined && view === "edit") {
      tmpl = "thesis_option_edit";
    } else {
      tmpl = "thesis_option";
    }
  } else {
    if (view !== "undefined" && view === "create") {
      tmpl = "thesis_option_edit";
    }
  }

  if (tmpl === "thesis_option_list") {
    /* display a list of ThesisOption */
    const thesis_option_list = await ds.query("thesis_option_names", [], {});
    if (thesis_option_list !== undefined) {
      return renderPage(tmpl, {
        base_path: "",
        thesis_option_list: thesis_option_list,
      });
    } else {
      return renderPage(tmpl, {
        base_path: "",
        thesis_option_list: [],
      });
    }
  } else {
    /* decide if we are in display view or edit view and pick the right template */
    /* retrieve a specific record */
    const option_id = pathIdentifier(req.url);
    const isCreateObject = option_id === "";
    const obj = await ds.read(option_id);
    console.log(
      `We have a GET for thesis option object ${option_id}, view = ${view}`,
    );
    return renderPage(tmpl, {
      base_path: "",
      isCreateObject: isCreateObject,
      thesis_option: obj,
      debug_src: JSON.stringify(obj, null, 2),
    });
  }
}

/**
 * handlePostThesisOption handle POST actions on ThesisOption object(s).
 *
 * @param {Request} req holds the request to the ThesisOption handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleThesisOption.
 * @returns {Response}
 */
async function handlePostThesisOption(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  let option_id = pathIdentifier(req.url);
  const isCreateObject = option_id === "";

  if (req.body !== null) {
    const form = await req.formData();
    let obj = formDataToThesisOption(form);
    console.log(
      `DEBUG form data after converting to object -> ${JSON.stringify(obj)}`,
    );
    if (!("option_id" in obj)) {
      console.log("option_id missing", obj);
      return new Response(`missing thesis option identifier`, {
        status: 400,
        headers: { "content-type": "text/html" },
      });
    }
    if (isCreateObject) {
      console.log("DEBUG detected create request");
      option_id = obj.option_id as unknown as string;
    }
    if (obj.option_id !== option_id) {
      return new Response(
        `mismatched thesis option identifier ${option_id} != ${obj.option_id}`,
        {
          status: 400,
          headers: { "content-type": "text/html" },
        },
      );
    }
    if (isCreateObject) {
      console.log(`send to dataset create object ${option_id}`);
      if (!(await ds.create(option_id, obj))) {
        return new Response(
          `<html>problem creating object ${option_id}, try again later`,
          {
            status: 500,
            headers: { "content-type": "text/html" },
          },
        );
      }
    } else {
      console.log(`send to dataset update object ${option_id}`);
      if (!(await ds.update(option_id, obj))) {
        return new Response(
          `<html>problem updating object ${option_id}, try again later`,
          {
            status: 500,
            headers: { "content-type": "text/html" },
          },
        );
      }
    }
    return new Response(`<html>Redirect to ${option_id}</html>`, {
      status: 303,
      headers: { Location: `${option_id}` },
    });
  }
  return new Response(`<html>problem creating thesis option data</html>`, {
    status: 400,
    headers: { "content-type": "text/html" },
  });
}
