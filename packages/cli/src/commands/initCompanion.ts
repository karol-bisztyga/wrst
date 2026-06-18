import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// packages/cli/src/commands/initCompanion.ts → packages/cli/templates
const TEMPLATES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "templates",
);

// `wrst init --companion <path>` - add a wrst watch app as a companion to an
// existing React Native phone app. Unlike standalone `wrst init` (which creates a
// fresh project), this targets an EXISTING RN project: it validates the project,
// detects bare-RN vs Expo + which native dirs exist, then scaffolds the watch
// side and wires the phone-side bridge.
//
// The actual file generation is split by platform:
//   - Wear OS        → fully automated         (step 7)
//   - Apple Watch / Expo → Expo config plugin  (step 8)
//   - Apple Watch / bare → files + Xcode docs  (step 9)
// This module does the detection + dispatch; the scaffolders fill in the rest.

export type CompanionTarget = {
  /** Absolute path to the RN project root. */
  dir: string;
  /** App display name (Expo app.json name, else package.json name). */
  appName: string;
  /** The project's react-native version range (for messaging). */
  rnVersion: string;
  /** Expo project (has `expo` dep or an Expo app config) vs bare RN. */
  isExpo: boolean;
  hasIos: boolean;
  hasAndroid: boolean;
};

function fail(message: string): never {
  console.error(`wrst: ${message}`);
  process.exit(1);
}

// Read package.json deps + devDeps merged (a dep can live in either).
function allDeps(pkg: any): Record<string, string> {
  return { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
}

// Expo is detected by the `expo` dependency or an Expo app config (app.json with
// an `expo` key, or app.config.{js,ts,mjs,cjs,json}).
function detectExpo(dir: string, deps: Record<string, string>): boolean {
  if (deps["expo"]) return true;
  for (const f of [
    "app.config.js",
    "app.config.ts",
    "app.config.mjs",
    "app.config.cjs",
    "app.config.json",
  ]) {
    if (existsSync(path.join(dir, f))) return true;
  }
  const appJson = path.join(dir, "app.json");
  if (existsSync(appJson)) {
    try {
      if (JSON.parse(readFileSync(appJson, "utf8")).expo) return true;
    } catch {
      /* ignore malformed app.json */
    }
  }
  return false;
}

function readAppName(dir: string, pkg: any): string {
  const appJson = path.join(dir, "app.json");
  if (existsSync(appJson)) {
    try {
      const j = JSON.parse(readFileSync(appJson, "utf8"));
      const name = j.expo?.name ?? j.name;
      if (typeof name === "string" && name) return name;
    } catch {
      /* fall through */
    }
  }
  return typeof pkg.name === "string" && pkg.name ? pkg.name : "app";
}

// Validate the path is a real RN project and gather what the scaffolders need.
// Exits with a clear message on any problem.
function detectTarget(dir: string): CompanionTarget {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    fail(`not a directory: ${dir}`);
  }
  const pkgPath = path.join(dir, "package.json");
  if (!existsSync(pkgPath)) {
    fail(
      `no package.json in ${dir}\n` +
        `Point --companion at your React Native project root (e.g. \`wrst init --companion .\`).`,
    );
  }
  let pkg: any;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch {
    fail(`${pkgPath} is not valid JSON`);
  }

  const deps = allDeps(pkg);
  const rnVersion = deps["react-native"];
  if (!rnVersion) {
    fail(
      `"${path.basename(dir)}" is not a React Native app ` +
        `(no "react-native" dependency in package.json).\n` +
        `Run this inside an existing RN or Expo project.`,
    );
  }

  return {
    dir,
    appName: readAppName(dir, pkg),
    rnVersion,
    isExpo: detectExpo(dir, deps),
    hasIos: existsSync(path.join(dir, "ios")),
    hasAndroid: existsSync(path.join(dir, "android")),
  };
}

