import path from "node:path";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { loadConfig, type WrstConfig } from "../config.ts";
import { applyPermissions } from "../permissions.ts";

// `wrst sync` - apply wrst.config.ts (name / bundle id / applicationId) to the
// native projects. Also run automatically as the first step of run:*/build:*.
export async function sync(_args: string[]): Promise<void> {
  const cwd = process.cwd();
  applyConfig(cwd, await loadConfig(cwd));
  console.log("wrst: applied wrst.config.ts → apple-watch/ + wear-os/");
}

// Writes the config's name/ids into the native projects. wrst owns exactly these
// fields; everything else in apple-watch/ + wear-os/ is the user's.
export function applyConfig(cwd: string, config: WrstConfig): void {
  applyAppleWatch(cwd, config);
  applyWearOs(cwd, config);
  applyPermissions(cwd, config);
}

function edit(file: string, fn: (s: string) => string): void {
  if (!existsSync(file)) return;
  const before = readFileSync(file, "utf8");
  const after = fn(before);
  if (after !== before) writeFileSync(file, after);
}

function applyAppleWatch(cwd: string, config: WrstConfig): void {
  const appleWatchDir = path.join(cwd, "apple-watch");
  if (!existsSync(appleWatchDir)) return;
  const proj = readdirSync(appleWatchDir).find((d) => d.endsWith(".xcodeproj"));
  if (!proj) return;

  edit(path.join(appleWatchDir, proj, "project.pbxproj"), (s) => {
    let out = s;
    if (config.name) {
      out = out.replace(
        /INFOPLIST_KEY_CFBundleDisplayName = "[^"]*";/g,
        `INFOPLIST_KEY_CFBundleDisplayName = "${config.name}";`,
      );
    }
    if (config.ios?.bundleId) {
      // The app target's bundle id only - test targets' ids contain "Test".
      out = out.replace(
        /PRODUCT_BUNDLE_IDENTIFIER = "([^"]*)";/g,
        (m, val: string) =>
          /test/i.test(val)
            ? m
            : `PRODUCT_BUNDLE_IDENTIFIER = "${config.ios!.bundleId}";`,
      );
    }
    return out;
  });
}

function applyWearOs(cwd: string, config: WrstConfig): void {
  const a = path.join(cwd, "wear-os");
  if (!existsSync(a)) return;

  if (config.name) {
    edit(path.join(a, "settings.gradle.kts"), (s) =>
      s.replace(
        /rootProject\.name = "[^"]*"/,
        `rootProject.name = "${config.name}"`,
      ),
    );
    edit(path.join(a, "app/src/main/res/values/strings.xml"), (s) =>
      s.replace(
        /<string name="app_name">[^<]*<\/string>/,
        `<string name="app_name">${config.name}</string>`,
      ),
    );
  }
  if (config.android?.applicationId) {
    edit(path.join(a, "app/build.gradle.kts"), (s) =>
      s.replace(
        /applicationId = "[^"]*"/,
        `applicationId = "${config.android!.applicationId}"`,
      ),
    );
  }
}
