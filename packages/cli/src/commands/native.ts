import { execSync, spawn } from "node:child_process";
import path from "node:path";
import { existsSync, readdirSync, statSync, copyFileSync } from "node:fs";
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

export async function runAndroid(_args: string[]): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  applyConfig(cwd, config);

  const androidDir = path.join(cwd, "android");
  if (!existsSync(androidDir)) {
    console.error("wrst: no android/ project here.");
    process.exit(1);
  }
  requireTool("adb", "the Android SDK platform-tools");
  ensureAndroidDevice();

  console.log("wrst: building + installing the Wear OS app...");
  run("./gradlew installDebug", androidDir);

  const appId = config.android?.applicationId ?? "com.example.wearos";
  console.log(`wrst: launching ${appId}...`);
  run(
    `adb shell monkey -p ${appId} -c android.intent.category.LAUNCHER 1`,
    cwd,
  );
  console.log(
    "wrst: launched - run `wrst start` in another terminal for the bundle + hot reload.",
  );
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

export async function runIos(_args: string[]): Promise<void> {
  if (process.platform !== "darwin") {
    console.error("wrst: run-ios requires macOS + Xcode.");
    process.exit(1);
  }
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  applyConfig(cwd, config);

  const iosDir = path.join(cwd, "ios");
  const projName = existsSync(iosDir)
    ? readdirSync(iosDir).find((d) => d.endsWith(".xcodeproj"))
    : undefined;
  if (!projName) {
    console.error("wrst: no ios/*.xcodeproj here.");
    process.exit(1);
  }
  requireTool("xcodebuild", "Xcode");

  const project = path.join(iosDir, projName);
  const scheme = firstScheme(project);
  const udid = pickWatchSim();
  const derived = path.join(iosDir, "build");

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
    "wrst: launched - run `wrst start` in another terminal for the bundle + hot reload.",
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

export async function buildAndroid(_args: string[]): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  applyConfig(cwd, config);

  const androidDir = path.join(cwd, "android");
  if (!existsSync(androidDir)) {
    console.error("wrst: no android/ project here.");
    process.exit(1);
  }
  await embedBundle(
    cwd,
    config,
    path.join(androidDir, "app", "src", "main", "assets", "bundle.js"),
  );
  console.log("wrst: building the release APK...");
  run("./gradlew assembleRelease", androidDir);
  console.log("wrst: done → android/app/build/outputs/apk/release/");
}

export async function buildIos(_args: string[]): Promise<void> {
  if (process.platform !== "darwin") {
    console.error("wrst: build-ios requires macOS + Xcode.");
    process.exit(1);
  }
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  applyConfig(cwd, config);

  const iosDir = path.join(cwd, "ios");
  const projName = existsSync(iosDir)
    ? readdirSync(iosDir).find((d) => d.endsWith(".xcodeproj"))
    : undefined;
  if (!projName) {
    console.error("wrst: no ios/*.xcodeproj here.");
    process.exit(1);
  }
  const appFolder = readdirSync(iosDir).find(
    (d) =>
      statSync(path.join(iosDir, d)).isDirectory() && !d.endsWith(".xcodeproj"),
  );
  if (!appFolder) {
    console.error("wrst: couldn't find the app source folder under ios/.");
    process.exit(1);
  }
  await embedBundle(cwd, config, path.join(iosDir, appFolder, "bundle.js"));

  const project = path.join(iosDir, projName);
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