function printSummary(t: CompanionTarget): void {
  const kind = t.isExpo ? "Expo" : "bare React Native";
  console.log(`\n  wrst companion setup for "${t.appName}"`);
  console.log(`    project:      ${t.dir}`);
  console.log(`    type:         ${kind} (react-native ${t.rnVersion})`);
  console.log(
    `    native dirs:  ios/ ${t.hasIos ? "✓" : "-"}   android/ ${t.hasAndroid ? "✓" : "-"}`,
  );

  console.log("\n  Plan:");
  console.log(
    "    • Wear OS:      generate a wear-os/ module + wire the phone bridge",
  );
  if (t.isExpo) {
    console.log(
      "    • Apple Watch:  add an Expo config plugin (watch target on next prebuild)",
    );
  } else {
    console.log(
      "    • Apple Watch:  drop apple-watch/ files + print a one-time Xcode checklist",
    );
  }
  console.log("    • Signing:      stays manual on iOS (Apple requirement)\n");
}

// ── Shared scaffolding helpers ──────────────────────────────────────────────

// Recursively replace literal `key` → `value` across a copied template tree.
async function substitute(
  dir: string,
  vars: Record<string, string>,
): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "build") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await substitute(full, vars);
    } else {
      let content = await readFile(full, "utf8");
      let changed = false;
      for (const [key, value] of Object.entries(vars)) {
        if (content.includes(key)) {
          content = content.split(key).join(value);
          changed = true;
        }
      }
      if (changed) await writeFile(full, content);
    }
  }
}

// Templates ship `gitignore` (a real .gitignore would be applied by npm at pack
// time); rename them back on scaffold.
async function renameGitignores(dir: string): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await renameGitignores(full);
    else if (entry.name === "gitignore")
      await rename(full, path.join(dir, ".gitignore"));
  }
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .replace(/^-+|-+$/g, "") || "app"
  );
}

// The phone app's package/applicationId - the Wear app MUST use the same one for
// the Data Layer to associate them. Expo: app.json expo.android.package; bare:
// android/app/build.gradle[.kts] applicationId (or namespace). null if unknown.
function readPhonePackage(t: CompanionTarget): string | null {
  const appJson = path.join(t.dir, "app.json");
  if (existsSync(appJson)) {
    try {
      const j = JSON.parse(readFileSync(appJson, "utf8"));
      const pkg = j.expo?.android?.package ?? j.android?.package;
      if (typeof pkg === "string" && pkg) return pkg;
    } catch {
      /* ignore */
    }
  }
  for (const f of [
    "android/app/build.gradle",
    "android/app/build.gradle.kts",
  ]) {
    const p = path.join(t.dir, f);
    if (!existsSync(p)) continue;
    const s = readFileSync(p, "utf8");
    const appId = s.match(/applicationId\s*=?\s*["']([^"']+)["']/);
    if (appId) return appId[1];
    const ns = s.match(/namespace\s*=?\s*["']([^"']+)["']/);
    if (ns) return ns[1];
  }
  return null;
}

// ── Per-platform scaffolders ────────────────────────────────────────────────

