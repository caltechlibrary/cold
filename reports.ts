/**
 * people.ts implements the people object handler for listing, creating, retrieving, updating and delete people objects.
 */
import { NAMESPACE_URL } from "@std/uuid/constants";
import { v5 } from "@std/uuid";

import {
  apiPort,
  Dataset,
  formDataToObject,
  renderPage,
} from "./deps.ts";

const ds = new Dataset(apiPort, "people.ds");

/**
 * ReportInterface describes a report request obejct.
 */
export interface ReportInterface {
  id: string;
  report_name: string;
  options: string;
  email: string;
  requested: string;
  updated: string = "";
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
  email: string = "";
  requested: string = "";
  updated: string = "";
  status: string = "";
  link: string = "";


  request_report(o : Object): boolean {
    if (o['report_name'] === undefined || o['report_name'] === '') {
      return false;
    }
    this.id = (await v5.generate(NAMESPACE_URL, JSON.stringify(obj))).toString();
    this.report_name = o['report_name'];
    if (o['options'] !== undefined) {
      this.options = o['options'];
    }
    if (o['email'] !== undefined) {
      this.email = o['email'];
    }
    let now = Date();
    this.requested = now.toString();
    this.updated = now.toString();
    this.status = 'requested';
    this.link = '';
    return true;
  }

  asObject(): Object {
    return {
      id: this.id,
      report_name: this.report_name,
      options: this.options,
      email: this.email,
      request_date: this.request_date,
      status: this.status,
      link: this.link
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
  let view = params.get("list");
  let tmpl = "report_list";
  /* display a list queued report requests */
  const report_list = await ds.query("report_queue", [], {});
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
    let rpt = new Report();
    if (rpt.request_report(obj)) {
      if ((await ds.update( rpt.id, rpt.toObject()))) {
        return new Response(`<html>Report ${rpt.report_name} being processed, ${rpt.id}, an email will be sent to ${rpt.email} when the report is available.</html>`, {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }); 
      }
      return new Response(
        `<html>there was a problem generating report ${rpt.report_name}, ${rpt.id}, try again later`,
        {
          status: 500,
          headers: { "content-type": "text/html" },
        },
      );
  }
  // Method not supported.
  console.log("Bad request", req.url.toString());
  return new Response(`Bad Request`, {
    status: 400,
    headers: { "content-type": "text/html" },
  });
}
