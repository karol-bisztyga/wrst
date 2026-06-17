#!/usr/bin/env bash
# Build the Apple Watch app and run it on a watchOS simulator (the twin of
# `run:wear-os`). Picks a *valid* watch sim (prefers one already booted), builds
# against the generic watchOS Simulator destination (reliable - a specific
# `id=` destination is flaky for watch sims), then installs + launches.
# This is a stopgap until `wrst run:apple-watch` (Phase H) handles device selection.
set -euo pipefail

PROJECT="packages/apple-watch/AppleWatch.xcodeproj"
SCHEME="AppleWatch Watch App"
DERIVED="packages/apple-watch/build" # gitignored (**/build/)

# Pick a watch sim on the NEWEST installed watchOS runtime (older runtimes may be
# below the app's deployment target - those sims show in `simctl list` but get
# rejected by xcodebuild's destination list). Within that runtime, prefer a sim
# that's already booted. Mirrors the CLI's pickWatchSim. Prints "<udid> <0|1>".
PICK=$(xcrun simctl list devices available -j | node -e '
  let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
    const data = JSON.parse(s); const cands = [];
    for (const [rt, devs] of Object.entries(data.devices)) {
      const m = rt.match(/watchOS-(\d+)-(\d+)/); if (!m) continue;
      const ver = Number(m[1]) * 1000 + Number(m[2]);
      for (const d of devs) cands.push({ udid: d.udid, booted: d.state === "Booted", ver });
    }
    if (!cands.length) process.exit(2);
    // Newest runtime first; within it, a booted sim wins.
    cands.sort((a, b) => b.ver - a.ver || Number(b.booted) - Number(a.booted));
    console.log(cands[0].udid + " " + (cands[0].booted ? "1" : "0"));
  });')
[ -n "$PICK" ] || { echo "[apple-watch] no watchOS simulator available (create one in Xcode)"; exit 1; }
UDID=${PICK%% *}
BOOTED=${PICK##* }

if [ "$BOOTED" != "1" ]; then
  echo "[apple-watch] booting simulator $UDID"
  xcrun simctl boot "$UDID" || true
  xcrun simctl bootstatus "$UDID" -b >/dev/null
fi
echo "[apple-watch] target simulator: $UDID"

echo "[apple-watch] building (Debug)..."
xcodebuild -project "$PROJECT" -scheme "$SCHEME" -configuration Debug \
  -destination "generic/platform=watchOS Simulator" -derivedDataPath "$DERIVED" build

APP=$(find "$DERIVED/Build/Products" -maxdepth 2 -name "*.app" -type d | head -1)
[ -n "$APP" ] || { echo "[apple-watch] build product (.app) not found"; exit 1; }
BID=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$APP/Info.plist")

echo "[apple-watch] installing + launching $BID"
xcrun simctl install "$UDID" "$APP"
xcrun simctl launch "$UDID" "$BID"
open -a Simulator
echo "[apple-watch] launched $BID on $UDID"
