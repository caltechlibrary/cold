#!/usr/bin/env deno

import { common_mark, makePage, path } from "./deps.ts";
import { extractYaml } from "@std/front-matter";
import { ERROR_COLOR } from "./colors.ts";

/* Browser modules are bundled by the `deno bundle` tasks in deno.json since the
   v2.7 upgrade; this path only ensures the output directory exists. */
const modules_path = path.join("htdocs", "modules");

export async function renderHtdocs(startDir: string) {
  for await (const dirEntry of Deno.readDir(startDir)) {
    const f_name = dirEntry.name as unknown as string;
    if (f_name.endsWith(".md")) {
      console.log(`Reading ${path.join(startDir, f_name)}`);
      const document = await Deno.readTextFile(
        path.join(startDir, f_name),
      );
      // extractYaml returns the parsed front matter plus the remaining body,
      // not a string. The old `let text: string` annotation was wrong and only
      // went unnoticed because build.ts was absent from the check task.
      let extracted: ReturnType<typeof extractYaml>;
      try {
        extracted = extractYaml(document);
      } catch (err) {
        console.warn(`WARNING: ${path.join(startDir, f_name)}, ${err}`);
        continue;
      }

      const tokens = common_mark.tokens(extracted.body);
      const src = common_mark.html(tokens);
      const o_name = path.join(
        startDir,
        f_name.replace(/\.md$/, ".html"),
      );

      // Each page's front matter declares its own title (WCAG 2.4.2 Page
      // Titled) -- fall back only if a page is missing one, never override
      // a declared title with a fixed string (cold#112).
      const attrs = extracted.attrs as { title?: string };
      const page_title = attrs.title ?? "COLD Public API";

      const body = await makePage("page", {
        page_title: page_title,
        base_path: "",
        page: { body: src },
      });
      console.log(`Writing ${o_name}`);
      await Deno.writeTextFile(o_name, body);
    }
  }
}

// Run build.ts
if (import.meta.main) {
  await renderHtdocs("./htdocs");
  await Deno.mkdir(modules_path, { mode: 0o775, recursive: true });
}
