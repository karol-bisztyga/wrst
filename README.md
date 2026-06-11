# wrst

Build **smartwatch apps** with TypeScript and JSX - one codebase that runs on
**Wear OS** and **Apple Watch**.

You write React-style components; wrst bundles them, runs them inside QuickJS
embedded in a tiny native host, and renders the result with the platform's native
UI toolkit (Jetpack Compose on Wear OS, SwiftUI on Apple Watch).

> Early-stage. The core works end-to-end (dev + release on both platforms); the
> API surface is still small and evolving.

## Quickstart

```sh
npx wrst init my-app        # scaffold a project (src/, ios/, android/, wrst.config.ts)
cd my-app
npm install
npm start                   # dev server + hot reload (in one terminal)

# in another terminal, run on a watch (loads the bundle from the dev server):
npm run run:ios             # boots a watchOS simulator, builds, installs, launches
npm run run:android         # boots a Wear OS emulator, builds, installs, launches
```

Then edit `src/App.tsx` and watch it hot-reload on the watch.

```tsx
import {
  Text,
  Button,
  useState,
  VerticalView,
  Component,
  HorizontalView,
} from "wrst";

// Your app's root component. Components are plain functions returning a tree;
// state is reactive (useState), and the same code renders on Wear OS & Apple Watch.
const App: Component = () => {
  const [count, setCount] = useState(0);

  return (
    <HorizontalView
      style={{ verticalAlignment: "center", width: "fill", height: "fill" }}
    >
      <VerticalView style={{ horizontalAlignment: "center", width: "fill" }}>
        <Text style={{ color: "#ffffff" }}>{`Count: ${count}`}</Text>
        <Button onPress={() => setCount(count + 1)}>
          <Text style={{ color: "#FFF" }}>Increment</Text>
        </Button>
        <Button onPress={() => setCount(0)}>
          <Text style={{ color: "#F00" }}>Reset</Text>
        </Button>
      </VerticalView>
    </HorizontalView>
  );
};

export default App;
```

## Commands

Run with the `wrst` CLI (or the matching `npm run` script in a scaffolded project):

| Command              | What it does                                                    |
| -------------------- | --------------------------------------------------------------- |
| `wrst init <name>`   | Scaffold a new project in `./<name>`                            |
| `wrst start`         | Dev server + bundler with hot reload                            |
| `wrst run-ios`       | Build + install + launch on a watchOS simulator                 |
| `wrst run-android`   | Build + install + launch on a Wear OS device/emulator           |
| `wrst build-ios`     | Release build (bundle embedded, runs offline)                   |
| `wrst build-android` | Release build → APK                                             |
| `wrst sync`          | Apply `wrst.config.ts` (name, bundle id) to the native projects |
| `wrst help`          | List commands                                                   |

`run-*` / `build-*` boot a simulator/emulator if none is running.

## Configuration

`wrst.config.ts` is the source of truth for app identity. The CLI applies it to
the native projects on every `run`/`build` (and via `wrst sync`):

```ts
export default {
  name: "My App",
  entry: "src/entry.ts",
  ios: { bundleId: ".myapp" }, // leading dot: companion-style watch app
  android: { applicationId: "com.example.myapp" },
  server: { httpPort: 8081, wsPort: 8082 },
};
```

Don't hand-edit those name/id fields in Xcode/Gradle - wrst overwrites them.
Everything else in `ios/` and `android/` (icons, signing, permissions) is yours.

## How it works

```
TSX/JSX → esbuild bundle → QuickJS (in the native app) → JSON UI tree → native render
```

- **Dev:** the native app pulls the bundle from the dev server and hot-reloads.
- **Release:** the bundle is embedded in the app and loaded offline.

The runtime ships inside the `wrst` npm package - a prebuilt **AAR** for Android
and a **Swift package** for iOS - so your `ios/`/`android/` shells just reference
it from `node_modules`. The JS↔native wire format is documented in
[CONTRACT.md](./CONTRACT.md).

## Native modules (the extension hook)

The engine ships the universal, permission-light capabilities (timers, `fetch`,
`localStorage`, device info, …). For anything that needs a platform framework or
a permission - sensors, HealthKit, Bluetooth, NFC - you register a **native
module** in your own thin shell, and call it from JS. **No engine fork, no engine
rebuild** - the runtime exposes one dispatch channel and your module rides it.

**JS** (anywhere in your app):

```ts
import { callNativeModule, createNativeModule } from "wrst";

const result = callNativeModule<string>("hello"); // -> "hello from native module"

// or a typed, reusable handle:
const hello = createNativeModule<[], string>("hello");
hello();
```

Args are JSON-serialized across the bridge and the return value is JSON-parsed
back. Register the module once, in the native shell:

Registration uses the **same call shape on both platforms** -
`WrstNativeModules.register(name) { … }` - so adding a module is one register
call per side.

**Android** - `android/app/.../MainActivity.kt` (before `setContent`):

```kotlin
WrstNativeModules.register("hello") {
    Log.d("wrst", "hello from native module")
    "hello from native module"
}
```

**Apple Watch** - `ios/.../AppleWatchApp.swift` (in `init()`):

```swift
WrstNativeModules.register("hello") { _ in
    print("hello from native module")
    return "hello from native module"
}
```

The `example/` app ships exactly this under the **Native Module** menu screen.
For streaming data (e.g. sensor samples), a module calls back a registered JS
callback instead of returning - same mechanism as timers/`fetch`.

## Requirements

- **Node** 20+
- **Android:** Android SDK + a Wear OS emulator/device (`adb`, `emulator` on PATH or `ANDROID_HOME` set)
- **Apple Watch:** macOS + Xcode (with a watchOS simulator)

## Packages

| Package                       | Description                                           |
| ----------------------------- | ----------------------------------------------------- |
| [`wrst`](./packages/wrst)     | The framework you import (components, hooks, runtime) |
| [`@wrst/cli`](./packages/cli) | The `wrst` CLI + dev server                           |

## Development (this repo)

A npm-workspaces monorepo. See [CONTRACT.md](./CONTRACT.md) for the JS↔native
contract between the bundle and the native hosts.

```sh
npm install
npm run typecheck
npm run server      # dev server on the example playground
```
