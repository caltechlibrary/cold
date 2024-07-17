#!/usr/bin/env deno

import { renderHtdocs } from "./deps.ts";

// Run build.ts
if (import.meta.main) await renderHtdocs("./htdocs");
