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
import { View, Text, Button, useState } from "wrst";
import type { Component } from "wrst";

const App: Component = () => {
  const [count, setCount] = useState(0);
  return (
    <View style={{ padding: 12 }}>
      <Text style={{ color: "#fff" }}>{`Count: ${count}`}</Text>
      <Button onPress={() => setCount(count + 1)}>Increment</Button>
    </View>
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
