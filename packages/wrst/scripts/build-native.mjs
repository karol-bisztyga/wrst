// Populates the wrst package with the native runtimes so a consumer's scaffolded
// app can reference them from node_modules/wrst (Option B distribution):
//   wrst/wear-os/wrst-runtime.aar     ← prebuilt Android AAR
//   wrst/apple-watch/wrst-runtime/    ← iOS Swift package (source)
// Run by `prepack` at publish time (and manually during dev).
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const wrstPkg = path.join(here, "..");
const repo = path.join(wrstPkg, "..", "..");
const wearOsProj = path.join(repo, "packages", "wear-os");
const appleWatchPkgSrc = path.join(repo, "packages", "apple-watch", "wrst-runtime");

// 1) Wear OS: build the AAR and copy it in.
console.log("[build:native] building Android AAR...");
execSync("./gradlew :wrst-runtime:assembleRelease", {
  cwd: wearOsProj,
  stdio: "inherit",
});
const aar = path.join(
  wearOsProj,
  "wrst-runtime",
  "build",
  "outputs",
  "aar",
  "wrst-runtime-release.aar",
);
if (!existsSync(aar)) throw new Error(`AAR not found at ${aar}`);
mkdirSync(path.join(wrstPkg, "wear-os"), { recursive: true });
cpSync(aar, path.join(wrstPkg, "wear-os", "wrst-runtime.aar"));

// 2) Apple Watch: copy the Swift package source (skip any build output).
console.log("[build:native] copying iOS Swift package...");
const appleWatchDest = path.join(wrstPkg, "apple-watch", "wrst-runtime");
rmSync(appleWatchDest, { recursive: true, force: true });
mkdirSync(path.dirname(appleWatchDest), { recursive: true });
cpSync(appleWatchPkgSrc, appleWatchDest, {
  recursive: true,
  filter: (src) => !/(^|\/)(build|\.build|DerivedData)(\/|$)/.test(src),
});

console.log("[build:native] done → packages/wrst/{wear-os,apple-watch}");
