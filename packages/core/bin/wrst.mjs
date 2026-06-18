#!/usr/bin/env node
// `wrst` delegates to @wrst/cli (which carries the actual CLI + dev server).
// This thin shim is what makes `npx @wrst/core init ...` work before a project
// exists: npx fetches `@wrst/core` (+ its @wrst/cli dependency) and runs this,
// which hands off to the CLI with the same argv.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
try {
  const cli = require.resolve("@wrst/cli/bin/wrst.mjs");
  await import(pathToFileURL(cli).href);
} catch (e) {
  console.error(
    "wrst: couldn't load @wrst/cli - try `npm install` (or `npm i -D @wrst/cli`).",
  );
  console.error(e?.message ?? e);
  process.exit(1);
}
