import * as path from "path";
import * as readline from "readline";
import { startWatcher } from "./watcher.ts";
import { startHttpServer } from "./httpServer.ts";
import { startSocketServer } from "./socketServer.ts";
import * as logger from "./logger.ts";

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
    if ((key.ctrl && key.name === "c") || key.name === "q") {
      process.exit(0);
    } else if (key.name === "r") {
      socket.broadcast("reload");
      logger.reloadSent(socket.devices());
    } else if (key.name === "l") {
      logger.deviceList(socket.devices());
    }
  });
}

// The dev loop: watch+bundle the user's entry, serve the bundle over HTTP, nudge
// connected watches to re-pull over WebSocket, and stream build/device/app logs.
export async function startDevServer(opts: DevServerOptions): Promise<void> {
  const bundlePath = path.resolve(opts.outdir, "bundle.js");
  const bundleMinPath = path.resolve(opts.outdir, "bundle.min.js");

  // Single source of truth: /bundle.js serves the bundle when healthy, or the
  // current build error otherwise. The WebSocket is just a "re-pull" nudge.
  let currentError: string | null = null;

  const socket = startSocketServer(opts.wsPort, {
    onConnect: (name) => logger.deviceConnected(name),
    onDisconnect: (name) => logger.deviceDisconnected(name),
    onLog: (device, level, message) => logger.appLog(device, level, message),
  });

  startHttpServer(bundlePath, bundleMinPath, () => currentError, opts.httpPort);

  setupKeys(socket);
  logger.banner(
    `http://localhost:${opts.httpPort}/bundle.js`,
    `ws://localhost:${opts.wsPort}`,
  );

  await startWatcher(
    opts.entry,
    opts.outdir,
    () => {
      currentError = null;
      socket.broadcast("reload");
      logger.buildOk();
    },
    (message) => {
      currentError = message;
      socket.broadcast("reload");
      logger.buildError(message);
    },
  );
}
