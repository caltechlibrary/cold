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
  // id is the identifier for the report object in the queue
  id: string;
  // report_name is the report name defined in the cold_reports.yaml file
  report_name: string;
  // options holds program options (not form data).
  options: string[];
  // inputs holds any parameter definitions for a parameterized report and may temporarily hold value of the inputs
  inputs: InputsInterface[];
  // emails holds a comma delimited string of email addresses to notify when report is completed
  emails: string;
  // requested holds the timestamp of when the request was made
  requested: string;
  // updated holds the timestamp of when the request was updated
  updated: string;
  // expire should hold the timestamp of when the report can be purged automatically
  // in practice I'm just purging the reports every night.
  expire: string;
  // status holds the current processing state of the report (requested, processing, aborted, completed)
  status: string;
  // link is the URL to where the report can be found in the COLD web UI
  link: string;
}

/**
 * Report implements a report request object
 */
export class Report implements ReportInterface {
  id: string = "";
  report_name: string = "";
  options: string[] = [];
  inputs: InputsInterface[] = [];
  emails: string = "";
  requested: string = "";
  updated: string = "";
  expire: string = "";
  status: string = "";
  link: string = "";
  private config_yaml: string = "cold_reports.yaml";

  constructor(config_yaml?: string) {
    if (config_yaml !== undefined) {
      this.config_yaml = config_yaml;
    }
  }

  async get_report_inputs(report_name: string): Promise<boolean> {
    // FIXME: open this.config_yaml and find the report
    const src = Deno.readTextFileSync(this.config_yaml);
    if (src === undefined || src === "") {
      //FIXME: log the error that we can't read config_yaml
      return false;
    }
    const cfg = yaml.parse(src) as {
      [key: string]: { [key: string]: Runnable };
    };
    // Now find and return our report interface object.
    if (cfg.reports !== undefined) {
      for (const [k, v] of Object.entries(cfg.reports)) {
        if (k === report_name) {
          // FIXME: Before assignment I should validate against type.
          this.inputs = v.inputs;
          return true;
        }
      }
    }
    return false;
  }

  // merge_inputs takes an object holding key/value pairs (like from our form) and updates the value
  // of the input is it matches the form's pair.
  merge_inputs(formObject: Record<string, string>): void {
    this.inputs = this.inputs.map((obj) => {
      for (let k in formObject) {
        if (k === obj.id) {
          obj.value = "";
          obj.value = formObject[k];
          break;
        }
      }
      return obj;
    });
  }

  // request_report operates a little bit like a constructure. It updates the report object
  // to reflect the report being requested. The parameter "o" forms normalized form elements.
  // These are vetted. If the values match expected inputs then they will be merged into
  // the Report object instance.
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
    // Now that we know the report name, the inputs definitions need to be retrieved
    // then updated to hold the values too.
    if (await this.get_report_inputs(this.report_name)) {
      if (this.inputs !== undefined) {
        console.log(`DEBUG o (${typeof o}) -> ${JSON.stringify(o)}`);
        this.merge_inputs(o as Record<string, string>);
      }
    } else {
      this.inputs = [];
    }
    console.log(
      `FIXME: are the inputs defined? ${JSON.stringify(this.inputs)}`,
    );
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
      inputs: this.inputs,
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
    // NOTE: obj holds some normalized but unvalidated form content
    let obj = formDataToObject(form);
    const rpt = new Report("cold_reports.yaml");
    // NOTE: request_report is mapping the obj need to validate that it is a report request,
    // and the form contents so any additional inputs can be mapped to the report inputs.
    console.log(`DEBUG form input -> ${JSON.stringify(obj)}`);
    const ok = await rpt.request_report(obj);
    console.log(`DEBUG: Requesting ${rpt.report_name} <- ${ok}`);
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

interface InputsInterface {
  id: string;
  type: string;
  value: string;
  required: boolean;
}

class Inputs implements InputsInterface {
  id: string = "";
  type: string = "text";
  value: string = "";
  required: boolean = false;
}

interface RunnableInterface {
  report_name: string;
  cmd: string;
  options: string[];
  basename: string;
  append_datestamp: boolean;
  content_type: string;
  final_status: string;
  link: string;
  // List of inputs holds an ordered list of Input id, type, required and value
  inputs: Inputs[];
}

class Runnable implements RunnableInterface {
  report_name: string;
  cmd: string;
  options: string[];
  basename: string;
  append_datestamp: boolean;
  content_type: string;
  final_status: string;
  link: string;
  // List of inputs holds a list of Input id, type, required and value
  inputs: Inputs[];

  constructor(
    report_name: string,
    cmd: string,
    basename: string,
    inputs: Inputs[],
    append_datestamp: boolean,
    content_type: string,
  ) {
    this.report_name = report_name;
    this.cmd = cmd;
    this.basename = basename;
    this.inputs = inputs;
    this.append_datestamp = append_datestamp;
    this.content_type = content_type;
    this.options = [];
    this.final_status = "";
    this.link = "";
  }

