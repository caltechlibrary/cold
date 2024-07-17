import {
  appInfo,
  ColdReadOnlyHandler,
  dotenv,
  existsSync,
  fmtHelp,
  handleDOIPrefix,
  handleFunders,
  handleGroups,
  handleISSN,
  handlePeople,
  handleSubjects,
  http,
  markdown,
  mustache,
  OptionsProcessor,
  path,
  serveDir,
  yaml,
} from "./deps.ts";

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

{app_name} is setup to run at <http://localhost:8080>. The static content hosted in
the "htdocs" directory.  The datasetd service is setup to run at
<http://localhost:8085> supporting the people, groups and vocabularies dataset
collections.

~~~shell
deno task cold_public_api
deno task cold_public
~~~

`);
  return txt.join("\n");
}

//
// Main function
//
function main() {
  const op: OptionsProcessor = new OptionsProcessor();
  const defaultPort: number = 8080;
  const defaultHtdocs: string = "./htdocs";
  const defaultApiUrl: string = "http://localhost:8085";

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

  // Make sure we have a valid static content directory set.
  if (!existsSync(options.htdocs)) {
    console.log(`Cannot find htdocs ${options.htdocs}, aborting`);
    Deno.exit(1);
  }

  const basePath = path.normalize(options.htdocs);

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