// Step 7: generate the standalone Wear OS watch module at <project>/wear-os/.
// It's the same shell as `wrst init`'s wear-os template, but with its
// applicationId pinned to the phone app's package (Data Layer needs that + the
// same signing key). The wrst_companion capability is advertised by the runtime
// AAR (bundled wear.xml); the watch loads the JS bundle from the dev server in
// debug / embedded in release. Works for both bare RN and (prebuild) Expo, since
// it's an independent Gradle project.
async function scaffoldWearOs(t: CompanionTarget): Promise<void> {
  const dest = path.join(t.dir, "wear-os");
  if (existsSync(dest) && (await readdir(dest)).length > 0) {
    console.log(
      "  → Wear OS: wear-os/ already exists - skipping (delete it to regenerate).",
    );
    return;
  }

  const src = path.join(TEMPLATES_DIR, "wear-os");
  if (!existsSync(src))
    fail("the wear-os template is missing from the CLI package");

  await cp(src, dest, { recursive: true });
  await renameGitignores(dest);

  const phonePkg = readPhonePackage(t);
  const applicationId = phonePkg ?? `com.${slugify(t.appName)}`;

  await substitute(dest, {
    __APP_NAME__: t.appName,
    // The template's applicationId is `com.example.__APP_ID__`; pin it to the phone's.
    "com.example.__APP_ID__": applicationId,
  });

  // Pin the package + sign with the phone app's debug.keystore so the Wearable
  // Data Layer treats phone + watch as one app (same package + signing cert).
  const buildFile = path.join(dest, "app", "build.gradle.kts");
  if (existsSync(buildFile)) {
    let s = await readFile(buildFile, "utf8");
    const note =
      "        // Companion: equals the phone app's package (Data Layer associates\n" +
      "        // the two apps by package + signing cert).\n";
    s = s.replace(/(\n)(\s*)applicationId = /, `$1${note}$2applicationId = `);
    // RN/Expo ship android/app/debug.keystore; the wear app must use that SAME
    // keystore - the default ~/.android/debug.keystore is a DIFFERENT cert, which
    // makes the Data Layer see two unrelated apps (reachable stays false).
    const signing =
      "    signingConfigs {\n" +
      '        getByName("debug") {\n' +
      '            storeFile = file("../../android/app/debug.keystore")\n' +
      '            storePassword = "android"\n' +
      '            keyAlias = "androiddebugkey"\n' +
      '            keyPassword = "android"\n' +
      "        }\n" +
      "    }\n\n";
    s = s.replace(/(\n)(\s*)buildTypes \{/, `$1${signing}$2buildTypes {`);
    await writeFile(buildFile, s);
  }

  console.log(
    `  → Wear OS: generated wear-os/  (applicationId ${applicationId})`,
  );
  if (!phonePkg) {
    console.log(
      "     ⚠ couldn't read the phone app's package - set wear-os applicationId to match it\n" +
        "       (the Data Layer needs the same package + signing key).",
    );
  }
}

// Add a config plugin to the Expo config. Returns where it landed ("app.json")
// or "manual" when the config is a JS/TS app.config we can't safely edit.
async function addExpoPlugin(
  dir: string,
  name: string,
): Promise<"app.json" | "manual"> {
  const appJsonPath = path.join(dir, "app.json");
  if (!existsSync(appJsonPath)) return "manual";
  try {
    const j = JSON.parse(await readFile(appJsonPath, "utf8"));
    const expo = (j.expo ??= {});
    const plugins: any[] = Array.isArray(expo.plugins)
      ? expo.plugins
      : (expo.plugins = []);
    const has = plugins.some((p) => (Array.isArray(p) ? p[0] : p) === name);
    if (!has) {
      plugins.push(name);
      await writeFile(appJsonPath, JSON.stringify(j, null, 2) + "\n");
    }
    return "app.json";
  } catch {
    return "manual";
  }
}

const EXPO_TARGET_README = `# wrst watch target (Expo)

This folder is an Apple Watch app target, added to your iOS build at \`expo
prebuild\` by [@bacons/apple-targets](https://github.com/EvanBacon/expo-apple-targets)
(declared in \`expo-target.config.js\`). It's regenerated from config, so prebuild
never corrupts a committed \`.xcodeproj\`.

## Setup (mostly automatic)

\`wrst init --companion\` already added \`@bacons/apple-targets\` (to devDependencies
+ app config plugins) and \`@wrst/react-native\` (to plugins, **after** @bacons). So:

\`\`\`sh
npm install
npx expo run:ios   # prebuilds: @bacons creates the watch target, the
                   # @wrst/react-native plugin links the WrstRuntime package
\`\`\`

The only manual step left is **signing**: in Xcode, select the watch target and
pick your team (Apple requirement). Its bundle id is a child of the phone app's
(\`<app>.watchkitapp\`).

**Fallback** - if you see a "couldn't auto-link the WrstRuntime Swift package"
warning during prebuild, add it by hand: watch target → *General → Frameworks,
Libraries* → **+** → *Add Other → Add Package Dependency* →
\`node_modules/@wrst/core/apple-watch/wrst-runtime\` → \`WrstRuntime\`. (Most likely cause:
\`@wrst/react-native\` isn't listed after \`@bacons/apple-targets\` in your plugins.)

## Dev loop

Run \`npx @wrst/core start\` (the dev server) and build from Xcode / \`expo run:ios\`; the
watch pulls its JS bundle from the dev server and live-reloads.
`;

// Step 8: Apple Watch via Expo. We don't hand-edit the pbxproj (prebuild would
// blow it away anyway); instead we drop a watch target *folder* that
// @bacons/apple-targets turns into a real target on every prebuild, and register
// that plugin. The watch UI is authored in TS (wrst) and pulled at runtime; this
// is just the native shell.
async function scaffoldAppleWatchExpo(t: CompanionTarget): Promise<void> {
  const targetDir = path.join(t.dir, "targets", "wrst-watch");
  if (existsSync(targetDir) && (await readdir(targetDir)).length > 0) {
    console.log(
      "  → Apple Watch (Expo): targets/wrst-watch/ already exists - skipping.",
    );
    return;
  }

  const tpl = path.join(TEMPLATES_DIR, "apple-watch");
  if (!existsSync(tpl))
    fail("the apple-watch template is missing from the CLI package");

  // The watch app sources (SwiftUI + assets) + Info.plist - NOT the .xcodeproj
  // (the plugin generates the target).
  await cp(path.join(tpl, "AppleWatch Watch App"), targetDir, {
    recursive: true,
  });
  await cp(path.join(tpl, "Info.plist"), path.join(targetDir, "Info.plist"));

  // The target declaration @bacons/apple-targets reads at prebuild. The bundle id
  // is derived from the phone app's at prebuild time (child .watchkitapp).
  const cfg = `/** @type {import('@bacons/apple-targets').ConfigFunction} */
module.exports = (config) => ({
  type: "watch",
  name: ${JSON.stringify(`${t.appName} Watch`)},
  // Apple requires a watch app's bundle id to be a child of the phone app's.
  bundleIdentifier: \`\${config.ios?.bundleIdentifier ?? "com.example.app"}.watchkitapp\`,
  deploymentTarget: "10.0",
  frameworks: ["WatchConnectivity"],
});
`;
  await writeFile(path.join(targetDir, "expo-target.config.js"), cfg);
  await writeFile(path.join(targetDir, "README.md"), EXPO_TARGET_README);

  // Order matters: @bacons creates the target, then @wrst/react-native's plugin
  // links the WrstRuntime Swift package to it.
  const wired = await addExpoPlugin(t.dir, "@bacons/apple-targets");
  await addExpoPlugin(t.dir, "@wrst/react-native");

  console.log(
    "  → Apple Watch (Expo): generated targets/wrst-watch/ (target via @bacons/apple-targets)",
  );
  if (wired === "app.json") {
    console.log(
      "     wired @bacons/apple-targets + @wrst/react-native into app.json plugins",
    );
  } else {
    console.log(
      '     ⚠ add "@bacons/apple-targets" then "@wrst/react-native" to your app.config plugins (in that order)',
    );
  }
  console.log(
    "     (@bacons added to devDependencies; the @wrst/react-native plugin auto-links WrstRuntime)",
  );
  console.log(
    "     after npm install:  npx expo run:ios   (prebuilds + links automatically)",
  );
}

// The phone app's iOS bundle id - the watch app's must be a child of it. Expo:
// app.json expo.ios.bundleIdentifier; bare: the app target's
// PRODUCT_BUNDLE_IDENTIFIER in ios/*.xcodeproj (skipping test targets). null if unknown.
function readPhoneIosBundleId(t: CompanionTarget): string | null {
  const appJson = path.join(t.dir, "app.json");
  if (existsSync(appJson)) {
    try {
      const j = JSON.parse(readFileSync(appJson, "utf8"));
      const b = j.expo?.ios?.bundleIdentifier ?? j.ios?.bundleIdentifier;
      if (typeof b === "string" && b) return b;
    } catch {
      /* ignore */
    }
  }
  const iosDir = path.join(t.dir, "ios");
  if (existsSync(iosDir)) {
    const proj = readdirSync(iosDir).find((d) => d.endsWith(".xcodeproj"));
    if (proj) {
      const pbx = path.join(iosDir, proj, "project.pbxproj");
      if (existsSync(pbx)) {
        const s = readFileSync(pbx, "utf8");
        const ids = [
          ...s.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = "?([^";]+)"?;/g),
        ]
          .map((m) => m[1])
          .filter((b) => !/test/i.test(b));
        if (ids[0]) return ids[0];
      }
    }
  }
  return null;
}

