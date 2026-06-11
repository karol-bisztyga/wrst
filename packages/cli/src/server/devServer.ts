import * as path from "path";
import * as readline from "readline";
import { startWatcher } from "./watcher.ts";
import { startHttpServer } from "./httpServer.ts";
import { startSocketServer } from "./socketServer.ts";
import { Dashboard } from "./dashboard.ts";

export type DevServerOptions = {
  /** The app entry file to bundle (e.g. src/entry.ts). */
  entry: string;
  /** Output dir for the bundles. */
  outdir: string;
  httpPort: number;
  wsPort: number;
};

function setupKeys(socket: ReturnType<typeof startSocketServer>): void {
  if (!process.stdin.isTTY) return;
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  process.stdin.on("keypress", (_str, key) => {
    if (!key) return;
    if (key.ctrl && key.name === "c") {
      process.exit(0);
    } else if (key.name === "r") {
      socket.broadcast("reload");
    }
  });
}

// The dev loop: watch+bundle the user's entry, serve the bundle over HTTP, nudge
// connected watches to re-pull over WebSocket, and draw the live dashboard.
export async function startDevServer(opts: DevServerOptions): Promise<void> {
  const bundlePath = path.resolve(opts.outdir, "bundle.js");
  const bundleMinPath = path.resolve(opts.outdir, "bundle.min.js");

  // Single source of truth: /bundle.js serves the bundle when healthy, or the
  // current build error otherwise. The WebSocket is just a "re-pull" nudge.
  let currentError: string | null = null;

  const dashboard = new Dashboard(opts.httpPort, opts.wsPort);
  const socket = startSocketServer(opts.wsPort, () => dashboard.refresh());
  dashboard.setDevicesProvider(() => socket.devices());

  startHttpServer(bundlePath, bundleMinPath, () => currentError, opts.httpPort);

  setupKeys(socket);
  dashboard.render();

  await startWatcher(
    opts.entry,
    opts.outdir,
    () => {
      currentError = null;
      socket.broadcast("reload");
      dashboard.markBuilt();
    },
    (message) => {
      currentError = message;
      socket.broadcast("reload");
      dashboard.markError(message);
    },
  );
}
