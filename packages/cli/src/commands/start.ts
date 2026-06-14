import path from "node:path";
import { existsSync } from "node:fs";
import { startDevServer } from "../server/devServer.ts";
import { loadConfig } from "../config.ts";

// `wrst start` - the dev loop for the project in the current directory.
export async function start(_args: string[]): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  const entry = config.entry ?? "src/entry.ts";
  const entryPath = path.resolve(cwd, entry);
  if (!existsSync(entryPath)) {
    console.error(
      `wrst: entry not found: ${entry}\n(set "entry" in wrst.config.ts)`,
    );
    process.exit(1);
  }

  await startDevServer({
    entry: entryPath,
    outdir: path.resolve(cwd, "dist"),
    httpPort: config.server?.httpPort ?? 8081,
    wsPort: config.server?.wsPort ?? 8082,
    assetsDir: path.resolve(cwd, config.assets ?? "assets"),
  });
}
