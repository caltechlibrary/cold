/**
 * utils.ts modules holds the method related to handling identifiers. E.g. validatin
 * and extraction from the URL pathname.
 */
import { parse as parseCSV } from "@std/csv/parse";
import { ERROR_COLOR } from "./colors.ts";
import { apiPort, Dataset } from "./deps.ts";
import { People } from "./people.ts";
import { stringify as stringifyCSV } from "@std/csv";

const dsPeople = new Dataset(apiPort, "people.ds");
const dsGroups = new Dataset(apiPort, "groups.ds");

/**
 * pathIdentifier extracts the identifier from the last element of the URL pathname.
 * The application is expecting a multipart path and if the first "/" and "/" slash
 * it is presumed the identifier is not available.
 *
 * @param {string} uri holds the unparsed URL you want to pull the identifier from.
 * @returns {string} idenitifier as a string, empty string means it could not find the identifier.
 *
 * @example
 * ```
 *    const uri = new URL('https://localhost:8111/groups/LIGO');
 *    const clgid = pathIdentifier(uri);
 *    console.log("group identifier is", clgid);
 * ```
 */
export function pathIdentifier(u: string): string {
  const pathname: string = new URL(u).pathname;
  const cut_pos = pathname.lastIndexOf("/");
  if (cut_pos != pathname.indexOf("/")) {
    return decodeURI(pathname.slice(cut_pos + 1));
  }
  return "";
}

/**
 * apiPathParse extracts the elements in the API path and returns them as an object.
 *
 * @param {string} uri holds the unparsed URL you want to pull the identifier from.
 * @returns {[key:string]: any} an object representing the API request.
 *
 * @example
 * ```
 *    const uri = new URL('https://localhost:8111/api/groups?q=LIGO');
 *    const obj = apiPathParse(uri);
 *    console.log("Collection ", obj.c_name, " query is ", obj.q);
 * ```
 */
export function apiPathParse(uri: string): { [key: string]: string } {
  let resp: { [key: string]: string } = {};
  const u = new URL(uri);
  let parts: string[] = u.pathname.replace(/^\/api/, "").split("/");
  // Trim the leading slash element
  if (parts.length > 0 && parts[0] === "") {
    parts.shift();
  }

  let c_name: string | undefined = parts.shift();
  let query_name: string | undefined = parts.shift();
  // handle decodeing the element in the path.
  (c_name === undefined) ? "" : resp.c_name = decodeURIComponent(c_name);
  (query_name === undefined)
    ? ""
    : resp.query_name = decodeURIComponent(query_name);

  // Handle none coliding query string parameters.
  let params = new URLSearchParams(u.search);
  for (const key of params.keys()) {
    if (["c_name", "query_name"].indexOf(key) === -1) {
      const val = params.get(key);
      if (val !== null) {
        resp[key] = val;
      }
    }
  }
  return resp;
}

/**
 * timeStamp takes a Date object and returns a simople timestamp as a string.
 * @param dt: Date
 * @returns string
 */
export function timeStamp(dt: Date): string {
  return dt.toISOString().replace("T", " ").substring(0, 19);
}

/**
 * formDataToObject turn the form data into a simple object.
 *
 * @param {FormData} form data the form object to process
 * @returns {Object}
 */
export function formDataToObject(form: FormData): object {
  const obj: {
    [k: string]: string | { group_name: string; clgid: string }[] | boolean;
  } = {};
  for (const v of form.entries()) {
    const key: string = v[0];
    console.log(`DEBUG formDataToObject processing key -> ${key} -> v -> ${v}`);
    if (key !== "submit") {
      const val: any = v[1];
      if (val === "true" || val === "on") {
        obj[key] = true;
      } else if (val === "false" || val === "off") {
        obj[key] = false;
      } else {
        obj[key] = val;
      }
      if (key === "groups") {
        obj.groups = [];
        let rows = parseCSV(val);
        let group_name: string = "";
        let clgid: string = "";
        for (const row of rows) {
          (row[0] === undefined) ? group_name = "" : group_name = row[0].trim();
          (row[1] === undefined) ? clgid = "" : clgid = row[1].trim();
          if (group_name !== "" || clgid !== "") {
            obj.groups.push({ "group_name": group_name, "clgid": clgid });
          }
        }
        /*
        for (const grp of val.split("\n")) {
          if (grp.trim() !== "") {
            obj[key].push(grp.trim());
          }
        }
        */
      }
    }
  }
  /*  NOTE: Make sure we update obj.updated */
  obj["updated"] = timeStamp(new Date());
  return obj;
}

async function lookupGroupInfo(name: string): Promise<
  { clgid: string; name: string; ok: boolean; msg: string }
> {
  let obj: { [key: string]: any } | undefined = await dsGroups.query(
    "lookup_name",
    ["name", "alternatives"],
    { "name": name, "alternatives": name },
  );
  if (obj === undefined) {
    return {
      "ok": false,
      "msg": `failed to find group name ${name}`,
      name: "",
      clgid: "",
    };
  }
  let clgid: string = "";
  let group_name: string = "";
  (obj.clgid === undefined) ? clgid = "" : clgid = obj.clgid;
  (obj.group_name === undefined)
    ? group_name = name
    : group_name = obj.group_name;
  return { ok: true, msg: "", clgid: clgid, name: group_name };
}

