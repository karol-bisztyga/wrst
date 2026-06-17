import * as path from "path";
import { startDevServer } from "./devServer.ts";

// Thin env-driven entry, kept for the monorepo `npm run server` script. The
// `wrst start` command calls startDevServer directly with values from wrst.config.
const entry = process.env.WRST_ENTRY ?? "src/entry.ts";
startDevServer({
  entry,
  outdir: process.env.WRST_OUTDIR ?? "dist",
  httpPort: Number(process.env.WRST_HTTP_PORT ?? 8091),
  wsPort: Number(process.env.WRST_WS_PORT ?? 8092),
  // Convention: assets/ sits next to src/ (entry is <root>/src/entry.ts).
  assetsDir:
    process.env.WRST_ASSETS ?? path.resolve(path.dirname(entry), "../assets"),
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
