/**
 * subjects.ts implements the subject object handler for listing, creating, retrieving, updating and delete subject objects.
 */
import {
  apiPort,
  Dataset,
  formDataToObject,
  pathIdentifier,
  renderPage,
} from "./deps.ts";

const ds = new Dataset(apiPort, "subjects.ds");

/**
 * SubjectInterface
 */
export interface SubjectInterface {
  clsid: string;
  include_in_feeds: boolean;
  name: string;
  description: string;
  doi: string;
  updated: string;
}

/**
 * Subject class defines the data shape of the subject object managed by cold.
 */
export class Subject implements SubjectInterface {
  clsid: string = "";
  include_in_feeds: boolean = false;
  name: string = "";
  description: string = "";
  doi: string = "";
  updated: string = "";

  migrateCsv(row: any): boolean {
    if (row.hasOwnProperty("key")) {
      this.include_in_feeds = true;
      this.clsid = row.key;
    } else {
      return false;
    }
    if (row.hasOwnProperty("name")) {
      this.name = row.name;
    }
    if (row.hasOwnProperty("description")) {
      this.description = row.description;
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
   * asObject() returns a simple object version of a instantiated subject object.
   */
  asObject(): Object {
    return {
      clsid: this.clsid,
      include_in_feeds: this.include_in_feeds,
      name: this.name,
      doi: this.doi,
      description: this.description,
      updated: this.updated,
    };
  }

  /**
   * toJSON() returns a clean JSON representation of the subject object.
   */
  toJSON(): string {
    return JSON.stringify(this.asObject());
  }
}

/**
 * handleSubjects provides the dataset collection UI for managing Subjects.
 * It is response for the following actions
 *
 * - list or search for subjects
 * - create a subject
 * - view a subject
 * - update a subject
 * - remove a subject
 *
 * http methods and their interpretation
 *
 * - `GET /` list objects, use `?q=...` for search
 * - `POST /` creates an object
 * - `GET /{id}` retrieve an object
 * - `PUT /{id}` update an object
 * - `DELETE /{id}` delete an object
 *
 * @param {Request} req holds the request to the subject handler
 * @param {debug: boolean, htdocs: string} options holds options passed from ColdReadWriteHandlerr.
 * @returns {Response}
 */
export async function handleSubjects(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  if (req.method === "GET") {
    return await handleGetSubjects(req, options);
  }
  if (req.method === "POST") {
    return await handlePostSubjects(req, options);
  }
  const body = `<html>${req.method} not supported</html>`;
  return new Response(body, {
    status: 405,
    headers: { "content-type": "text/html" },
  });
}

/**
 * handleGetSubjects handle GET actions on subject object(s).
 *
 * @param {Request} req holds the request to the subject handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleSubject.
 * @returns {Response}
 *
 * The expected paths are in the form
 *
 * - `/` list the subjects by subject name (`?q=...` would perform a search by subject name)
 * - `/{clsid}` indicates retrieving a single object by the Caltech Library subject id
 */
async function handleGetSubjects(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  /* parse the URL */
  const url = new URL(req.url);
  const clsid = pathIdentifier(req.url);
  const params = url.searchParams;
  let view = params.get("view");
  let tmpl = "subject_list";
  if (clsid !== undefined && clsid !== "") {
    if (view !== undefined && view === "edit") {
      tmpl = "subject_edit";
    } else {
      tmpl = "subject";
    }
  } else {
    if (view !== "undefined" && view === "create") {
      tmpl = "subject_edit";
    }
  }

  if (tmpl === "subject_list") {
    /* display a list of subjects */
    const subject_list = await ds.query("subject_names", [], {});
    if (subject_list !== undefined) {
      return renderPage(tmpl, {
        base_path: "",
        subject_list: subject_list,
      });
    } else {
      return renderPage(tmpl, {
        base_path: "",
        subject_list: [],
      });
    }
  } else {
    /* decide if we are in display view or edit view and pick the right template */
    /* retrieve a specific record */
    const clsid = pathIdentifier(req.url);
    const isCreateObject = clsid === "";
    const obj = await ds.read(clsid);
    console.log(`We have a GET for subject object ${clsid}, view = ${view}`);
    return renderPage(tmpl, {
      base_path: "",
      isCreateObject: isCreateObject,
      subject: obj,
      debug_src: JSON.stringify(obj, null, 2),
    });
  }
}

/**
 * handlePostSubject handle POST actions on subject object(s).
 *
 * @param {Request} req holds the request to the subject handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleSubject.
 * @returns {Response}
 */
async function handlePostSubjects(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  let clsid = pathIdentifier(req.url);
  const isCreateObject = clsid === "";

  if (req.body !== null) {
    const form = await req.formData();
    let obj = formDataToObject(form);
    console.log(
      `DEBUG form data after converting to object -> ${JSON.stringify(obj)}`,
    );
    if (!("clsid" in obj)) {
      console.log("clsid missing", obj);
      return new Response(`missing subject identifier`, {
        status: 400,
        headers: { "content-type": "text/html" },
      });
    }
    if (isCreateObject) {
      console.log("DEBUG detected create request");
      clsid = obj.clsid as unknown as string;
    }
    if (obj.clsid !== clsid) {
      return new Response(
        `mismatched subject identifier ${clsid} != ${obj.clsid}`,
        {
          status: 400,
          headers: { "content-type": "text/html" },
        },
      );
    }
    if (isCreateObject) {
      console.log(`send to dataset create object ${clsid}`);
      if (!(await ds.create(clsid, obj))) {
        return new Response(
          `<html>problem creating object ${clsid}, try again later`,
          {
            status: 500,
            headers: { "content-type": "text/html" },
          },
        );
      }
    } else {
      console.log(`send to dataset update object ${clsid}`);
      if (!(await ds.update(clsid, obj))) {
        return new Response(
          `<html>problem updating object ${clsid}, try again later`,
          {
            status: 500,
            headers: { "content-type": "text/html" },
          },
        );
      }
    }
    return new Response(`<html>Redirect to ${clsid}</html>`, {
      status: 303,
      headers: { Location: `${clsid}` },
    });
  }
  return new Response(`<html>problem creating subject data</html>`, {
    status: 400,
    headers: { "content-type": "text/html" },
  });
}
