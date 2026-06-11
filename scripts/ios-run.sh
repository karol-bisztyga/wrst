#!/usr/bin/env bash
# Build the Apple Watch app and run it on a watchOS simulator (the iOS twin of
# `android:install`). Prefers an already-booted watch sim, otherwise boots one.
# This is a stopgap until `wrst run-ios` (Phase H) handles device selection.
set -euo pipefail

PROJECT="packages/native-ios/AppleWatch.xcodeproj"
SCHEME="AppleWatch Watch App"
DERIVED="packages/native-ios/build" # gitignored (**/build/)

udid_from() { awk '/Apple Watch/{ if (match($0,/[0-9A-F-]{36}/)) { print substr($0,RSTART,RLENGTH); exit } }'; }

UDID=$(xcrun simctl list devices booted | udid_from || true)
if [ -z "${UDID:-}" ]; then
  UDID=$(xcrun simctl list devices available | udid_from)
  echo "[ios] booting simulator $UDID"
  xcrun simctl boot "$UDID"
fi
echo "[ios] target simulator: $UDID"

echo "[ios] building (Debug)..."
xcodebuild -project "$PROJECT" -scheme "$SCHEME" -configuration Debug \
  -destination "id=$UDID" -derivedDataPath "$DERIVED" build

APP=$(find "$DERIVED/Build/Products" -maxdepth 2 -name "*.app" -type d | head -1)
[ -n "$APP" ] || { echo "[ios] build product (.app) not found"; exit 1; }
BID=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$APP/Info.plist")

echo "[ios] installing + launching $BID"
xcrun simctl install "$UDID" "$APP"
xcrun simctl launch "$UDID" "$BID"
open -a Simulator
echo "[ios] launched $BID on $UDID"