function bareSetupChecklist(): string {
  return `# Add the wrst Apple Watch app (bare React Native)

The watch app's Swift source lives in this \`apple-watch/\` folder. wrst does **not**
edit your \`ios/*.xcodeproj\` (too risky), so add the target once in Xcode:

1. Open **\`ios/*.xcworkspace\`** in Xcode (the \`.xcworkspace\`, not \`.xcodeproj\` -
   you should see a \`Pods\` project in the navigator).
2. **File → New → Target... → watchOS → App.** In the dialog:
   - Choose **"Watch App for an Existing iOS App"** and **pick your app** in the
     dropdown - **not "None"** (None makes a detached/standalone target that won't
     embed or share a bundle-id family).
   - **Interface: SwiftUI**, **Language: Swift**, **Testing System: None**.
   - When prompted **"Activate scheme?"**, click **Activate**.
   - Confirm the target now appears in the project's **TARGETS** list (click the
     blue project icon at the top of the navigator).
3. The new target's group has two generated Swift files + an \`Assets.xcassets\`.
   **Delete both Swift files** (\`<Name>App.swift\` and \`ContentView.swift\`) - two
   \`@main\`s won't compile. **Keep** the generated \`Assets.xcassets\`.
4. **Drag \`AppleWatchApp.swift\` from this folder** into the target's group. In the
   sheet: tick **Copy items if needed** and check **only the watch target** under
   *Add to targets*. If Xcode offers an **Objective-C bridging header, choose
   "Don't Create"** (pure Swift - none needed). Don't drag \`Info.plist\` /
   \`Assets.xcassets\` / this \`.md\`.
5. **Bundle identifier:** set the watch target's id to **your iOS app's bundle id
   + \`.watchkitapp\`** (Apple requires it to be a child). E.g. app
   \`com.you.myapp\` → \`com.you.myapp.watchkitapp\`. If Xcode pre-fills a
   \`$(PRODUCT_NAME:rfc1034identifier)\` placeholder, replace it with the real id.
6. **Allow the dev server (cleartext http/ws):** watch target → **Info** → add
   **App Transport Security Settings → Allow Arbitrary Loads = YES**. Without this
   the watch app launches but can't pull its JS bundle in dev.
7. **Link the wrst runtime:** watch target → **General → Frameworks, Libraries** →
   **+** → *Add Other → Add Package Dependency...* → choose the local package
   \`node_modules/@wrst/core/apple-watch/wrst-runtime\` → add the **WrstRuntime** product.
8. **Signing:** select your team for the watch target (stays manual - Apple).
   Xcode adds an **Embed Watch Content** phase to the phone app automatically when
   you attach to an existing app (step 2).

Then run \`npx @wrst/core start\` (dev server) and build from Xcode; the watch pulls its
JS bundle and live-reloads. The phone side is already wired via \`@wrst/react-native\`
(\`import { Companion } from "@wrst/react-native"\`).
`;
}

