#!/usr/bin/env bash
# Build the Wear OS app and run it on an emulator/device (the Android twin of
# `run:apple-watch`). Boots a Wear OS AVD if none is connected, waits for it to
# finish booting, then installs + launches. Mirrors the CLI's ensureAndroidDevice.
set -euo pipefail

APP_ID="com.example.wearos"

# Is a device/emulator already online (state "device", not "offline"/"unauthorized")?
device_online() { adb devices | sed 1d | grep -q "device$"; }

# Locate the `emulator` binary (PATH, then the usual SDK locations).
find_emulator() {
  command -v emulator 2>/dev/null && return 0
  for sdk in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" "$HOME/Library/Android/sdk" "$HOME/Android/Sdk"; do
    [ -n "$sdk" ] && [ -x "$sdk/emulator/emulator" ] && { echo "$sdk/emulator/emulator"; return 0; }
  done
  return 1
}

if ! device_online; then
  EMU=$(find_emulator) || {
    echo "wrst: no Android device/emulator running, and the 'emulator' tool wasn't found." >&2
    echo "      Start one (Android Studio -> Device Manager) or set ANDROID_HOME." >&2
    exit 1
  }
  # Prefer a Wear OS AVD over a phone.
  AVD=$("$EMU" -list-avds | grep -i wear | head -1 || true)
  [ -n "$AVD" ] || AVD=$("$EMU" -list-avds | head -1 || true)
  [ -n "$AVD" ] || { echo "wrst: no Android Virtual Devices found. Create a Wear OS one in Android Studio." >&2; exit 1; }

  echo "wrst: booting Android emulator \"$AVD\"..."
  "$EMU" -avd "$AVD" >/dev/null 2>&1 &

  echo "wrst: waiting for the emulator to come online..."
  adb wait-for-device
  until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 1; done
fi

echo "wrst: building + installing the Wear OS app..."
( cd packages/wear-os && ./gradlew installDebug )

echo "wrst: launching $APP_ID..."
adb shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1
echo "wrst: launched - run \`npm run server\` in another terminal for the bundle + hot reload."
