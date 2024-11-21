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

const ds = new Dataset(apiPort, "people.ds");

/**
 * PeopleInterface describes a People obejct.
 */
export interface PeopleInterface {
  clpid: string;
  include_in_feeds: boolean;
  display_name: string;
  family_name: string;
  given_name: string;
  email: string;
  archivesspace_id: string;
  directory_user_id: string;
  directory_person_type: string;
  title: string;
  bio: string;
  division: string;
  status: string;
  viaf: string;
  lcnaf: string;
  isni: string;
  wikidata: string;
  snac: string;
  orcid: string;
  ror: string;
  image_url: string;
  education: string;
  caltech: boolean;
  jpl: boolean;
  faculty: boolean;
  alumn: boolean;
  staff: boolean;
  updated: string;
  authors_id: string;
  thesis_id: string;
  advisors_id: string;
  internal_notes: string;
}

/**
 * People implements a Caltech People object
 */
export class People implements PeopleInterface {
  clpid: string = "";
  include_in_feeds: boolean = false;
  display_name: string = "";
  family_name: string = "";
  given_name: string = "";
  email: string = "";
  archivesspace_id: string = "";
  directory_user_id: string = "";
  directory_person_type: string = "";
  title: string = "";
  bio: string = "";
  division: string = "";
  status: string = "";
  viaf: string = "";
  lcnaf: string = "";
  isni: string = "";
  wikidata: string = "";
  snac: string = "";
  orcid: string = "";
  ror: string = "";
  image_url: string = "";
  education: string = "";
  caltech: boolean = false;
  jpl: boolean = false;
  faculty: boolean = false;
  alumn: boolean = false;
  staff: boolean = false;
  updated: string = "";
  authors_id: string = "";
  thesis_id: string = "";
  advisors_id: string = "";
  internal_notes: string = "";

  migrateCsv(row: any): boolean {
    // NOTE: Skipping the follow legacy columns: thesis_id,advisors_id,authors_id
    // authors_count,thesis_count,data_count,advisor_count,editor_count
    if (row.hasOwnProperty("cl_people_id")) {
      this.clpid = row.cl_people_id;
    } else {
      return false;
    }
    if (row.hasOwnProperty("thesis_id")) {
      this.thesis_id = row.thesis_id;
    }
    if (row.hasOwnProperty("authors_id")) {
      this.authors_id = row.authors_id;
    }
    if (row.hasOwnProperty("advisor_id")) {
      this.advisors_id = row.advisor_id;
    }
    if (row.hasOwnProperty("family_name")) {
      this.family_name = row.family_name;
    }
    if (row.hasOwnProperty("given_name")) {
      this.given_name = row.given_name;
    }
    if (row.hasOwnProperty("archivesspace_id")) {
      this.archivesspace_id = row.archivesspace_id;
    }
    if (row.hasOwnProperty("directory_id")) {
      this.directory_user_id = row.directory_id;
    }
    if (row.hasOwnProperty("viaf_id")) {
      this.viaf = row.viaf_id;
    }
    if (row.hasOwnProperty("lcnaf")) {
      this.lcnaf = row.lcnaf;
    }
    if (row.hasOwnProperty("isni")) {
      this.isni = row.isni;
    }
    if (row.hasOwnProperty("wikidata")) {
      this.wikidata = row.wikidata;
    }
    if (row.hasOwnProperty("snac")) {
      this.snac = row.snac;
    }
    if (row.hasOwnProperty("orcid")) {
      this.orcid = row.orcid;
    }
    if (row.hasOwnProperty("image")) {
      this.image_url = row.image;
    }
    if (row.hasOwnProperty("educated_at")) {
      this.education = row.educated_at;
    }
    if (row.hasOwnProperty("caltech")) {
      this.caltech = matchType(this.caltech, row.caltech);
    }
    if (row.hasOwnProperty("jpl")) {
      this.jpl = matchType(this.jpl, row.jpl);
    }
    if (row.hasOwnProperty("faculty")) {
      this.faculty = matchType(this.faculty, row.faculty);
    }
    if (row.hasOwnProperty("alumn")) {
      this.alumn = matchType(this.alumn, row.alumn);
    }
    if (row.hasOwnProperty("staff")) {
      this.staff = matchType(this.staff, row.staff);
    }
    if (row.hasOwnProperty("status")) {
      this.status = matchType(this.status, row.status);
    }
    if (row.hasOwnProperty("directory_person_type")) {
      this.directory_person_type = row.directory_person_type;
    }
    if (row.hasOwnProperty("title")) {
      this.title = row.title;
    }
    if (row.hasOwnProperty("bio")) {
      this.bio = row.bio;
    }
    if (row.hasOwnProperty("division")) {
      this.division = row.division;
    }
    if (row.hasOwnProperty("updated")) {
      this.updated = row.updated;
    } else {
      this.updated = (new Date()).toJSON().substring(0, 10);
    }
    if (row.hasOwnProperty("internal_notes")) {
      this.internal_notes = row.internal_notes;
    }
    // console.log(
    //   `DEBUG name: ${this.family_name}, ${this.given_name} this.clpid ${this.clpid} this.caltech (${typeof this
    //     .caltech}): ${this.caltech}`,
    // );
    if (this.caltech) {
      this.ror = "https://ror.org/05dxps055";
    }
    /* We will start out with the feeds we current have *
    if (this.caltech && this.faculty) {
      this.include_in_feeds = true;
    }
    */
    // console.log(`DEBUG   -> this.ror (${typeof this.ror}): ${this.ror}`);
    return true;
  }

