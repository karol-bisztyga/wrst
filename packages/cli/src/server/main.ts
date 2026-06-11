import { startDevServer } from "./devServer.ts";

// Thin env-driven entry, kept for the monorepo `npm run server` script. The
// `wrst start` command calls startDevServer directly with values from wrst.config.
startDevServer({
  entry: process.env.WRST_ENTRY ?? "src/entry.ts",
  outdir: process.env.WRST_OUTDIR ?? "dist",
  httpPort: Number(process.env.WRST_HTTP_PORT ?? 8081),
  wsPort: Number(process.env.WRST_WS_PORT ?? 8082),
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