/**
 * updatePeopleWithGroupInfo(clpid, orcid, familyName, givenName, division, groups);
 */
async function updatePeopleWithGroupInfo(
  clpid: string,
  division: string,
  orcid: string,
  groups: { group_name: string; clgid: string }[],
): Promise<string> {
  let obj: { [key: string]: any } | undefined = {};
  try {
    obj = await dsPeople.read(clpid);
  } catch (err) {
    return `${err}`;
  }
  if (obj === undefined) {
    return `failed to find ${clpid} in people.ds`;
  }
  let person = new People();
  person.fromObject(obj);
  person.division = division;
  person.orcid = orcid;
  person.groups = [];
  for (let row of groups) {
    if (row.group_name !== undefined && row.group_name !== "") {
      const groupInfo = await lookupGroupInfo(row.group_name);
      if (groupInfo.ok) {
        row.group_name = groupInfo.name;
        row.clgid = groupInfo.clgid;
      }
      person.groups.push(row);
    }
  }
  console.log(`DEBUG person.orcid -> ${person.orcid}`);
  if (await dsPeople.update(clpid, person.asObject()) === false) {
    return `failed to update ${clpid} in people.ds`;
  }
  return "";
}

/**
 * loadDivisionPeopleCSV will read a CSV file with the following columns.
 *   "division","clpid","orcid","family_name","given_name","other group","other group", ...
 * The columns must be in this specific order since we don't know how many groups a person
 * maybe afficiliated with.
 *
 * @param filename: string, this is the name of the CSV file to read
 * @return string, the returned string is empty if no errors encountered otherwise an
 * error message is returned.
 */
export async function loadDivisionPeopleCSV(filename: string): Promise<string> {
  let src: string = "";
  try {
    src = await Deno.readTextFile(filename);
  } catch (err) {
    return `${err}`;
  }
  const data = parseCSV(src);
  let division: string = "";
  let clpid: string = "";
  let orcid: string = "";
  let familyName: string = "";
  let givenName: string = "";
  let groups: { group_name: string; clgid: string }[] = [];
  let i = 0;
  for (let row of data) {
    console.log(`DEBUG row[${i}] -> ${row}`);
    i++;
    (row.length === 0) ? division = "" : division = row.shift() || "";
    (row.length === 0) ? clpid = "" : clpid = row.shift() || "";
    if (clpid === "") {
      console.log(`%crow ${i} has no clpid, skipping`, ERROR_COLOR);
      continue;
    }
    (row.length === 0) ? orcid = "" : orcid = row.shift() || "";
    (row.length === 0) ? familyName = "" : familyName = row.shift() || "";
    (row.length === 0) ? givenName = "" : givenName = row.shift() || "";
    groups = [];
    if (division !== "") {
      groups.push({ group_name: division, clgid: "" });
    }
    for (const column of row) {
      if (column.trim() !== "") {
        const groupInfo = await lookupGroupInfo(column.trim());
        if (groupInfo.ok) {
          groups.push({ group_name: groupInfo.name, clgid: groupInfo.clgid });
        } else {
          groups.push({ group_name: column.trim(), clgid: "" });
        }
      }
    }
    const errMsg = await updatePeopleWithGroupInfo(
      clpid,
      division,
      orcid,
      groups,
    );
    if (errMsg !== "") {
      return errMsg;
    }
  }
  return "";
}

/**
 * dumpDivisionPeopleCSV will write a CSV file with the following columns.
 *   "division","clpid","orcid","family_name","given_name","other group","other group", ...
 *
 * @param filename: string, this is the name of the CSV file to read
 * @return string, the returned string is empty if no errors encountered otherwise an
 * error message is returned.
 */
export async function dumpDivisionPeopleCSV(filename: string): Promise<string> {
  let keys: string[] = await dsPeople.keys();
  let division: string = "";
  let clpid: string = "";
  let orcid: string = "";
  let groups: { group_name: string; clgid: string }[] = [];
  let family_name: string = "";
  let given_name: string = "";
  let rows: string[][] = [];
  let row: string[] = [];
  let heading: string[] = [
    "division",
    "clpid",
    "orcid",
    "family_name",
    "given_name",
  ];
  let headingCount: number = heading.length;
  for (const key of keys) {
    const obj = await dsPeople.read(key);
    if (obj === undefined) {
      console.error(`failed to read ${key} from people.ds, skipping`);
      continue;
    }
    const rec = new People();
    rec.fromObject(obj);
    clpid = key;
    (rec.division === undefined) ? division = "" : division = rec.division;
    (rec.orcid === undefined || rec.orcid === "---")
      ? orcid = ""
      : orcid = rec.orcid;
    (rec.family_name === undefined)
      ? family_name = ""
      : family_name = rec.family_name;
    (rec.given_name === undefined)
      ? given_name = ""
      : given_name = rec.given_name;
    (rec.groups === undefined) ? groups = [] : groups = rec.groups;
    if (division !== "" || groups.length > 0) {
      row = [division, clpid, orcid, family_name, given_name];
      for (const grp of groups) {
        row.push(grp.group_name);
        if (headingCount < row.length) {
          headingCount = row.length;
          heading.push("other_group");
        }
      }
      rows.push(row);
    }
  }
  // Add the heading row.
  rows.unshift(heading);
  try {
    await Deno.writeTextFile(filename, stringifyCSV(rows));
  } catch (err) {
    return `${err}`;
  }
  return "";
}