  filenameTemplate(template: string, inputs: Inputs[]): string {
    // Replace each placeholder in the template with the corresponding input value
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      console.log(
        `DEBUG replacing ${key} with an input.value if found, otherwise key name wrapped in _`,
      );
      const input = inputs.find((input) => input.id === key);
      return input ? input.value : `_${key}_`;
    });
  }

  // Run executables the program implementing the report. It's calling out to the operating system to run it.
  // The report program is expected to return a link written to standard out on success. Otherwise return an
  // empty string or short error message using the protocol `error://`.
  async run(options: string[]): Promise<string> {
    //FIXME: Need to execute command line program and capture result link or error message from standard out then hand it back.
    console.log(`Running: ${this.cmd}, inputs ${JSON.stringify(this.inputs)}`);
    /*
    let txt: string;
    try {
      // FIXME: if inputs are defined then they need to be validated before forming the command sequence to execute
      txt = await $`${this.cmd}`.text();
    } catch (err) {
      txt = "error://" + err;
    }
    */
    let txt: string;
    try {
      // Validate inputs if they exist
      if (this.inputs && this.inputs.length > 0) {
        // Example: Ensure inputs are strings and escape them if needed
        const validatedInputs: string[] = this.inputs.map((input) => {
          if (typeof input.value !== "string") {
            throw new Error(
              `All command line parameters must be strings for ${this.report_name} -> ${
                JSON.stringify(input)
              } <-- ${JSON.stringify(this.inputs)}`,
            );
          }
          return input.value;
        });
        console.log(`DEBUG validatedInputs -> ${validatedInputs}`);

        // Construct the command with parameters
        // Use Deno's Command API for safer parameter handling
        const cmd = new Deno.Command(this.cmd, {
          args: validatedInputs,
        });
        const { stdout, stderr } = await cmd.output();

        if (stderr.length > 0) {
          throw new Error(new TextDecoder().decode(stderr));
        }

        txt = new TextDecoder().decode(stdout);
      } else {
        // Fallback: execute without parameters
        txt = await $`${this.cmd}`.text();
      }
    } catch (err: unknown) {
      txt = "error://" + String(err);
    }

    // the URL would be returned by the runner when final desitantion is available.
    let filename: string = this.basename;
    // FIXME: If `{{` and `}}` are in filename we need to resolve these against the required templated elements
    if (this.inputs.length > 0 && filename.indexOf("{{") > -1) {
      // We have a templated filename that needs to be updated.
      // Build a map between the inputs name and the options passed in report request.
      //console.log(`FIXME: need to render the template here`);
      //return "error://basename templates not implemented yet";
      filename = this.filenameTemplate(this.basename, this.inputs);
      //console.log(`DEBUG filename set to" "${filename}" after filenameTemplate( "${this.basename}", "${JSON.stringify(this.inputs)}" )`;
    }
    // FIXME: See if I need at add a prefix
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
      case "application/vnd.ms-excel":
        ext = ".xlsx";
        break;
      default:
        ext = "";
        break;
    }
    console.log("INFO: file extension set to ", ext, this.content_type);
    if (this.append_datestamp) {
      let datestamp = (new Date()).toJSON().substring(0, 10);
      filename = `${filename}_${datestamp}${ext}`;
    } else {
      filename = `${filename}${ext}`;
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
          k,
          v.cmd,
          v.basename,
          v.inputs,
          v.append_datestamp,
          v.content_type,
        );
      }
    }
  }
}

function resolveCommandInputs(
  cmdInputs: Inputs[],
  reqInputs: Inputs[],
): Inputs[] {
  let inputs: Inputs[] = [];
  let empty: Inputs = new Inputs();
  for (let i = 0; i < cmdInputs.length; i++) {
    // Make sure these match then add it to the inputs array, if not add an empty input element
    if (
      (cmdInputs[i].id === reqInputs[i].id) &&
      (cmdInputs[i].type === reqInputs[i].type)
    ) {
      inputs.push(reqInputs[i]);
    } else {
      // Push an empty
      empty.id = cmdInputs[i].id;
      empty.type = cmdInputs[i].type;
      empty.value = "";
      inputs.push(empty);
    }
  }
  return inputs;
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
  if (request.inputs !== undefined) {
    cmd.inputs = resolveCommandInputs(cmd.inputs, request.inputs);
    console.log(
      `DEBUG resolved command inputs -> ${JSON.stringify(cmd.inputs)}`,
    );
  }
  console.log(
    `INFO: updated request object to processing ${request.report_name}`,
  );
  if (await ds.update(request.id, request)) {
    console.log(`INFO: launching request ${request.report_name} ${request.id}`);
  } else {
    console.log(
      `ERROR: updated of request ${request} failed, aborting request runner`,
    );
    Deno.exit(1);
  }
  console.log(`INFO: running command ${cmd.cmd} ${cmd.options}`);
  //FIXME: Need to evaluate if inputs are defined then valiate inputs before processing the requested report
  const link = await cmd.run([]);
  if (link === undefined || link === "") {
    request.link = "no link returned from report";
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
  //console.log("INFO: entered servicing_requests");
  let requests = await ds.query("next_request", [], {}) as Report[];
  if (requests.length > 0) {
    for (let request of requests) {
      console.log(
        `DEBUG report request to process -> ${JSON.stringify(request)}`,
      );
      let report_name = request.report_name;
      let runnable = runner.report_map[report_name];
      if (runnable !== undefined) {
        (report_name !== undefined && report_name !== "")
          ? console.log(
            `INFO: Processing requests for ${report_name} ${
              JSON.stringify(request)
            }`,
          )
          : "";
        if (!await process_request(runnable, request.id, request)) {
          console.log(
            `ERROR: processing request ${request}, ${
              JSON.stringify(request)
            } failed, aborting request runner`,
          );
          Deno.exit(1);
        } else {
          (report_name !== undefined && report_name !== "")
            ? console.log(`INFO: Process completed for ${report_name}`)
            : "";
        }
      } else {
        request.status = "aborting, unknown report";
        request.link = "";
        request.updated = (new Date()).toJSON();
        console.log(`DEBUG aborting request ${JSON.stringify(request)}`);
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
  //console.log("INFO: caught up on requests");
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
