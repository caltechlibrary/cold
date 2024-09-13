#!/usr/bin/env deno

import { common_mark, extractYaml, makePage, path } from "./deps.ts";

export async function renderHtdocs(startDir: string) {
  for await (const dirEntry of Deno.readDir(startDir)) {
    const f_name = dirEntry.name as unknown as string;
    if (f_name.endsWith(".md")) {
      console.log(`Reading ${path.join(startDir, f_name)}`);
      const text = extractYaml(
        await Deno.readTextFile(path.join(startDir, f_name)),
      );

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

// Run build.ts
if (import.meta.main) await renderHtdocs("./htdocs");
