import { bundleOnce } from "../packages/cli/src/bundler.ts";

const entry = process.env.WRST_ENTRY ?? "example/src/entry.ts";
const outdir = process.env.WRST_OUTDIR ?? "dist";

await bundleOnce(entry, outdir);
console.log(`[bundle] ${outdir}/bundle.js + bundle.min.js`);
