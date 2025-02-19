/**
 * people.ts implements the people object handler for listing, creating, retrieving, updating and delete people objects.
 */
import { NAMESPACE_URL } from "@std/uuid/constants";
import { v5 } from "@std/uuid";
import * as yaml from "@std/yaml";
import { $ } from "@david/dax";
import { send_email } from "./send_mail.ts";

import {
  apiPort,
  Dataset,
  formDataToObject,
  licenseText,
  OptionsProcessor,
  releaseDate,
  releaseHash,
  renderPage,
  version,
} from "./deps.ts";
import { coldReportsHelpText, fmtHelp } from "./helptext.ts";

const ds = new Dataset(apiPort, "reports.ds");
const wait_in_seconds = 0;
const appName = "cold_reports";

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
  options: string[];
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
  options: string[] = [];
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
    this.options = "options" in o ? o.options as unknown[] as string[] : [];
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
    const rpt = new Report();
    const ok = await rpt.request_report(obj);
    if (ok) {
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

interface RunnableInterface {
  cmd: string;
  options: string[];
  basename: string;
  content_type: string;
  append_datestamp: boolean;
  final_status: string;
  link: string;
}

class Runnable implements RunnableInterface {
  cmd: string;
  options: string[];
  basename: string;
  content_type: string;
  append_datestamp: boolean;
  final_status: string;
  link: string;

  constructor(
    cmd: string,
    basename: string,
    append_datestamp: boolean,
    content_type: string,
  ) {
    this.cmd = cmd;
    this.options = [];
    this.final_status = "";
    this.link = "";
    this.basename = basename;
    this.append_datestamp = append_datestamp;
    this.content_type = content_type;
  }

  // Run executables the program implementing the report. It's calling out to the operating system to run it.
  // The report program is expected to return a link written to standard out on success. Otherwise return an
  // empty string or short error message using the protocol `error://`.
  async run(options: string[]): Promise<string> {
    //FIXME: Need to execute command line program and capture result link or error message from standard out then hand it back.
    //console.log(`Running: ${this.cmd}`);
    let txt: string;
    try {
      txt = await $`${this.cmd}`.text();
    } catch (err) {
      txt = "error://" + err;
    }

    // the URL would be returned by the runner when final desitantion is available.
    let filename: string = this.basename;
    let ext: string = ".txt";
    switch (this.content_type) {
      case "text/plain":
        ext = ".txt";
        break;
      case "text/csv":
        ext = ".csv";
        break;
      case "application/json":
        ext = ".json";
        break;
      case "text/markdown":
        ext = ".md";
        break;
      case "application/yaml":
        ext = ".yaml";
        break;
      default:
        ext = "";
        break;
    }
    console.log("INFO: file extension set to ", ext, this.content_type);
    if (this.append_datestamp) {
      let datestamp = (new Date()).toJSON().substring(0, 10);
      filename = `${this.basename}_${datestamp}${ext}`;
    } else {
      filename = `${this.basename}${ext}`;
    }
    console.log("INFO: filename should be", filename);

    // FIXME: output location for report should not be hardcoded.
    const basedir: string = "./htdocs/rpt";
    // FIXME: base URL of report should not be hardcoded
    const base_url: string = "rpt";
    const utf8Encoder = new TextEncoder();
    const data = utf8Encoder.encode(txt);
    try {
      await Deno.writeFile(`${basedir}/${filename}`, data, { create: true });
    } catch (err) {
      return "error://" + err;
    }
    return `${base_url}/${filename}`;
  }
}

interface RunnerInterface {
  report_map: { [key: string]: RunnableInterface };
}

class Runner implements RunnerInterface {
  readonly report_map: { [key: string]: Runnable } = {};

  constructor(config_yaml: string) {
    const src = Deno.readTextFileSync(config_yaml);
    const cfg = yaml.parse(src) as {
      [key: string]: { [key: string]: Runnable };
    };
    if (cfg.reports !== undefined) {
      for (const [k, v] of Object.entries(cfg.reports)) {
        if (v === undefined) {
          continue;
        }
        this.report_map[k] = new Runnable(
          v.cmd,
          v.basename,
          v.append_datestamp,
          v.content_type,
        );
      }
    }
  }
}

// process_request is responsible updating report queue, assembling and making the request, and updating the report request object
// when completed (or error condition returned).
async function process_request(
  cmd: Runnable,
  id: string,
  request: Report,
): Promise<boolean> {
  // I want a copy of the object passed in so that response doesn't .
  request.status = "processing";
  request.updated = (new Date()).toJSON();
  console.log("INFO: updated request object to processing", request);
  if (await ds.update(request.id, request)) {
    console.log("INFO: launching request", request);
  } else {
    console.log(
      `ERROR: updated of request ${request} failed, aborting request runner`,
    );
    Deno.exit(1);
  }
  const link = await cmd.run([]);
  if (link === undefined || link === "") {
    request.link = "not link returned from report";
    request.status = "error";
    request.updated = (new Date()).toJSON();
  } else if (link.indexOf("error://") > -1) {
    request.link = link; /*link.replace("error://", "");*/
    request.status = "error";
    request.updated = (new Date()).toJSON();
  } else {
    request.link = link;
    request.status = "completed";
    request.updated = (new Date()).toJSON();
  }
  if (request.emails !== undefined && request.emails !== "") {
    //FIXME: the URL should not be hard coded
    await send_email(
      request.emails,
      request.report_name,
      `report request: ${request.status} <https://apps.library.caltech.edu/cold/${request.link}> ${request.updated}`,
    );
  }
  return (await ds.update(id, request));
}

// servicing_requests checks the reports table, gets a list of pending requests, invokes process_request
async function servicing_requests(runner: Runner): Promise<void> {
  console.log("INFO: entered servicing_requests with Runner", runner);
  let requests = await ds.query("next_request", [], {}) as Report[];
  if (requests.length > 0) {
    for (let request of requests) {
      let report_name = request.report_name;
      let cmd = runner.report_map[report_name];
      if (cmd !== undefined) {
        if (!await process_request(cmd, request.id, request)) {
          console.log(
            `ERROR: processing request ${request}, ${
              JSON.stringify(request)
            } failed, aborting request runner`,
          );
          Deno.exit(1);
        }
      } else {
        request.status = "aborting, unknown report";
        request.link = "";
        request.updated = (new Date()).toJSON();
        if (!await ds.update(request.id, request)) {
          console.log(
            `ERROR: updated of request error ${request} failed, aborting request runner`,
          );
          Deno.exit(1);
        }
        console.log(`WARNING unknown report name ${request.report_name}`);
      }
    }
  }
}

// report_runner implements the report runner. It checks the reports collections for the "next" report to run, spawns the job then on to the next.
// When the queue is empty will will sleep for a time then try the process again.
async function report_runner(config_yaml: string): Promise<number> {
  try {
    await Deno.lstat(config_yaml);
  } catch (err) {
    console.log(err);
    return 1;
  }
  const runner = new Runner(config_yaml);
  if (runner === undefined) {
    return 1;
  }
  await servicing_requests(runner);
  console.log("INFO: caught up on requests");
  return 0;
}

/*
 * Main provides the main interface from the command line. One parameter is expected which
 * is the path to the YAML configuration file.
 */
async function main(): Promise<void> {
  const op: OptionsProcessor = new OptionsProcessor();

  op.booleanVar("help", false, "display help");
  op.booleanVar("license", false, "display license");
  op.booleanVar("version", false, "display version");
  op.booleanVar("debug", false, "turn on debug logging");

  op.parse(Deno.args);

  const options = op.options;
  let args = op.args;

  if (options.help) {
    console.log(
      fmtHelp(coldReportsHelpText, appName, version, releaseDate, releaseHash),
    );
    Deno.exit(0);
  }
  if (options.license) {
    console.log(licenseText);
    Deno.exit(0);
  }
  if (options.version) {
    console.log(`${appName} ${version} ${releaseHash}`);
    Deno.exit(0);
  }

  let config_yaml: string = args.length > 0
    ? args.shift() as unknown as string
    : "";
  if (config_yaml === "") {
    config_yaml = "cold_reports.yaml";
  }
  // Start up the service.
  setInterval(
    await (async function () {
      await report_runner(config_yaml);
    }),
    10000,
  );
}

// Run main()
if (import.meta.main) await main();