// Step 9: bare RN. Drop the watch app sources into <project>/apple-watch/ (a
// sibling of ios/, so we never touch the user's ios/ project) and write a
// one-time Xcode setup checklist. No pbxproj editing.
async function scaffoldAppleWatchBare(t: CompanionTarget): Promise<void> {
  const dest = path.join(t.dir, "apple-watch");
  if (existsSync(dest) && (await readdir(dest)).length > 0) {
    console.log(
      "  → Apple Watch (bare): apple-watch/ already exists - skipping.",
    );
    return;
  }

  const tpl = path.join(TEMPLATES_DIR, "apple-watch");
  if (!existsSync(tpl))
    fail("the apple-watch template is missing from the CLI package");

  // Just the watch sources (Swift + assets + Info.plist) - NOT the .xcodeproj;
  // the user adds them to their existing ios/ project as a new target.
  await cp(path.join(tpl, "AppleWatch Watch App"), dest, { recursive: true });
  await cp(path.join(tpl, "Info.plist"), path.join(dest, "Info.plist"));

  const checklistPath = path.join(dest, "APPLE_WATCH_SETUP.md");
  await writeFile(checklistPath, bareSetupChecklist());

  console.log(
    "  → Apple Watch (bare): dropped apple-watch/ sources (no pbxproj changes)",
  );
  console.log(
    `     one-time Xcode setup: ${path.relative(t.dir, checklistPath)}`,
  );
  console.log(
    '     watch bundle id = your iOS app\'s bundle id + ".watchkitapp"',
  );
}

