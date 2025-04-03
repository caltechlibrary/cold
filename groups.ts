/**
 * groups.ts implements the groups object handler for listing, creating, retrieving, updating and delete group objects.
 */
import {
  apiPort,
  Dataset,
  formDataToObject,
  matchType,
  pathIdentifier,
  renderJSON,
  renderPage,
} from "./deps.ts";

import { timeStamp } from "./utils.ts";
import { YELLOW } from "./colors.ts";

const ds = new Dataset(apiPort, "groups.ds");

/**
 * GroupInterface
 */
export interface GroupInterface {
  clgid: string;
  include_in_feeds: boolean;
  name: string;
  alternative: string[];
  email: string;
  date: string;
  description: string;
  start_date: string;
  is_approx_start: boolean;
  end_date: string;
  is_approx_end: boolean;
  //FIXME: should activity be called status?  In the people record status seems similar.
  activity: string;
  website: string;
  pi: string;
  parent: string;
  /* prefix refers to the DOI prefix that some groups on campus have. */
  prefix: string;
  grid: string;
  isni: string;
  ringold: string;
  viaf: string;
  ror: string;
  updated: string;
  Scope: string;
  /* authors_id */
  authors_id: string;
  /* thesis_id */
  thesis_id: string;
  /* internal notes */
  internal_notes: string;
}

/**
 * Group class defines the data shape of the group object managed by cold.
 */
export class Group implements GroupInterface {
  clgid: string = "";
  include_in_feeds: boolean = false;
  name: string = "";
  alternative: string[] = [];
  email: string = "";
  date: string = "";
  description: string = "";
  start_date: string = "";
  is_approx_start: boolean = false;
  end_date: string = "";
  is_approx_end: boolean = false;
  //FIXME: should activity be called status?  In the people record status seems similar.
  activity: string = "";
  website: string = "";
  pi: string = "";
  parent: string = "";
  /* prefix refers to the DOI prefix that some groups on campus have. */
  prefix: string = "";
  grid: string = "";
  isni: string = "";
  ringold: string = "";
  viaf: string = "";
  ror: string = "";
  updated: string = "";
  Scope: string = "";
  /* authors_id */
  authors_id: string = "";
  /* thesis_id */
  thesis_id: string = "";
  /* internal_notes */
  internal_notes: string = "";

  migrateCsv(row: any): boolean {
    if (row.hasOwnProperty("key")) {
      this.include_in_feeds = true;
      this.clgid = row.key;
    } else {
      return false;
    }
    if (row.hasOwnProperty("name")) {
      this.name = row.name;
    }
    if (row.hasOwnProperty("alternative") && row.alternative !== "") {
      this.alternative = row.alternative.trim().split(/;/g);
    }
    if (row.hasOwnProperty("email")) {
      this.email = row.email;
    }
    if (row.hasOwnProperty("date")) {
      this.date = row.date;
    }
    if (row.hasOwnProperty("description")) {
      this.description = row.description;
    }
    if (row.hasOwnProperty("start")) {
      this.start_date = row.start;
    }
    if (row.hasOwnProperty("approx_start")) {
      this.is_approx_start = matchType(this.is_approx_start, row.approx_start);
    } else {
      this.is_approx_start = false;
    }
    if (row.hasOwnProperty("end")) {
      this.end_date = row.end;
    }
    if (row.hasOwnProperty("approx_end")) {
      this.is_approx_end = matchType(this.is_approx_end, row.approx_end);
    } else {
      this.is_approx_end = false;
    }
    if (row.hasOwnProperty("activity")) {
      this.activity = matchType(this.activity, row.activity);
    }
    if (row.hasOwnProperty("website")) {
      this.website = row.website;
    }
    if (row.hasOwnProperty("pi")) {
      this.pi = row.pi;
    }
    if (row.hasOwnProperty("parent")) {
      this.parent = row.parent;
    }
    if (row.hasOwnProperty("prefix")) {
      this.prefix = row.prefix;
    }
    if (row.hasOwnProperty("grid")) {
      this.grid = row.grid;
    }
    if (row.hasOwnProperty("isni")) {
      this.isni = row.isni;
    }
    if (row.hasOwnProperty("ringold")) {
      this.ringold = row.ringold;
    }
    if (row.hasOwnProperty("viaf")) {
      this.viaf = row.viaf;
    }
    if (row.hasOwnProperty("ror")) {
      this.ror = row.ror;
    }
    if (row.hasOwnProperty("internal_notes")) {
      this.internal_notes = row.internal_notes;
    }
    if (row.hasOwnProperty("updated")) {
      this.updated = row.updated;
    } else {
      this.updated = timeStamp(new Date());
    }

    if (row.hasOwnProperty("Scope")) {
      this.Scope = row.Scope;
    }
    return true;
  }

