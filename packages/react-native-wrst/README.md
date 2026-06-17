# react-native-wrst

The **phone-side** companion bridge for [wrst](https://www.npmjs.com/package/wrst)
watch apps. Install it in your React Native app to talk to a paired wrst watch
app (Apple Watch via **WatchConnectivity**, Wear OS via the **Wearable Data
Layer**). It's the counterpart to the watch's `Companion` API (from the `wrst`
package) - both speak the same wire contract.

```sh
npm install react-native-wrst
cd ios && pod install   # iOS only
```

Autolinked - no manual native registration. The native module has no effect in
Expo Go or on web (there's no native host); use a dev/prebuild build.

## Usage

```ts
import { Companion } from "react-native-wrst";

// Is the watch app reachable + installed right now?
const { available, reason } = await Companion.getStatus();

// React to link changes (e.g. update UI).
const sub = Companion.onStatusChange(({ available, reason }) => {
  /* ... */
});

// Send a message to the watch (received there via Companion.onMessage).
await Companion.sendMessage({ type: "ping", at: Date.now() });

// Receive messages the watch sent (e.g. a request to fetch on its behalf).
const msgSub = Companion.onMessage((msg) => {
  /* reply via sendMessage */
});

// Clean up.
sub.remove();
msgSub.remove();
```

`reason` (`"no-device" | "app-not-installed" | "unreachable" | null`) is for UI
text only - branch behavior on `available`.

## Wire contract (shared with the watch)

- Capability string **`wrst_companion`** - advertised by both sides; the Wear OS
  Data Layer uses it for discovery (bundled `res/values/wear.xml`).
- Message path **`/wrst`** (Android) / dict key **`"wrst"`** (iOS).
- Payloads are JSON strings (`sendMessage` stringifies; receivers `JSON.parse`).

See `CONTRACT.md` in the wrst repo.

## Scope

This package is just the phone-side bridge. Scaffolding the watch app into your
RN project (the `apple-watch/` + `wear-os/` folders, prebuilt xcframework/AAR,
the Expo config plugin) is handled by `wrst init --companion` - see the repo.
