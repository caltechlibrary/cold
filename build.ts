#!/usr/bin/env deno

import { path, makePage, common_mark } from "./deps.ts";

const startDir = "./htdocs";
for await (const dirEntry of Deno.readDir(startDir)) {
  const f_name = dirEntry.name as unknown as string;
  if (f_name.endsWith(".md")) {
    console.log(`Reading ${path.join(startDir, f_name)}`);
    const text = await Deno.readTextFile(path.join(startDir, f_name));
    const tokens = common_mark.tokens(text);
    const src = common_mark.html(tokens);
    const o_name = path.join(startDir, f_name.replace(/\.md$/, ".html"));

    const body = await makePage("page", {
      page_title: "COLD Public API",
      base_path: "",
      page: { body: src },
    });
    console.log(`Writing ${o_name}`);
    await Deno.writeTextFile(o_name, body);
    //console.log("DEBUG text", body, "\nwrite to ", path.join(startDir, o_name));
  }
}