  /**
   * asObject() returns a simple object version of a instantiated Group object.
   */
  asObject(): Object {
    return {
      clgid: this.clgid,
      include_in_feeds: this.include_in_feeds,
      name: this.name,
      alternative: this.alternative,
      email: this.email,
      date: this.date,
      description: this.description,
      start_date: this.start_date,
      is_approx_start: this.is_approx_start,
      end_date: this.end_date,
      is_approx_end: this.is_approx_end,
      activity: this.activity,
      website: this.website,
      pi: this.pi,
      parent: this.parent,
      prefix: this.prefix,
      grid: this.grid,
      isni: this.isni,
      ringold: this.ringold,
      viaf: this.viaf,
      ror: this.ror,
      updated: this.updated,
      Scope: this.Scope,
      internal_notes: this.internal_notes,
    };
  }

  /**
   * toJSON() returns a clean JSON representation of the group object.
   */
  toJSON(): string {
    return JSON.stringify(this.asObject());
  }
}

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
  if (req.method === "POST") {
    return await handlePostGroups(req, options);
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
  const lookup: string | null = params.get("q");
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
    /* display a list of groups or lookup result */
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
    if (options.debug) console.log(`We have a GET for group object ${clgid}, view = ${view}, %c${JSON.stringify(obj, null, 2)}`, YELLOW);
    return renderPage(tmpl, {
      base_path: "",
      isCreateObject: isCreateObject,
      group: obj,
      debug_src: JSON.stringify(obj, null, 2),
    });
  }
}

/**
 * handlePostGroups handle POST actions on group object(s).
 *
 * @param {Request} req holds the request to the group handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleGroups.
 * @returns {Response}
 */
async function handlePostGroups(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Promise<Response> {
  let clgid = pathIdentifier(req.url);
  const isCreateObject = clgid === "";

  if (req.body !== null) {
    const form = await req.formData();
    let obj: Object = formDataToObject(form);
    console.log(
      `DEBUG form data after converting to object -> ${JSON.stringify(obj)}`,
    );
    if (!("clgid" in obj)) {
      console.log("clgid missing", obj);
      return new Response(`missing group identifier`, {
        status: 400,
        headers: { "content-type": "text/html" },
      });
    }
    if (options.debug) {
      console.log(
        `DEBUG form object -> %c${JSON.stringify(obj, null, 2)}`,
        YELLOW,
      );
    }
    if (isCreateObject) {
      console.log("DEBUG detected create request");
      clgid = obj.clgid as unknown as string;
    }
    if (obj.clgid !== clgid) {
      return new Response(
        `mismatched group identifier ${clgid} != ${obj.clgid}`,
        {
          status: 400,
          headers: { "content-type": "text/html" },
        },
      );
    }
    if (isCreateObject) {
      if (options.debug) console.log(`send to dataset create object ${clgid} -> %c${JSON.stringify(obj, null, 2)}`, YELLOW);
      if (!(await ds.create(clgid, obj))) {
        return new Response(
          `<html>problem creating object ${clgid}, try again later`,
          {
            status: 500,
            headers: { "content-type": "text/html" },
          },
        );
      }
    } else {
      if (options.debug) console.log(`send to dataset update object ${clgid} -> %c${JSON.stringify(obj, null, 2)}`, YELLOW);
      if (!(await ds.update(clgid, obj))) {
        return new Response(
          `<html>problem updating object ${clgid}, try again later`,
          {
            status: 500,
            headers: { "content-type": "text/html" },
          },
        );
      }
    }
    return new Response(`<html>Redirect to ${clgid}</html>`, {
      status: 303,
      headers: { Location: `${clgid}` },
    });
  }
  return new Response(`<html>problem creating group data</html>`, {
    status: 400,
    headers: { "content-type": "text/html" },
  });
}
