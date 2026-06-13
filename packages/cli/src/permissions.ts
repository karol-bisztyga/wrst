import path from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { WrstConfig } from "./config.ts";

// Layer-1 permission handling: declare permissions in the native projects from
// wrst.config.ts. The runtime request + granted/denied status (layer 2) lives
// in the sensor native modules, not here.
//
// This is the catalog of app-level permissions wrst can declare. It matches the
// commented block in a project's wrst.config.ts. Engine sensors
// (accelerometer/gyroscope/magnetometer) are promptless and intentionally
// absent - a bare app declares nothing.
type PermSpec = {
  // Info.plist usage-description keys (each needs the `reason` string).
  ios?: string[];
  // AndroidManifest <uses-permission> names.
  android?: string[];
};

export const PERMISSION_CATALOG: Record<string, PermSpec> = {
  heartRate: {
    // iOS also needs the HealthKit capability/entitlement enabled in Xcode -
    // that's beyond Info.plist and handled with the heart-rate module.
    ios: ["NSHealthShareUsageDescription"],
    android: ["android.permission.BODY_SENSORS"],
  },
  activity: {
    ios: ["NSMotionUsageDescription"],
    android: ["android.permission.ACTIVITY_RECOGNITION"],
  },
  location: {
    ios: ["NSLocationWhenInUseUsageDescription"],
    android: [
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
    ],
  },
  microphone: {
    ios: ["NSMicrophoneUsageDescription"],
    android: ["android.permission.RECORD_AUDIO"],
  },
  bluetooth: {
    ios: ["NSBluetoothAlwaysUsageDescription"],
    android: [
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.BLUETOOTH_SCAN",
    ],
  },
  notifications: {
    // iOS notifications are runtime-authorized only - nothing to declare.
    android: ["android.permission.POST_NOTIFICATIONS"],
  },
};

// Fallback iOS usage strings if a project leaves `reason` empty (Apple crashes
// on access when the string is missing).
const DEFAULT_REASON: Record<string, string> = {
  NSHealthShareUsageDescription: "This app uses health data.",
  NSMotionUsageDescription: "This app uses motion and fitness data.",
  NSLocationWhenInUseUsageDescription: "This app uses your location.",
  NSMicrophoneUsageDescription: "This app uses the microphone.",
  NSBluetoothAlwaysUsageDescription: "This app uses Bluetooth.",
};

const ALL_IOS_KEYS = uniq(
  Object.values(PERMISSION_CATALOG).flatMap((s) => s.ios ?? []),
);
const ALL_ANDROID_PERMS = uniq(
  Object.values(PERMISSION_CATALOG).flatMap((s) => s.android ?? []),
);

// Reconcile ios/Info.plist + android AndroidManifest.xml to the active
// (uncommented) permissions in wrst.config.ts: add what's listed, remove any
// catalog permission that isn't. Idempotent - it only ever touches the keys/
// permissions in the catalog, never the user's other entries.
export function applyPermissions(cwd: string, config: WrstConfig): void {
  const active = config.permissions ?? {};
  applyIosPermissions(cwd, active);
  applyAndroidPermissions(cwd, active);
}

type ActivePerms = NonNullable<WrstConfig["permissions"]>;

function applyIosPermissions(cwd: string, active: ActivePerms): void {
  const plist = path.join(cwd, "ios", "Info.plist");
  if (!existsSync(plist)) return;
  let s = readFileSync(plist, "utf8");

  // 1. Strip every catalog key (the remove pass).
  for (const key of ALL_IOS_KEYS) s = removePlistKey(s, key);

  // 2. Add the active ones with their reason strings.
  const additions: string[] = [];
  for (const [name, spec] of Object.entries(PERMISSION_CATALOG)) {
    if (!active[name] || !spec.ios) continue;
    const reason =
      active[name].reason?.trim() ||
      DEFAULT_REASON[spec.ios[0]] ||
      "This app requires this permission.";
    for (const key of spec.ios) {
      additions.push(`\t<key>${key}</key>\n\t<string>${escapeXml(reason)}</string>`);
    }
  }
  if (additions.length) {
    // Insert inside the outer <dict>, before its close.
    s = s.replace(/<\/dict>(\s*<\/plist>)/, `${additions.join("\n")}\n</dict>$1`);
  }

  writeFileSync(plist, s);
}

function applyAndroidPermissions(cwd: string, active: ActivePerms): void {
  const manifest = path.join(
    cwd,
    "android",
    "app",
    "src",
    "main",
    "AndroidManifest.xml",
  );
  if (!existsSync(manifest)) return;
  let s = readFileSync(manifest, "utf8");

  // 1. Strip every catalog permission (the remove pass).
  for (const perm of ALL_ANDROID_PERMS) s = removeAndroidPerm(s, perm);

  // 2. Collect the active permissions and add them after the <manifest> tag.
  const perms: string[] = [];
  for (const [name, spec] of Object.entries(PERMISSION_CATALOG)) {
    if (!active[name] || !spec.android) continue;
    for (const p of spec.android) if (!perms.includes(p)) perms.push(p);
  }
  if (perms.length) {
    const block = perms
      .map((p) => `    <uses-permission android:name="${p}" />`)
      .join("\n");
    s = s.replace(/(<manifest\b[^>]*>\n)/, `$1\n${block}\n`);
  }

  // Collapse any blank-line churn the add/remove passes leave behind.
  s = s.replace(/\n{3,}/g, "\n\n");

  writeFileSync(manifest, s);
}

function removePlistKey(s: string, key: string): string {
  const re = new RegExp(
    `\\n?[ \\t]*<key>${escapeRegex(key)}</key>\\s*<string>[^<]*</string>`,
    "g",
  );
  return s.replace(re, "");
}

function removeAndroidPerm(s: string, perm: string): string {
  const re = new RegExp(
    `\\n?[ \\t]*<uses-permission android:name="${escapeRegex(perm)}"\\s*/>`,
    "g",
  );
  return s.replace(re, "");
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
