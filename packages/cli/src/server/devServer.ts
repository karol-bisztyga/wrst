import * as path from "path";
import * as readline from "readline";
import * as net from "net";
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
  /** Folder of static assets to serve at /assets (optional). */
  assetsDir?: string;
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

// Probe whether a TCP port can be bound on 0.0.0.0. Resolves false if the port
// is already taken (EADDRINUSE), true otherwise.
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => tester.close(() => resolve(true)))
      .listen(port, "0.0.0.0");
  });
}

// Fail fast with a clear message if either dev-server port is already taken.
// Common cause in the companion case: RN Metro on 8081, or a second wrst server.
// Ports are overridable via WRST_HTTP_PORT / WRST_WS_PORT (or wrst.config server.*).
async function assertPortsFree(
  httpPort: number,
  wsPort: number,
): Promise<void> {
  const taken: number[] = [];
  if (!(await isPortFree(httpPort))) taken.push(httpPort);
  if (!(await isPortFree(wsPort))) taken.push(wsPort);
  if (taken.length === 0) return;

  console.error(
    `\nwrst: port${taken.length > 1 ? "s" : ""} already in use: ${taken.join(", ")}\n` +
      `The dev server needs HTTP :${httpPort} and WebSocket :${wsPort} free.\n` +
      `Another process (maybe another wrst server) is holding ${taken.length > 1 ? "them" : "it"}.\n` +
      `Free the port${taken.length > 1 ? "s" : ""} or override via WRST_HTTP_PORT / WRST_WS_PORT (or server.* in wrst.config).\n`,
  );
  process.exit(1);
}

// The dev loop: watch+bundle the user's entry, serve the bundle over HTTP, nudge
// connected watches to re-pull over WebSocket, and stream build/device/app logs.
export async function startDevServer(opts: DevServerOptions): Promise<void> {
  await assertPortsFree(opts.httpPort, opts.wsPort);

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

  startHttpServer(
    bundlePath,
    bundleMinPath,
    () => currentError,
    opts.httpPort,
    opts.assetsDir,
  );

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
