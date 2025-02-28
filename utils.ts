/**
 * utils.ts modules holds the method related to handling identifiers. E.g. validatin
 * and extraction from the URL pathname.
 */

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
  const obj: { [k: string]: string | string[] | boolean } = {};
  for (const v of form.entries()) {
    const key: string = v[0];
    console.log(`DEBUG formDataToObject processing key -> ${key} -> v -> ${v}`)
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
        obj[key] = [];
        for (const grp of val.split("\n")) {
          if (grp.trim() !== "") {
            obj[key].push(grp.trim());
          }
        }
      }
    }
  }
  /*  NOTE: Make sure we update obj.updated */
  obj["updated"] = timeStamp(new Date());
  return obj;
}
