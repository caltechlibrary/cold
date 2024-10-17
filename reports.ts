/**
 * people.ts implements the people object handler for listing, creating, retrieving, updating and delete people objects.
 */
import { NAMESPACE_URL } from "@std/uuid/constants";
import { v5 } from "@std/uuid";

import { apiPort, Dataset, formDataToObject, renderPage } from "./deps.ts";

const ds = new Dataset(apiPort, "reports.ds");

// getId: This function that returns a new UUID v5 on a payload holding the object and a timestamp.
// If two payloads are equivallent then the UUID returned will be the same. When using
// UUID in our report queue context it is import that the object differ from each other.
// This can be accomplishled by adding a timestamp to the object. In this way similar
// report requests can be distriguished from one anther.
async function genId(o: object): Promise<string> {
  const now = new Date();
  const utf8Encoder = new TextEncoder();
  const signature = utf8Encoder.encode(
    JSON.stringify({ "payload": o, "generated": now }),
  );
  return (await v5.generate(NAMESPACE_URL, signature)).toString();
}

/**
 * ReportInterface describes a report request obejct.
 */
export interface ReportInterface {
  id: string;
  report_name: string;
  options: string;
  content_type: string;
  emails: string;
  requested: string;
  updated: string;
  expire: string;
  status: string;
  link: string;
}

/**
 * Report implements a report request object
 */
export class Report implements ReportInterface {
  id: string = "";
  report_name: string = "";
  options: string = "";
  content_type: string = "";
  emails: string = "";
  requested: string = "";
  updated: string = "";
  expire: string = "";
  status: string = "";
  link: string = "";

  async request_report(o: object): Promise<boolean> {
    if (!o.hasOwnProperty("report_name")) {
      return false;
    }
    const id = await genId(o);
    this.id = id;
    const parts = "report_name" in o ? `${o.report_name}`.split(";", 2) : "";
    const report_name = parts[0].trim();
    const content_type = parts.length > 1 ? parts[1].trim() : "text/plain";

    this.report_name = report_name;
    this.content_type = content_type;
    this.options = "options" in o ? `${o.options}` : ``;
    this.emails = "emails" in o ? `${o.emails}` : ``;
    const now = new Date();
    const expire_in_days = 7;
    const expire = (new Date()).setDate(
      now.getDate() + expire_in_days,
    ) as unknown as Date;
    this.expire = expire.toString();
    this.requested = now.toISOString();
    this.updated = now.toISOString();
    this.status = "requested";
    this.link = "";
    return true;
  }

  asObject(): Object {
    return {
      id: this.id,
      report_name: this.report_name,
      options: this.options,
      emails: this.emails,
      requested: this.requested,
      updated: this.updated,
      expire: this.expire,
      status: this.status,
      content_type: this.content_type,
      link: this.link,
    };
  }

  toJSON(): string {
    return JSON.stringify(this.asObject());
  }
}

/**
 * handleReports implements a middleware that supports two path end points.
 *
 * - list or search people objects
 * - create a person object
 *
 * http methods and their role
 *
 * - `GET /` list objects, use `?q=...` for search
 * - `POST /` create an object
 *
 * @param {Request} req holds the request to the people handler
 * @param {debug: boolean, htdocs: string} options holds options passed from ColdReadWriteHandlerr.
 * @returns {Response}
 */
export async function handleReports(
  req: Request,
  options: { debug: boolean; htdocs: string },
): Promise<Response> {
  if (req.method === "GET") {
    return await handleReportsList(req, options);
  }
  if (req.method === "POST") {
    return await handleReportRequest(req, options);
  }
  const body = `<html>${req.method} not supported</html>`;
  return new Response(body, {
    status: 405,
    headers: { "content-type": "text/html" },
  });
}

/**
 * handleReportsList returns a list of report requests and their status.
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
async function handleReportsList(
  req: Request,
  options: { debug: boolean; htdocs: string },
): Promise<Response> {
  /* parse the URL */
  const url = new URL(req.url);
  const params = url.searchParams;
  let tmpl = "report_list";
  /* display a list queued report requests */
  const report_list = await ds.query("report_list", [], {});
  if (report_list !== undefined) {
    return renderPage(tmpl, {
      base_path: "",
      report_list: report_list,
    });
  } else {
    return renderPage(tmpl, {
      base_path: "",
      report_list: [],
    });
  }
}

/**
 * handleReportRequest implements report request.
 *
 * @param {Request} req holds the request to a report to be run
 * @param {debug: boolean, htdocs: string} options holds options passed from
 * handleReport.
 * @returns {Promise<Response>}
 */
async function handleReportRequest(
  req: Request,
  options: { debug: boolean; htdocs: string },
): Promise<Response> {
  if (req.body !== null) {
    // Request a report to be run
    const form = await req.formData();
    let obj = formDataToObject(form);
    console.log(
      `DEBUG form data after converting to object -> ${JSON.stringify(obj)}`,
    );
    const wait_in_seconds = 5;
    const rpt = new Report();
    const ok = await rpt.request_report(obj);
    if (ok) {
      console.log(
        `DEBUG report request object -> ${rpt.toJSON()}`,
      );
      // We want to create the record and return success. If the record
      // has already been created then we should distriguish that error from
      // other types of error.
      if ((await ds.create(rpt.id, rpt.asObject()))) {
        let msgs: string[] = [];
        msgs.push(`Report request ${rpt.report_name}`);
        if (rpt.report_name !== rpt.id) {
          msgs.push(` (${rpt.id}) received.`);
        } else {
          msgs.push(" received.");
        }
        if (rpt.emails !== "") {
          msgs.push(
            `notification(s) will be sent to ${rpt.emails} when report is available.`,
          );
        }
        msgs.push(' <a href="reports">back to reports list</a>');
        return new Response(
          `<html><head><meta charset="UTF-8" />  <meta http-equiv="Refresh" content="${wait_in_seconds}; URL=reports" /></head><body>${
            msgs.join(" ")
          }. Redirecting to reports page in ${wait_in_seconds} seconds.</body></html>`,
          {
            status: 200,
            headers: { "content-type": "text/html" },
          },
        );
      }
      // Handle the case of previously created record.
      const readObject = await ds.read(rpt.id);
      if (readObject !== undefined) {
        let msgs: string[] = [];
        msgs.push(`Report request ${rpt.report_name}`);
        if (rpt.report_name !== rpt.id) {
          msgs.push(` (${rpt.id}) previously received.`);
        } else {
          msgs.push(" previously received.");
        }
        if (rpt.emails !== "") {
          msgs.push(
            `notification(s) will be sent to ${rpt.emails} when report is available.`,
          );
        }
        msgs.push(' <a href="reports">back to reports list</a>');
        return new Response(
          `<html><head><meta charset="UTF-8" />  <meta http-equiv="Refresh" content="${wait_in_seconds}; URL=reports" /></head><body>${
            msgs.join(" ")
          }. Redirecting to reports page in ${wait_in_seconds} seconds.</body></html>`,
          {
            status: 200,
            headers: { "content-type": "text/html" },
          },
        );
      }
      return new Response(
        `<html>there was a problem generating report request for ${rpt.report_name}, ${rpt.id} -> ${rpt.toJSON()}, try again later.  <a href="reports">back to reports list</a>`,
        {
          status: 500,
          headers: { "content-type": "text/html" },
        },
      );
    }
  }
  // Method not supported.
  console.log("Bad request", req.url.toString());
  return new Response(`Bad Request`, {
    status: 400,
    headers: { "content-type": "text/html" },
  });
}