// The watch app's bundle entry.
const WATCH_ENTRY = `import { start } from "@wrst/core";
import App from "./App.tsx";

// The watch UI's entry point - bundled by \`wrst start\` / the build and run
// inside QuickJS on the watch. Keep authoring it in TypeScript + JSX.
start(App);
`;

// A starter watch UI showing the companion 3-tier pattern: ask the phone when
// it's available, else fetch directly, else fall back to a cached value.
const WATCH_APP_DEMO = `import {
  Companion,
  createNavigation,
  useNavigation,
  VerticalView,
  HorizontalView,
  View,
  Text,
  Button,
  useState,
  useEffect,
  Component,
} from "@wrst/core";

// A bidirectional companion demo: each side sends a random number to the other
// and shows the last value it received. Companion.isCompanionAvailable / .reason
// are reactive - use them directly in JSX.
const Main: Component = () => {
  const [sent, setSent] = useState("-");
  const [received, setReceived] = useState("-");

  useEffect(() => {
    const sub = Companion.onMessage((msg) => {
      if (msg && typeof msg.value === "number") setReceived(String(msg.value));
    });
    return () => sub.unsubscribe();
  }, []);

  const sendRandom = () => {
    const n = Math.floor(Math.random() * 100) + 1;
    setSent(String(n));
    Companion.sendMessage({ value: n });
  };

  return (
    <VerticalView
      style={{
        width: "fill",
        height: "fill",
        backgroundColor: "#000",
        horizontalAlignment: "center",
        padding: 12,
      }}
    >
      <VerticalView style={{ horizontalAlignment: "center" }}>
        <Text style={{ color: "#0f0" }}>phone reachable:</Text>
        <Text style={{ color: "#0f0" }}>{Companion.isCompanionAvailable}</Text>
        <Text style={{ color: "#0f0" }}>{Companion.reason || "?"}</Text>
      </VerticalView>
      <View style={{ height: 8 }} />
      <HorizontalView>
        <Text style={{ color: "#fff" }}>sent: </Text>
        <Text style={{ color: "#fff" }}>{sent}</Text>
      </HorizontalView>
      <HorizontalView>
        <Text style={{ color: "#9cf" }}>received: </Text>
        <Text style={{ color: "#9cf" }}>{received}</Text>
      </HorizontalView>
      <View style={{ height: 10 }} />
      <Button onPress={sendRandom}>
        <Text style={{ color: "#fff" }}>Send random</Text>
      </Button>
    </VerticalView>
  );
};

createNavigation({
  initial: "main",
  routes: { main: Main },
  showHeader: false,
});

const App: Component = () => {
  const { Screen } = useNavigation();
  return <Screen />;
};

export default App;
`;

