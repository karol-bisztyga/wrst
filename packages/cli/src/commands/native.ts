import { execSync, spawn } from "node:child_process";
import path from "node:path";
import {
  existsSync,
  readdirSync,
  statSync,
  copyFileSync,
  cpSync,
  rmSync,
} from "node:fs";
import { loadConfig, type WrstConfig } from "../config.ts";
import { applyConfig } from "./sync.ts";
import { bundleOnce } from "../bundler.ts";

function run(cmd: string, cwd: string): void {
  execSync(cmd, { cwd, stdio: "inherit" });
}
function query(cmd: string): string {
  return execSync(cmd, { encoding: "utf8" });
}
function requireTool(bin: string, hint: string): void {
  try {
    execSync(`command -v ${bin}`, { stdio: "ignore" });
  } catch {
    console.error(`wrst: '${bin}' not found on PATH - install ${hint}.`);
    process.exit(1);
  }
}

// ─────────────────────────── Android ───────────────────────────

export async function runWearOs(_args: string[]): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  applyConfig(cwd, config);

  const wearOsDir = path.join(cwd, "wear-os");
  if (!existsSync(wearOsDir)) {
    console.error("wrst: no wear-os/ project here.");
    process.exit(1);
  }
  requireTool("adb", "the Android SDK platform-tools");
  ensureAndroidDevice();

  // In the companion case a phone + watch emulator are both connected, and the
  // watch app shares the phone app's applicationId - so a plain installDebug
  // would also push the watch app onto the phone (signature/clobber errors).
  // Pick the Wear OS device automatically (ANDROID_SERIAL overrides) and target
  // only it for both the gradle install and the launch.
  const serial = pickWearDevice();
  if (!serial) {
    console.error(
      "wrst: couldn't identify the Wear OS device among the connected ones.\n" +
        "Set ANDROID_SERIAL=<watch-emulator> (see `adb devices`) and retry.",
    );
    process.exit(1);
  }

  console.log(`wrst: building + installing the Wear OS app on ${serial}...`);
  run(
    `./gradlew installDebug -Pandroid.injected.device.serial=${serial}`,
    wearOsDir,
  );

  const adb = `adb -s ${serial}`;

  const appId = config.android?.applicationId ?? "com.example.wearos";
  console.log(`wrst: launching ${appId}...`);
  run(
    `${adb} shell monkey -p ${appId} -c android.intent.category.LAUNCHER 1`,
    cwd,
  );
  console.log(
    "wrst: launched - run `wrst start` in another terminal for the bundle + live reload.",
  );
}

// All currently-online device serials (adb state "device").
function onlineSerials(): string[] {
  return query("adb devices")
    .split("\n")
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l.endsWith("\tdevice"))
    .map((l) => l.split("\t")[0]);
}

// A Wear OS device reports "watch" in ro.build.characteristics (phones don't).
function isWatchDevice(serial: string): boolean {
  try {
    return query(`adb -s ${serial} shell getprop ro.build.characteristics`)
      .split(",")
      .map((s) => s.trim())
      .includes("watch");
  } catch {
    return false;
  }
}

// Pick the Wear OS device to target: ANDROID_SERIAL wins; else the connected
// device whose characteristics say "watch"; else the sole device if there's only
// one; else null (ambiguous - phone + watch but neither flagged a watch).
function pickWearDevice(): string | null {
  if (process.env.ANDROID_SERIAL) return process.env.ANDROID_SERIAL;
  const serials = onlineSerials();
  const watches = serials.filter(isWatchDevice);
  if (watches.length >= 1) return watches[0];
  return serials.length === 1 ? serials[0] : null;
}

