// Populates the wrst package with the native runtimes so a consumer's scaffolded
// app can reference them from node_modules/wrst (Option B distribution):
//   wrst/android/wrst-runtime.aar   ← prebuilt Android AAR
//   wrst/ios/wrst-runtime/          ← iOS Swift package (source)
// Run by `prepack` at publish time (and manually during dev).
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const wrstPkg = path.join(here, "..");
const repo = path.join(wrstPkg, "..", "..");
const androidProj = path.join(repo, "packages", "native-android");
const iosPkgSrc = path.join(repo, "packages", "native-ios", "wrst-runtime");

// 1) Android: build the AAR and copy it in.
console.log("[build:native] building Android AAR...");
execSync("./gradlew :wrst-runtime:assembleRelease", {
  cwd: androidProj,
  stdio: "inherit",
});
const aar = path.join(
  androidProj,
  "wrst-runtime",
  "build",
  "outputs",
  "aar",
  "wrst-runtime-release.aar",
);
if (!existsSync(aar)) throw new Error(`AAR not found at ${aar}`);
mkdirSync(path.join(wrstPkg, "android"), { recursive: true });
cpSync(aar, path.join(wrstPkg, "android", "wrst-runtime.aar"));

// 2) iOS: copy the Swift package source (skip any build output).
console.log("[build:native] copying iOS Swift package...");
const iosDest = path.join(wrstPkg, "ios", "wrst-runtime");
rmSync(iosDest, { recursive: true, force: true });
mkdirSync(path.dirname(iosDest), { recursive: true });
cpSync(iosPkgSrc, iosDest, {
  recursive: true,
  filter: (src) => !/(^|\/)(build|\.build|DerivedData)(\/|$)/.test(src),
});

console.log("[build:native] done → packages/wrst/{android,ios}");
