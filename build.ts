#!/usr/bin/env deno

import { common_mark, makePage, path } from "./deps.ts";
import { extractYaml } from "@std/front-matter";
import { transpile } from "@deno/emit";
import { ERROR_COLOR } from "./colors.ts";

/* Transpile directory_client.ts to JavaScript to be used by the people edit form. */
const modules_path = path.join("htdocs", "modules");

export async function renderHtdocs(startDir: string) {
  for await (const dirEntry of Deno.readDir(startDir)) {
    const f_name = dirEntry.name as unknown as string;
    if (f_name.endsWith(".md")) {
      console.log(`Reading ${path.join(startDir, f_name)}`);
      const document = await Deno.readTextFile(path.join(startDir, f_name));
      let text: string = "";
      try {
        text = extractYaml(document);
      } catch (err) {
        console.warn(`WARNING: ${path.join(startDir, f_name)}, ${err}`);
        continue;
      }

      const tokens = common_mark.tokens(text.body);
      const src = common_mark.html(tokens);
      const o_name = path.join(startDir, f_name.replace(/\.md$/, ".html"));

      const body = await makePage("page", {
        page_title: "COLD Public API",
        base_path: "",
        page: { body: src },
      });
      console.log(`Writing ${o_name}`);
      await Deno.writeTextFile(o_name, body);
    }
  }
}

// transpileJavaScript accepts a list of TypeScript files to be rendered
// as JavaScript for use in the browser. It relies on the "emit" package.
// @params javaScriptFiles (array of string) to be processed
// @params targetPath (string) the target of where to render the JavaScript files to.
export async function transpileToJavaScript(
  javaScriptFiles: string[],
  targetPath: string,
): Promise<boolean> {
  console.log(
    `%ctranspiling ${javaScriptFiles} to ${modules_path}`,
    "color: green",
  );
  for (const fname of javaScriptFiles) {
    console.log(`%creading ${fname}`, "color: green");
    const url = new URL(fname, import.meta.url);
    let result: Map<string, string>;
    try {
      result = await transpile(url);
    } catch (err) {
      console.log(`%ctranspile error: ${err}`, ERROR_COLOR);
      return false;
    }
    const src: string | undefined = result.get(url.href);
    if (src === undefined) {
      console.log(`failed to compile ${fname}, not output.`);
      return false;
    }
    const targetName = path.join(targetPath, fname.replace(/.ts$/, ".js"));
    console.log(`%cwriting ${targetName}`, "color: yellow");
    try {
      await Deno.writeTextFile(targetName, src);
    } catch (err) {
      console.log(`%cfailed to write ${targetName}, ${err}`, ERROR_COLOR);
      return false;
    }
  }
  return true;
}

// Run build.ts
if (import.meta.main) {
  await renderHtdocs("./htdocs");
  await Deno.mkdir(modules_path, { mode: 0o775, recursive: true });
  let transpileFiles = ["client_api.ts", "directory_client.ts", "orcid_api.ts"];
  let ok: boolean = await transpileToJavaScript(transpileFiles, modules_path);
  if (
    ok
  ) {
    console.log(`transpile ${transpileFiles} success!`);
  } else {
    console.log(`%cERROR: failed to transpile ${javaScriptFiles}`, ERROR_COLOR);
    Deno.exit(1);
  }
}
