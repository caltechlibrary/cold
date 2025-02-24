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