// Ensure an Android device/emulator is connected; boot an AVD if none is.
function ensureAndroidDevice(): void {
  const deviceLines = () =>
    query("adb devices")
      .split("\n")
      .slice(1)
      .map((l) => l.trim())
      .filter(Boolean);
  if (deviceLines().some((l) => l.endsWith("\tdevice"))) return;

  if (deviceLines().length === 0) {
    const emulator = findEmulator();
    if (!emulator) {
      console.error(
        "wrst: no Android device/emulator running, and the `emulator` tool wasn't found.\n" +
          "Start an emulator (Android Studio → Device Manager) or set ANDROID_HOME.",
      );
      process.exit(1);
    }
    const avds = query(`"${emulator}" -list-avds`)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (avds.length === 0) {
      console.error(
        "wrst: no Android Virtual Devices found. Create a Wear OS one in Android Studio (Device Manager).",
      );
      process.exit(1);
    }
    // Prefer a Wear OS AVD over a phone.
    const avd = avds.find((a) => /wear/i.test(a)) ?? avds[0];
    console.log(`wrst: booting Android emulator "${avd}"...`);
    spawn(emulator, ["-avd", avd], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } else {
    console.log("wrst: waiting for the Android device to come online...");
  }

  execSync("adb wait-for-device", { stdio: "ignore" });
  for (let i = 0; i < 180; i++) {
    try {
      if (query("adb shell getprop sys.boot_completed").trim() === "1") return;
    } catch {
      // device not fully up yet
    }
    execSync("sleep 1");
  }
}

// Locate the `emulator` binary (PATH or the usual SDK locations).
function findEmulator(): string | null {
  try {
    return query("command -v emulator").trim();
  } catch {
    // not on PATH
  }
  const home = process.env.HOME ?? "";
  const sdks = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(home, "Library", "Android", "sdk"),
    path.join(home, "Android", "Sdk"),
  ].filter(Boolean) as string[];
  for (const sdk of sdks) {
    const bin = path.join(sdk, "emulator", "emulator");
    if (existsSync(bin)) return bin;
  }
  return null;
}

// ───────────────────────────── iOS ─────────────────────────────

export async function runAppleWatch(_args: string[]): Promise<void> {
  if (process.platform !== "darwin") {
    console.error("wrst: run:apple-watch requires macOS + Xcode.");
    process.exit(1);
  }
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  applyConfig(cwd, config);

  const appleWatchDir = path.join(cwd, "apple-watch");
  const projName = existsSync(appleWatchDir)
    ? readdirSync(appleWatchDir).find((d) => d.endsWith(".xcodeproj"))
    : undefined;
  if (!projName) {
    console.error("wrst: no apple-watch/*.xcodeproj here.");
    process.exit(1);
  }
  requireTool("xcodebuild", "Xcode");

  const project = path.join(appleWatchDir, projName);
  const scheme = firstScheme(project);
  const udid = pickWatchSim();
  const derived = path.join(appleWatchDir, "build");

  console.log(`wrst: building the Apple Watch app (scheme "${scheme}")...`);
  // Build for a generic watch simulator (reliable) then install to the chosen
  // device - a specific `id=` destination is flaky for watch sims.
  run(
    `xcodebuild -project "${project}" -scheme "${scheme}" -configuration Debug ` +
      `-destination "generic/platform=watchOS Simulator" -derivedDataPath "${derived}" build`,
    cwd,
  );

  const app = findApp(path.join(derived, "Build", "Products"));
  const bundleId = config.ios?.bundleId ?? plistBundleId(app);
  console.log(`wrst: installing + launching ${bundleId}...`);
  run(`xcrun simctl install "${udid}" "${app}"`, cwd);
  run(`xcrun simctl launch "${udid}" "${bundleId}"`, cwd);
  run("open -a Simulator", cwd);
  console.log(
    "wrst: launched - run `wrst start` in another terminal for the bundle + live reload.",
  );
}

// ─────────────────────────── Release builds ───────────────────────────

