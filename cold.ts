import {
  appInfo,
  dotenv,
  existsSync,
  fmtHelp,
  handlePeople,
  handleGroups,
  handleFunders,
  http,
  OptionsProcessor,
  path,
  serveDir,
  yaml,
  Dataset,
} from "./deps.ts";

export let apiPort: number;
let people_ds: Dataset;
let groups_ds: Dataset;
let funders_ds: Dataset;

/**
 * helpText assembles the help information for COLD UI.
 *
 * @param {[k: string]: string} helpOpt holds the help options defined for the app.
 */
function helpText(helpOpt: { [k: string]: string }): string {
  const txt: string[] = [
    `%{app_name}(1) user manual | {version} {release_date}
% R. S.Doiel
% {release_date} {release_hash}

# NAME

{app_name}

# SYNOPSIS

{app_name} [OPTIONS]

# DESCRIPTION

{app_name} provides the public human user interface for cold. It uses
a set of dataset collections for persistence and relies on datasetd
for JSON API to each collection. **{app_name}** is a read only service.

# OPTIONS

`,
  ];
  for (let attr in helpOpt) {
    const msg = helpOpt[attr];
    txt.push(`${attr}
: ${msg}
`);
  }
  txt.push(`
# EXAMPLE

{app_name} is setup to run at <http://localhost:8110>. The static content hosted in
the "htdocs" directory.  The datasetd service is setup to run at
<http://localhost:8112> supporting the people, groups and funders dataset
collections.

~~~shell
deno task start
~~~

`);
  return txt.join("\n");
}

function errorHandler(code: number, msg: string, content_type: string): Response {
	if (content_type === "") {
		content_type = "text/plain";
	}
	return new Response(msg, {
		status: code,
		headers: {
			'content-type': content_type,
		}
	});
}

/**
 * readOnlyApiProxy proxies to the read/write JSON API provided by cold_admin but restricts
 * access to HTTP GET and read only paths.
 */
export function readOnlyApiProxy(
  req: Request,
  options: { debug: boolean, apiUrl: string },
): Response | Promise<Response> {
	// FIXME: Need to implement proxy code here.
  	const pathname = new URL(req.url).pathname;
	// FIXME: Check if we have a support content type, i.e. application/json
	// Handle our read only API request or reject as unuauthorized.
	if (req.method === "GET") {
	   if (pathname === '/api/version') {
		   //FIXME: Get version of datasetd API and return
		   return errorHandler(501, `${pathname} not implemented`, "text/plain");
	   }
	   if (pathname === "/api/people") {
		   // proxy to people.ds 
		   return errorHandler(501, `${pathname} not implemented`, "text/plain");
	   }
	   if (pathname.startsWith('/api/people/')) {
		   // Trim the prefix path and get the clpid to return
		   // proxy to people.ds 
		   return errorHandler(501, `${pathname} not implemented`, "text/plain");
	   }
	   if (pathname === '/api/groups') {
		   // proxy to groups.ds
		   return errorHandler(501, `${pathname} not implemented`, "text/plain");
	   }
	   if (pathname.startsWith('/api/groups/')) {
		   // Trim the prefix path and get the clgid to return
		   // proxy to groups.ds
		   return errorHandler(501, `${pathname} not implemented`, "text/plain");
	   }
	   if (pathname === '/api/funders') {
		   // proxy to funders.ds
		   return errorHandler(501, `${pathname} not implemented`, "text/plain");
	   }
	   if (pathname.startsWith('/api/funders/')) {
		   // Trim the prefix path and get the clfid to return
		   // proxy to funders.ds
		   return errorHandler(501, `${pathname} not implemented`, "text/plain");
	   }
	}
	
	// Handle the fail if requesst falls through
	return errorHandler(401, "Unauthorized", "text/plain");
}

/**
 * ColdReadOnlyHandler is a function for handling and dispatching http requests.
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
 *   };
 *
 *   const server = Deno.serve({
 *     hostname: "localhost",
 *     port: options.port,
 *   }, (req: Request) => {
 *   	return ColdReadOnlyHandler(req, options);
 *   });
 * ```
 */
export function ColdReadOnlyHandler(
  req: Request,
  options: { debug: boolean; htdocs: string; apiUrl: string },
): Response | Promise<Response> {
  const pathname = new URL(req.url).pathname;
  const basePath: string = path.normalize(options.htdocs);

  if (options.debug) console.log("DEBUG request", req);

  // Handle API end points
  if (pathname.startsWith("/api") && req.method == "GET") {
	  return readOnlyApiProxy(req, options)
  }

  // Handle the various dataset collections management pages.
  if (pathname.startsWith("/people") && req.method == "GET") {
    return handlePeople(req, options);
  }
  if (pathname.startsWith("/groups") && req.method == "GET") {
    return handleGroups(req, options);
  }
  if (pathname.startsWith("/funders") && req.method == "GET") {
    return handleFunders(req, options);
  }
  if (options.debug) {
    console.log(
      "DEBUG: Handle the request for a static files or assets -> " + pathname,
    );
  }
  // NOTE: If there isn't a specific handler implemented then assume you're
  // requesting a static asset.
  return serveDir(req, {
    fsRoot: basePath,
  });
}


//
// Main function
//
function main() {
  const op: OptionsProcessor = new OptionsProcessor();
  const defaultPort: number = 8110;
  const defaultHtdocs: string = "./htdocs";
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
    "apiUrl",
    defaultApiUrl,
    `set the url to the datasetd API provided for cold`,
  );

  op.parse(Deno.args);

  const options = op.options;
  const args = op.args;

  if (options.help) {
    console.log(fmtHelp(helpText(op.help), appInfo));
    Deno.exit(0);
  }
  if (options.license) {
    console.log(appInfo.licenseText);
    Deno.exit(0);
  }
  if (options.version) {
    console.log(`${appInfo.appName} ${appInfo.version} ${appInfo.releaseHash}`);
    Deno.exit(0);
  }
  apiPort = (new URL(options.apiUrl)).port as unknown as number;

  people_ds = new Dataset(apiPort, "people.ds");
  groups_ds = new Dataset(apiPort, "groups.ds");
  funders_ds = new Dataset(apiPort, "funders.ds");

  // Make sure we have a valid static content directory set.
  if (!existsSync(options.htdocs)) {
    console.log(`Cannot find htdocs ${options.htdocs}, aborting`);
    Deno.exit(1);
  }

  const basePath = path.normalize(options.htdocs);
  console.log(`Using JSON API at ${options.apiUrl}`);
  console.log(`Starting COLD UI HTTP service at http://localhost:${options.port}
Static content directory is ${basePath}
`);
  const server = Deno.serve(
    {
      hostname: "localhost",
      port: options.port,
    },
    (req: Request): Response | Promise<Response> => {
      return ColdReadOnlyHandler(req, {
        debug: options.debug,
        htdocs: options.htdocs,
        apiUrl: options.apiUrl,
      });
    },
  );
}

// Run main
if (import.meta.main) main();