// Step 11 (watch source): drop a wrst.config + a starter watch UI so `wrst start`
// works out of the box. Lives at the RN project root alongside apple-watch/ +
// wear-os/; server ports inherit the wrst defaults (8091/8092, off Metro's 8081).
async function scaffoldWatchSource(t: CompanionTarget): Promise<void> {
  const configPath = path.join(t.dir, "wrst.config.ts");
  const watchDir = path.join(t.dir, "watch");
  if (existsSync(configPath) || existsSync(watchDir)) {
    console.log(
      "  → Watch UI: wrst.config.ts / watch/ already present - skipping.",
    );
    return;
  }

  const applicationId = readPhonePackage(t) ?? "com.example.app";
  const phoneBundle = readPhoneIosBundleId(t);
  const watchBundle = phoneBundle ? `${phoneBundle}.watchkitapp` : ".wrstwatch";

  const config = `// wrst watch-app config - read by the CLI for dev + builds. The watch UI is a
// separate JS app from your React Native phone code; it lives in watch/.
export default {
  name: ${JSON.stringify(t.appName)},
  entry: "watch/entry.ts",
  ios: {
    // The watch app's bundle id (a child of the phone app's).
    bundleId: ${JSON.stringify(watchBundle)},
  },
  android: {
    // Must match the phone app's package for the Wearable Data Layer.
    applicationId: ${JSON.stringify(applicationId)},
  },
  // server ports inherit the wrst defaults (8091/8092) - kept off React Native's
  // Metro (8081) so both dev servers can run together.
};
`;

  await writeFile(configPath, config);
  await mkdir(watchDir, { recursive: true });
  await writeFile(path.join(watchDir, "entry.ts"), WATCH_ENTRY);
  await writeFile(path.join(watchDir, "App.tsx"), WATCH_APP_DEMO);
  // The watch UI uses wrst's JSX dialect (jsx factory + Node type), not React's,
  // so it needs its own tsconfig - else the RN app's react-jsx config errors on
  // every wrst component. tsserver picks the nearest tsconfig for watch/ files.
  await writeFile(
    path.join(watchDir, "tsconfig.json"),
    JSON.stringify(
      { extends: "@wrst/core/tsconfig.base.json", include: ["**/*.ts", "**/*.tsx"] },
      null,
      2,
    ) + "\n",
  );
  await excludeFromRootTsconfig(t.dir, "watch");
  console.log(
    "  → Watch UI: wrote wrst.config.ts + watch/{entry.ts,App.tsx,tsconfig.json}",
  );
}

// Keep the RN app's `tsc` from type-checking the watch/ source (wrst's JSX
// dialect, not React's) by adding it to the root tsconfig's exclude. No-op if
// there's no root tsconfig or it's already there / not parseable as JSON. The
// editor already uses watch/tsconfig.json for those files.
async function excludeFromRootTsconfig(
  dir: string,
  name: string,
): Promise<void> {
  const p = path.join(dir, "tsconfig.json");
  if (!existsSync(p)) return;
  try {
    const j = JSON.parse(await readFile(p, "utf8"));
    const exclude: string[] = Array.isArray(j.exclude)
      ? j.exclude
      : (j.exclude = []);
    if (!exclude.includes(name)) {
      exclude.push(name);
      await writeFile(p, JSON.stringify(j, null, 2) + "\n");
    }
  } catch {
    /* leave a malformed / JSONC tsconfig alone */
  }
}

