#!/usr/bin/env node
// The CLI ships TypeScript source; load it through tsx's programmatic API
// (the --loader hook is deprecated in modern Node).
import { tsImport } from "tsx/esm/api";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
await tsImport(path.join(here, "../src/cli.ts"), import.meta.url);
