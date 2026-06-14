import path from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";

export type WrstConfig = {
  name?: string;
  entry?: string;
  ios?: { bundleId?: string };
  android?: { applicationId?: string };
  server?: { httpPort?: number; wsPort?: number };
  // Folder of static assets (images, ...) relative to the project root. Served
  // over the dev server in dev and embedded into the app for release. Default
  // "assets". Reference them in <Image src="logo.png" /> (no scheme).
  assets?: string;
  // App-level permissions to declare in the native projects. Keyed by a catalog
  // name (see permissions.ts: heartRate, activity, location, microphone,
  // bluetooth, notifications). `reason` is the iOS permission-dialog string.
  permissions?: Record<string, { reason?: string }>;
};

// Loads wrst.config.ts from a project dir. tsx transforms the .ts config
// regardless of how the CLI was launched.
export async function loadConfig(cwd: string): Promise<WrstConfig> {
  const file = path.join(cwd, "wrst.config.ts");
  if (!existsSync(file)) return {};
  const mod = await tsImport(pathToFileURL(file).href, import.meta.url);
  return (mod.default ?? mod) as WrstConfig;
}