// Step 10: wire the phone project - add the deps + npm scripts (non-destructive:
// only adds what's missing). @wrst/react-native is a runtime dep (the phone uses
// it); @wrst/core + @wrst/cli are dev tooling for the watch side (@wrst/core also
// provides the `wrst` bin, so `wrst` / npm run work without a global install).
async function wirePhoneProject(t: CompanionTarget): Promise<void> {
  const pkgPath = path.join(t.dir, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  pkg.dependencies ??= {};
  pkg.devDependencies ??= {};
  pkg.scripts ??= {};
  let changed = false;

  const known = (name: string) =>
    pkg.dependencies[name] || pkg.devDependencies[name];
  const addDep = (
    bucket: Record<string, string>,
    name: string,
    ver: string,
  ) => {
    if (!known(name)) {
      bucket[name] = ver;
      changed = true;
    }
  };
  addDep(pkg.dependencies, "@wrst/react-native", "^0.1.0");
  addDep(pkg.devDependencies, "@wrst/core", "^0.1.0");
  addDep(pkg.devDependencies, "@wrst/cli", "^0.1.0");
  // Expo gets the watch-target plugin so a plain `npm install` pulls it (no
  // separate `npm i -D @bacons/apple-targets` step). Pin it yourself later.
  if (t.isExpo) addDep(pkg.devDependencies, "@bacons/apple-targets", "*");

  const addScript = (k: string, v: string) => {
    if (!pkg.scripts[k]) {
      pkg.scripts[k] = v;
      changed = true;
    }
  };
  addScript("wrst:start", "wrst start");
  addScript("wrst:run:wear-os", "wrst run:wear-os"); // debug + dev server
  addScript("wrst:build:wear-os", "wrst build:wear-os"); // debug build only (no install)
  addScript("wrst:build-release:wear-os", "wrst build-release:wear-os"); // release, offline

  if (changed) await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(
    changed
      ? "  → Phone project: added wrst deps + npm scripts to package.json"
      : "  → Phone project: wrst deps + scripts already present",
  );
}

export async function initCompanion(projectPath: string): Promise<void> {
  const dir = path.resolve(projectPath || ".");
  const target = detectTarget(dir); // exits on any validation failure
  printSummary(target);

  // Wear OS is always automated.
  await scaffoldWearOs(target);

  // Apple Watch: Expo config-plugin path vs bare-RN files+docs.
  if (target.isExpo) {
    await scaffoldAppleWatchExpo(target);
  } else {
    if (!target.hasIos) {
      console.log(
        "  Note: no ios/ dir found. For bare RN the Apple Watch files go into ios/ -\n" +
          "  run this after `npx react-native init` has created it (or use Expo).",
      );
    }
    await scaffoldAppleWatchBare(target);
  }

  // Watch UI source (wrst.config + watch/) and phone-project wiring (deps + scripts).
  await scaffoldWatchSource(target);
  await wirePhoneProject(target);

  console.log("\n  Next:");
  console.log("    1. npm install                      # pull the new deps");
  console.log(
    "    2. npm run wrst:start               # dev server (watch UI live reload)",
  );
  console.log("    3. build the watch apps:");
  console.log("         • Wear OS:     npm run wrst:run:wear-os");
  if (target.isExpo) {
    console.log(
      "         • Apple Watch: npx expo run:ios   (prebuilds the watch target automatically)",
    );
  } else {
    console.log(
      "         • Apple Watch: add the target in Xcode (apple-watch/APPLE_WATCH_SETUP.md)",
    );
  }
  console.log(
    '    4. in your RN code: import { Companion } from "@wrst/react-native"',
  );
  console.log("       (edit the watch UI in watch/App.tsx)\n");
}
