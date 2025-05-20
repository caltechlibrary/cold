/**
 * cold_api_test.ts - this is a command line utility and test script for the COLD JSON API
 * implemented using dataset and cold_api.yaml.
 */

import { parseArgs } from "@std/cli/parse-args";
import { licenseText, releaseDate, releaseHash, version } from "./version.ts";
import { coldApiTestHelpText, fmtHelp } from "./helptext.ts";

async function apiRequest(c_name: string, method: string, api_path: string, data?: any): Promise<any> {
  let body: string = '';
  if (data !== undefined) {
    body = JSON.stringify(data);
  }
  const reqURL: string = `http://localhost:8112/api/${c_name}/${api_path}`;
  let req: Request;
  switch (method.toUpperCase()) {
    case 'HEAD':
    case 'GET':
      req = new Request(reqURL, {
        'method': method,
        'headers': {'Content-Type': 'application/json'},
        });
      break;
    default:
      req = new Request(reqURL, {
        'method': method,
        'body': body,
        'headers': {'Content-Type': 'application/json'},
        });
  }
  const res = await fetch(req);
  if (res === undefined || res === null) {
    return undefined;
  }
  if (res.ok) {
    body = await res.text();
    return JSON.parse(body);
  }
  res.body?.cancel();
  return { ok: res.ok, msg: res.statusText, status: res.status };
}

async function main() {
  const appName = "cold_api_test";
  const app = parseArgs(Deno.args, {
    alias: {
      help: "h",
      license: "l",
      version: "v",
    },
    default: {
      help: false,
      version: false,
      license: false,
    },
  });
  const args = app._;
  if (app.help) {
    console.log(
      fmtHelp(coldApiTestHelpText, appName, version, releaseDate, releaseHash),
    );
    Deno.exit(0);
  }
  if (app.license) {
    console.log(licenseText);
    Deno.exit(0);
  }

  if (app.version) {
    console.log(`${appName} ${version} ${releaseDate} ${releaseHash}`);
    Deno.exit(0);
  }
  if (args.length < 3) {
    console.error(`USAGE: ${appName} C_NAME METHOD API_PATH [JSON_DATA]`);
    Deno.exit(1);
  }
  const c_name = args.shift() as unknown as string;
  const method = args.shift() as unknown as string;
  const api_path = args.shift() as unknown as string;
  const payload = args.shift() as unknown as string;
  let data: any = null;
  if (method.toLowerCase() !== "get") {
    // FIXME: Is the JSON data coming as a parameter on the cli or as standard input?
    if (args.length > 0) {
      data = JSON.parse(payload);
    } else {
      const decoder = new TextDecoder();
      let text: string[] = [];
      for await (const chunk of Deno.stdin.readable) {
        text.push(decoder.decode(chunk));
      }
      data = JSON.parse(text.join('\n')); 
    }
  }
  if (api_path.startsWith("keys") || api_path.startsWith("object/")) {
      data = await apiRequest(c_name, method, api_path);
  } else {
      data = await apiRequest(c_name, method, api_path, data);
  }

  if (data === undefined) {
    console.error(`something went wrong, ${data}`);
    Deno.exit(1);
  }
  console.log(JSON.stringify(data, null, 2));
}

if (import.meta.main) await main();
