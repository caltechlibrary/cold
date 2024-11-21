import { transpile } from "jsr:@deno/emit";
import * as path from "jsr:@std/path";

/* Transpile directory_client.ts to JavaScript to be used by the people edit form. */
const js_path = path.join("htdocs", "js");
const js_name = path.join(js_path, "directory_client.js");
const url = new URL("./directory_client.ts", import.meta.url);
const result = await transpile(url);
const code = await result.get(url.href);
//console.log(code);

await Deno.mkdir(js_path, { mode: 0o775, recursive: true });
Deno.writeTextFile(js_name, code);
