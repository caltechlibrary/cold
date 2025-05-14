/**
 * journals.ts implements the journals object handler for listing, creating, retrieving, updating and delete journals objects.
 */
import { apiPort, Dataset, pathIdentifier, renderPage } from "./deps.ts";

import { timeStamp } from "./utils.ts";

const ds = new Dataset(apiPort, "journals.ds");

/**
 * JournalsInterface
 */
export interface JournalInterface {
  /* Journals is the primary identifier for record */
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
 * Journal class defines the data shape of the journals object managed by cold.
 */
export class Journal implements JournalInterface {
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
    if (row.hasOwnProperty("Journals") && row.issn !== "") {
      this.issn = row.issn;
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
   * asObject() returns a simple object version of a instantiated journals object.
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
   * toJSON() returns a clean JSON representation of the journals object.
   */
  toJSON(): string {
    return JSON.stringify(this.asObject());
  }
}

/**
 * formDataToJournal turn the form data into a Journals object.
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
 * handleJournals provides the dataset collection UI for managing Journals.
 * It is response for the following actions
 *
 * - list or search for journals
 * - create a journals
 * - view a journals
 * - update a journals
 * - remove a journals
 *
 * http methods and their interpretation
 *
 * - `GET /` list objects, use `?q=...` for search
 * - `POST /` creates an object
 * - `GET /{id}` retrieve an object
 * - `PUT /{id}` update an object
 * - `DELETE /{id}` delete an object
 *
 * @param {Request} req holds the request to the journals handler
 * @param {debug: boolean, htdocs: string} options holds options passed from ColdReadWriteHandlerr.
 * @returns {Response}
 */
export async function handleJournals(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  if (req.method === "GET") {
    return await handleGetJournals(req, options);
  }
  if (req.method === "POST") {
    return await handlePostJournals(req, options);
  }
  const body = `<html>${req.method} not supported</html>`;
  return new Response(body, {
    status: 405,
    headers: { "content-type": "text/html" },
  });
}

/**
 * handleGetJournals handle GET actions on journals object(s).
 *
 * @param {Request} req holds the request to the journals handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleJournals.
 * @returns {Response}
 *
 * The expected paths are in the form
 *
 * - `/` list the journals by journal name (`?q=...` would perform a search by issn)
 * - `/{issn}` indicates retrieving a single object by the Caltech Library issn id
 */
async function handleGetJournals(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  /* parse the URL */
  const url = new URL(req.url);
  const issn = pathIdentifier(req.url);
  console.log(`DEBUG issn -> ${issn}`);
  const params = url.searchParams;
  let view = params.get("view");
  let tmpl = "journal_list";
  if (issn !== undefined && issn !== "") {
    if (view !== undefined && view === "edit") {
      tmpl = "journal_edit";
    } else {
      tmpl = "journal";
    }
  } else {
    if (view !== "undefined" && view === "create") {
      tmpl = "journal_edit";
    }
  }

  if (tmpl === "journal_list") {
    /* display a list of journals */
    const journal_list = await ds.query("journal_names", [], {});
    if (journal_list !== undefined) {
      return renderPage(tmpl, {
        base_path: "",
        journal_list: journal_list,
      });
    } else {
      return renderPage(tmpl, {
        base_path: "",
        journal_list: [],
      });
    }
  } else {
    /* decide if we are in display view or edit view and pick the right template */
    /* retrieve a specific record */
    const issn = pathIdentifier(req.url);
    const isCreateObject = issn === "";
    const obj = await ds.read(issn);
    console.log(
      `We have a GET for journals object ${issn}, view = ${view}, obj -> ${
        JSON.stringify(obj)
      }`,
    );
    return renderPage(tmpl, {
      base_path: "",
      isCreateObject: isCreateObject,
      journal: obj,
      debug_src: JSON.stringify(obj, null, 2),
    });
  }
}

/**
 * handlePostJournals handle POST actions on journals object(s).
 *
 * @param {Request} req holds the request to the journals handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleJournals.
 * @returns {Response}
 */
async function handlePostJournals(
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