// Bundle the app (minified) and copy it to where the release runtime loads it.
async function embedBundle(
  cwd: string,
  config: WrstConfig,
  dest: string,
): Promise<void> {
  const entry = path.resolve(cwd, config.entry ?? "src/entry.ts");
  if (!existsSync(entry)) {
    console.error(`wrst: entry not found: ${config.entry ?? "src/entry.ts"}`);
    process.exit(1);
  }
  console.log("wrst: bundling (release)...");
  await bundleOnce(entry, path.join(cwd, "dist"));
  copyFileSync(path.join(cwd, "dist", "bundle.min.js"), dest);
  console.log(`wrst: embedded bundle → ${path.relative(cwd, dest)}`);
}

// Copy project assets into the Android app so release builds load them locally
// (file:///android_asset/wrst-assets/<name>; see AssetResolver.kt).
function embedAssetsAndroid(
  cwd: string,
  config: WrstConfig,
  wearOsDir: string,
): void {
  const assetsDir = path.resolve(cwd, config.assets ?? "assets");
  if (!existsSync(assetsDir)) return;
  const dest = path.join(
    wearOsDir,
    "app",
    "src",
    "main",
    "assets",
    "wrst-assets",
  );
  rmSync(dest, { recursive: true, force: true });
  cpSync(assetsDir, dest, { recursive: true });
  console.log(`wrst: embedded assets → ${path.relative(cwd, dest)}`);
}

// Copy project assets (top-level files) flat into the iOS app folder so they
// become bundle resources (loaded by Bundle.main; see CachedAsyncImage.swift).
function embedAssetsIos(cwd: string, config: WrstConfig, appDir: string): void {
  const assetsDir = path.resolve(cwd, config.assets ?? "assets");
  if (!existsSync(assetsDir)) return;
  for (const f of readdirSync(assetsDir)) {
    const src = path.join(assetsDir, f);
    if (statSync(src).isFile()) copyFileSync(src, path.join(appDir, f));
  }
  console.log(`wrst: embedded assets → apple-watch/${path.basename(appDir)}/`);
}

export async function buildReleaseWearOs(_args: string[]): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  applyConfig(cwd, config);

  const wearOsDir = path.join(cwd, "wear-os");
  if (!existsSync(wearOsDir)) {
    console.error("wrst: no wear-os/ project here.");
    process.exit(1);
  }
  await embedBundle(
    cwd,
    config,
    path.join(wearOsDir, "app", "src", "main", "assets", "bundle.js"),
  );
  embedAssetsAndroid(cwd, config, wearOsDir);
  console.log("wrst: building the release APK...");
  run("./gradlew assembleRelease", wearOsDir);
  console.log("wrst: done → wear-os/app/build/outputs/apk/release/");
}

export async function buildReleaseAppleWatch(_args: string[]): Promise<void> {
  if (process.platform !== "darwin") {
    console.error("wrst: build-release:apple-watch requires macOS + Xcode.");
    process.exit(1);
  }
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  applyConfig(cwd, config);

  const appleWatchDir = path.join(cwd, "apple-watch");
  const projName = existsSync(appleWatchDir)
    ? readdirSync(appleWatchDir).find((d) => d.endsWith(".xcodeproj"))
    : undefined;
  if (!projName) {
    console.error("wrst: no apple-watch/*.xcodeproj here.");
    process.exit(1);
  }
  const appFolder = readdirSync(appleWatchDir).find(
    (d) =>
      statSync(path.join(appleWatchDir, d)).isDirectory() &&
      !d.endsWith(".xcodeproj"),
  );
  if (!appFolder) {
    console.error(
      "wrst: couldn't find the app source folder under apple-watch/.",
    );
    process.exit(1);
  }
  await embedBundle(
    cwd,
    config,
    path.join(appleWatchDir, appFolder, "bundle.js"),
  );
  embedAssetsIos(cwd, config, path.join(appleWatchDir, appFolder));

  const project = path.join(appleWatchDir, projName);
  const scheme = firstScheme(project);
  console.log(`wrst: building the release app (scheme "${scheme}")...`);
  run(
    `xcodebuild -project "${project}" -scheme "${scheme}" -configuration Release ` +
      `-destination "generic/platform=watchOS Simulator" build`,
    cwd,
  );
  console.log(
    "wrst: release build complete. For a device build, archive + sign in Xcode (Product → Archive).",
  );
}

