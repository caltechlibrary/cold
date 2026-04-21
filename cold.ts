import {
  existsSync,
  handleDirectoryLookup,
  handleDOIPrefix,
  handleFunders,
  handleGroups,
  handleJournals,
  handlePeople,
  handleReports,
  handleSubjects,
  handleThesisOption,
  OptionsProcessor,
  path,
  serveDir,
} from "./deps.ts";
import { handleBrowserAPI } from "./browser_api.ts";
import { coldHelpText, fmtHelp } from "./helptext.ts";
import { licenseText, releaseDate, releaseHash, version } from "./version.ts";

const appName: string = "cold";

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
/**
 * basePathFromUrl extracts the pathname from a URL string, returning "" if the
 * URL is invalid or the path is just "/". Used to derive the base path prefix
 * that Apache passes through when COLD is mounted at a sub-path like /cold.
 */
function basePathFromUrl(baseUrl: string): string {
  try {
    const p = new URL(baseUrl).pathname.replace(/\/$/, "");
    return p === "" ? "" : p;
  } catch {
    return "";
  }
}

export function ColdReadWriteHandler(
  req: Request,
  options: { debug: boolean; htdocs: string; baseUrl: string; apiUrl: string },
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
  // Handle the various dataset collections management pages.
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
  return serveDir(req, {
    fsRoot: htdocs,
    urlRoot: basePath.replace(/^\//, ""), // strip /cold prefix when mapping to htdocs
    enableCors: false,
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

  console.log(`Starting COLD UI HTTP service at http://localhost:${options.port}

Relies on JSON API at ${options.apiUrl}

Static content directory is ${options.htdocs}

Browser base url set to ${options.baseUrl}

`);
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
