import {
  basePathFromUrl,
  existsSync,
  handleDirectoryLookup,
  handleDOIPrefix,
  handleFunders,
  handleGroups,
  handleJournals,
  handlePeople,
  handleRenamePeople,
  handleReports,
  handleSubjects,
  handleThesisOption,
  OptionsProcessor,
  path,
  serveDir,
} from "./deps.ts";
import { handleBrowserAPI } from "./browser_api.ts";
import { handleRDM, isRdmPath } from "./rdm.ts";
import { coldHelpText, fmtHelp } from "./helptext.ts";
import { licenseText, releaseDate, releaseHash, version } from "./version.ts";

const appName: string = "cold";

/** ColdOptions are the program options the router and its handlers share. */
export interface ColdOptions {
  debug: boolean;
  htdocs: string;
  baseUrl: string;
  apiUrl: string;
}

/**
 * ColdReadWriteHandler is a function for handling and dispatching http requests.
 *
 * @param {Request} req holds the http request recieved from the http server
 * @param {debug: boolean, htdocs: string, apiUrl: string} options holds program options that are made available
 * to additional COLD UI handlers.
 * @returns {Response}
 *
 * @example
 * ```
 *   const options = {
 *      debug: true,
 *      htdocs: "./htdocs"
 *      baseUrl: "https://localhost:8000/cold"
 *   };
 *
 *   const server = Deno.serve({
 *     hostname: "localhost",
 *     port: options.port,
 *   }, (req: Request) => {
 *   	return ColdReadWriteHandler(req, options);
 *   });
 * ```
 */