// `wrst build:wear-os` - debug build only (no install); the build half of run:wear-os.
export async function buildWearOs(_args: string[]): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  applyConfig(cwd, config);
  const wearOsDir = path.join(cwd, "wear-os");
  if (!existsSync(wearOsDir)) {
    console.error("wrst: no wear-os/ project here.");
    process.exit(1);
  }
  console.log("wrst: building the debug APK...");
  run("./gradlew assembleDebug", wearOsDir);
  console.log(
    "wrst: done -> wear-os/app/build/outputs/apk/debug/app-debug.apk",
  );
}

// `wrst build:apple-watch` - debug build only (no install); the build half of run:apple-watch.
export async function buildAppleWatch(_args: string[]): Promise<void> {
  if (process.platform !== "darwin") {
    console.error("wrst: build:apple-watch requires macOS + Xcode.");
    process.exit(1);
  }
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  applyConfig(cwd, config);
  const appleWatchDir = path.join(cwd, "apple-watch");
  const projName = existsSync(appleWatchDir)
    ? readdirSync(appleWatchDir).find((d) => d.endsWith(".xcodeproj"))
    : undefined;
  if (!projName) {
    console.error("wrst: no apple-watch/*.xcodeproj here.");
    process.exit(1);
  }
  const project = path.join(appleWatchDir, projName);
  const scheme = firstScheme(project);
  console.log(`wrst: building (Debug, scheme "${scheme}")...`);
  run(
    `xcodebuild -project "${project}" -scheme "${scheme}" -configuration Debug ` +
      `-destination "generic/platform=watchOS Simulator" build`,
    cwd,
  );
  console.log("wrst: debug build complete.");
}

function firstScheme(project: string): string {
  const json = JSON.parse(
    query(`xcodebuild -list -project "${project}" -json`),
  );
  const schemes: string[] =
    json.project?.schemes ?? json.workspace?.schemes ?? [];
  if (schemes.length === 0)
    throw new Error("no schemes found in the Xcode project");
  return schemes[0];
}

// Pick a watch simulator with the newest watchOS (so the app's deployment target
// is satisfied), preferring an already-booted one; boot it if needed.
function pickWatchSim(): string {
  const data = JSON.parse(query("xcrun simctl list devices available -j"));
  const cands: { udid: string; booted: boolean; ver: number }[] = [];
  for (const [runtime, devs] of Object.entries<any>(data.devices)) {
    const m = runtime.match(/watchOS-(\d+)-(\d+)/);
    if (!m) continue;
    const ver = Number(m[1]) * 1000 + Number(m[2]);
    for (const d of devs as any[]) {
      cands.push({ udid: d.udid, booted: d.state === "Booted", ver });
    }
  }
  if (cands.length === 0) throw new Error("no watchOS simulator available");
  cands.sort((a, b) => Number(b.booted) - Number(a.booted) || b.ver - a.ver);
  const pick = cands[0];
  if (!pick.booted) {
    console.log("wrst: booting a watch simulator...");
    try {
      execSync(`xcrun simctl boot ${pick.udid}`);
    } catch {
      // already booting
    }
    execSync(`xcrun simctl bootstatus ${pick.udid} -b`, { stdio: "ignore" });
  }
  return pick.udid;
}

function findApp(productsDir: string): string {
  const hit = query(`find "${productsDir}" -maxdepth 2 -name "*.app" -type d`)
    .split("\n")
    .find(Boolean);
  if (!hit) throw new Error(`no built .app found under ${productsDir}`);
  return hit;
}

function plistBundleId(app: string): string {
  return query(
    `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${app}/Info.plist"`,
  ).trim();
}