  asObject(): Object {
    return {
      clpid: this.clpid,
      thesis_id: this.thesis_id,
      authors_id: this.authors_id,
      advisors_id: this.advisors_id,
      include_in_feeds: this.include_in_feeds,
      family_name: this.family_name,
      given_name: this.given_name,
      email: this.email,
      archivesspace_id: this.archivesspace_id,
      directory_user_id: this.directory_user_id,
      directory_person_type: this.directory_person_type,
      title: this.title,
      bio: this.bio,
      division: this.division,
      status: this.status,
      viaf: this.viaf,
      lcnaf: this.lcnaf,
      isni: this.isni,
      wikidata: this.wikidata,
      snac: this.snac,
      orcid: this.orcid,
      ror: this.ror,
      image_url: this.image_url,
      education: this.education,
      caltech: this.caltech,
      jpl: this.jpl,
      faculty: this.faculty,
      staff: this.staff,
      alumn: this.alumn,
      internal_notes: this.internal_notes,
      updated: this.updated,
    };
  }

  toJSON(): string {
    return JSON.stringify(this.asObject());
  }
}

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
  options: { debug: boolean; htdocs: string; baseUrl: string },
): Promise<Response> {
  console.log("DEBUG handlePeople() baseUrl", options.baseUrl);
  if (req.method === "GET") {
    return await handleGetPeople(req, options);
  }
  if (req.method === "POST") {
    return await handlePostPeople(req, options);
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
  options: { debug: boolean; htdocs: string; baseUrl: string },
): Promise<Response> {
  console.log("DEBUG handleGetPeople() baseUrl", options.baseUrl);

  /* parse the URL */
  const url = new URL(req.url);
  const clpid = pathIdentifier(req.url);
  const params = url.searchParams;
  const baseUrl = options.baseUrl;
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
        base_url: baseUrl,
        people_list: people_list,
      });
    } else {
      return renderPage(tmpl, {
        base_url: baseUrl,
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
      base_url: baseUrl,
      isCreateObject: isCreateObject,
      people: obj,
      debug_src: JSON.stringify(obj, null, 2),
    });
  }
}

/**
 * handlePostPeople implements the bare object end point used to create
 * a new people record.
 *
 * @param {Request} req holds the request to the people handler
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handlePeople.
 * @returns {Promise<Response>}
 */
async function handlePostPeople(
  req: Request,
  options: { debug: boolean; htdocs: string },
): Promise<Response> {
  let clpid = pathIdentifier(req.url);
  const isCreateObject = clpid === "";

  if (req.body !== null) {
    const form = await req.formData();
    let obj = formDataToObject(form);
    console.log(
      `DEBUG form data after converting to object -> ${JSON.stringify(obj)}`,
    );
    if (!("clpid" in obj)) {
      console.log("clpid missing", obj);
      return new Response(`missing people identifier`, {
        status: 400,
        headers: { "content-type": "text/html" },
      });
    }
    if (isCreateObject) {
      console.log("DEBUG detected create request");
      clpid = obj.clpid as unknown as string;
    }
    if (obj.clpid !== clpid) {
      return new Response(
        `mismatched people identifier ${clpid} != ${obj.clpid}`,
        {
          status: 400,
          headers: { "content-type": "text/html" },
        },
      );
    }
    if (isCreateObject) {
      console.log(`send to dataset create object ${clpid}`);
      if (!(await ds.create(clpid, obj))) {
        return new Response(
          `<html>problem creating object ${clpid}, try again later`,
          {
            status: 500,
            headers: { "content-type": "text/html" },
          },
        );
      }
    } else {
      console.log(`send to dataset update object ${clpid}`);
      if (!(await ds.update(clpid, obj))) {
        return new Response(
          `<html>problem updating object ${clpid}, try again later`,
          {
            status: 500,
            headers: { "content-type": "text/html" },
          },
        );
      }
    }
    return new Response(`<html>Redirect to ${clpid}</html>`, {
      status: 303,
      headers: { Location: `${clpid}` },
    });
  }
  return new Response(`<html>problem creating people data</html>`, {
    status: 400,
    headers: { "content-type": "text/html" },
  });
}