function routeRequest(
  req: Request,
  options: ColdOptions,
): Response | Promise<Response> {
  const fullPathname = new URL(req.url).pathname;
  const basePath = basePathFromUrl(options.baseUrl);
  // Strip the deployment base path so internal routing always sees paths like /people, /api, etc.
  const pathname = basePath && fullPathname.startsWith(basePath)
    ? fullPathname.slice(basePath.length) || "/"
    : fullPathname;
  const htdocs: string = path.normalize(options.htdocs);

  if (options.debug) console.log("debugging request", req);
  if (options.debug) console.log("debugging options", options);
  // Dynamic RDM-specific routes: /rdm and /rdm/... only (a boundary match, so
  // /rdm_people_sync.html and /rdmx stay static). See rdm.ts.
  if (isRdmPath(pathname)) {
    return handleRDM(req, pathname);
  }
  // Handle the various dataset collections management pages.
  if (pathname.startsWith("/rename/people")) {
    return handleRenamePeople(req, options);
  }
  if (pathname.startsWith("/people")) {
    return handlePeople(req, options);
  }
  if (pathname.startsWith("/groups")) {
    return handleGroups(req, options);
  }
  if (pathname.startsWith("/funders")) {
    return handleFunders(req, options);
  }
  if (pathname.startsWith("/subjects")) {
    return handleSubjects(req, options);
  }
  // FIXME: This is the journals vocabulary, really need to rename this at some point.
  if (pathname.startsWith("/journals")) {
    return handleJournals(req, options);
  }
  if (pathname.startsWith("/thesis_options")) {
    return handleThesisOption(req, options);
  }
  if (pathname.startsWith("/doi_prefix")) {
    return handleDOIPrefix(req, options);
  }
  if (pathname.startsWith("/reports")) {
    return handleReports(req, options);
  }
  if (pathname.startsWith("/directory_api")) {
    return handleDirectoryLookup(req, options);
  }
  if (pathname.startsWith("/api")) {
    return handleBrowserAPI(req, options);
  }
  if (options.debug) {
    console.log(
      "debugging: Handle the request for a static files or assets -> " +
        pathname,
    );
  }
  // NOTE: If there isn't a specific handler implemented then assume you're
  // requesting a static asset.
  return revalidated(serveDir(req, {
    fsRoot: htdocs,
    urlRoot: basePath.replace(/^\//, ""), // strip /cold prefix when mapping to htdocs
    enableCors: false,
  }));
}

/**
 * ColdReadWriteHandler answers one http request: it routes it (see routeRequest) and then
 * makes sure the response is never left cacheable by accident. Librarians curate data
 * through these pages, and a browser showing yesterday's list or a form built from
 * yesterday's record is worse than a slow page.
 *
 * @param {Request} req the request from the http server
 * @param {ColdOptions} options the program options
 * @returns {Promise<Response>} the response, always with a Cache-Control policy
 * @example
 * Deno.serve((req) => ColdReadWriteHandler(req, options));
 */
export function ColdReadWriteHandler(
  req: Request,
  options: ColdOptions,
): Promise<Response> {
  return noStoreUnlessSet(routeRequest(req, options));
}

/**
 * noStoreUnlessSet gives a response `Cache-Control: no-store` unless a handler already
 * chose a policy, which is then kept (static files use `no-cache`, so a browser
 * revalidates against the ETag, and the JSON routes use `no-store`).
 *
 * @param {Response | Promise<Response>} res the response a handler produced
 * @returns {Promise<Response>} the same response with a policy
 * @example
 * return noStoreUnlessSet(handlePeople(req, options));
 */
export async function noStoreUnlessSet(
  res: Response | Promise<Response>,
): Promise<Response> {
  const r = await res;
  if (r.headers.has("cache-control")) return r;
  const headers = new Headers(r.headers);
  headers.set("cache-control", "no-store");
  return new Response(r.body, {
    status: r.status,
    statusText: r.statusText,
    headers,
  });
}

/**
 * revalidated adds `Cache-Control: no-cache` to a static file response, so a browser asks
 * the server each time whether its copy is still good (the ETag makes that a 304 when it is).
 * Without it a browser keeps an imported JavaScript module without asking, and a person
 * goes on running the old page after a rebuild.
 *
 * @param {Promise<Response>} res the static file response from serveDir
 * @returns {Promise<Response>} the same response with the header set
 * @example
 * return revalidated(serveDir(req, options));
 */
async function revalidated(res: Promise<Response>): Promise<Response> {
  const r = await res;
  const headers = new Headers(r.headers);
  headers.set("cache-control", "no-cache");
  return new Response(r.body, {
    status: r.status,
    statusText: r.statusText,
    headers,
  });
}

//
// Main function
//
function main() {
  const op: OptionsProcessor = new OptionsProcessor();
  const defaultPort: number = 8111;
  const defaultHtdocs: string = "./htdocs";
  const defaultbaseUrl: string = "://";
  const defaultApiUrl: string = "http://localhost:8112";

  op.booleanVar("help", false, "display help");
  op.booleanVar("license", false, "display license");
  op.booleanVar("version", false, "display version");
  op.booleanVar("debug", false, "turn on debug logging");
  op.numberVar(
    "port",
    defaultPort,
    `set the port number, default ${defaultPort}`,
  );
  op.stringVar(
    "htdocs",
    defaultHtdocs,
    `set the static content directory, default ${defaultHtdocs}`,
  );
  op.stringVar(
    "baseUrl",
    defaultbaseUrl,
    `set the browser's base path reference, default ${defaultbaseUrl}`,
  );
  op.stringVar(
    "apiUrl",
    defaultApiUrl,
    `set the url to the datasetd API provided for cold`,
  );

  op.parse(Deno.args);

  const options = op.options;
  const args = op.args;

  if (options.help) {
    console.log(
      fmtHelp(coldHelpText, appName, version, releaseDate, releaseHash),
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

  // Make sure we have a valid static content directory set.
  if (!existsSync(options.htdocs)) {
    console.log(`Cannot find htdocs ${options.htdocs}, aborting`);
    Deno.exit(1);
  }

  console.log(
    `Starting COLD UI HTTP service at http://localhost:${options.port}

Relies on JSON API at ${options.apiUrl}

Static content directory is ${options.htdocs}

Browser base url set to ${options.baseUrl}

`,
  );
  const server = Deno.serve(
    {
      hostname: "localhost",
      port: options.port,
    },
    (req: Request): Response | Promise<Response> => {
      return ColdReadWriteHandler(req, {
        debug: options.debug,
        htdocs: options.htdocs,
        baseUrl: options.baseUrl,
        apiUrl: options.apiUrl,
      });
    },
  );
}

// Run main()
if (import.meta.main) main();
