# wrst JS ↔ native contract

This is the wire contract between the JS bundle (running in QuickJS) and a native
host (Wear OS / Apple Watch). **Both native hosts must implement it identically.**
It is the single source of truth that lets the npm package and the prebuilt native
binaries version independently - see [Protocol version](#protocol-version).

If you change anything here in a breaking way, **bump `PROTOCOL_VERSION`** (in
`packages/wrst/src/runtime/protocol.ts`) and the supported version in both hosts.

## Overview

```
render()  ──────────────►  UI tree (JSON)  ──► native renders
          ◄──── getState(id) ───────────────   (resolve reactive values)
event ──► call(handlerId) ──► handler runs ──► setState(id, value) ──► native re-renders deps
```

- The JS side is pure/synchronous. Anything stateful, async, or platform-specific
  (timers, network, storage, the actual state store) lives on the **native** side
  and is reached through the `native.*` bridge.
- The native side owns the **authoritative state store**. JS holds only ids.

## Protocol version

The bundle installs a global on load:

```js
globalThis.__WRST_PROTOCOL__ = <integer>   // currently 6
```

Before evaluating the bundle, the host installs `globalThis.__WRST_DEBUG__`
(`boolean`) - `true` for a debug build (Android: app `FLAG_DEBUGGABLE`; iOS:
`#if DEBUG`), `false` otherwise. The framework reads it at `createNavigation`
time to force `persistCurrentScreen` on in debug.

Each native host hard-codes the version it implements. **After evaluating the
bundle**, the host reads `__WRST_PROTOCOL__` and compares:

- equal → proceed.
- missing or different → surface a clear error (do **not** render), e.g.
  _"wrst protocol mismatch: bundle vN, runtime vM - update the app / framework."_

Bump the version on any breaking change to: the tree schema, the `native.*`
surface, the entry points, or the reactivity protocol below.

## Entry points (native → JS)

The host calls these globals (installed by `start()` / framework bootstrap):

| Global             | Signature                                      | Purpose                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `render`           | `() => Node`                                   | Returns the current UI tree. Host does `JSON.stringify(render())`. Call it for the initial render and to obtain structural updates.                                                                                                                                                                                                                                                                                  |
| `call`             | `(id: string, ...args) => string \| undefined` | Invokes a registered callback by id (button press, timer fire, fetch resolve/reject). Return value is `JSON.stringify`'d (often `undefined`).                                                                                                                                                                                                                                                                        |
| `__wrstNavRestore` | `() => string` _(added in protocol v5)_        | Called **once at load** instead of `render()` for the first paint. Renders every level of the navigation stack bottom-first and returns a JSON array of per-level tree-JSON strings (`["{...}", ...]`), leaving the current route at the top. The host uses `[0]` as the root screen and the rest as the pushed back-stack - `[root]` for a fresh start, or the whole path when `persistCurrentScreen` restored one. |
| `__wrstBack`       | `() => string` _(added in protocol v6)_        | Called by the host **after it pops a screen** (user swipe / system back, or in response to `native.nativeGoBack`). Pops the JS navigation stack to match, re-persists it, and returns the new top route. No-op at the root. Single source of truth: the host pops its view, then calls this - JS never pops on its own.                                                                                              |

## UI tree schema (JSON)

`render()` returns a `Node`:

```ts
Node =
  | { type: string; props: Record<string, any>; children: Node[] }  // element
  | string | number | boolean                                       // text/leaf
  | Callback                                                         // (rare) raw fn
```

- `type` - component name (`"View"`, `"Text"`, `"Button"`, `"VerticalView"`,
  `"HorizontalView"`, `"List"`, `"ScrollView"`, `"ScalingScrollView"`, `"Icon"`, `"Progress"`, `"Image"`, ...).
  The host switches on this and renders the platform equivalent. (`Icon` props:
  `name` mapped to SF Symbols / Material icons, plus `size`, `color`. `Progress`
  props: optional `value` 0..1 for determinate, else indeterminate; `size`, `color`.
  `Image` props: `src` is either a URL (has `://`) or a project-local asset name.
  Local names resolve - in dev - to the dev server's `/assets/<name>` (served from
  the project's assets folder, no rebuild) and - in release - to an embedded
  resource (`file:///android_asset/wrst-assets/` / the iOS bundle). The native
  async loader (Coil / NSCache-backed) fetches + caches it. Plus `resizeMode`
  (`fit`/`cover`/`stretch`) and `loader` (a Node shown while loading); size via `style`.)
- `props` - arbitrary; may contain **state refs** and **callback ids** (below).
  A top-level `animate: true` (currently on `View`) tells the host to ease
  animatable style changes (size/backgroundColor/opacity/offset/borderRadius)
  instead of snapping - native-driven (Compose `animate*AsState` / SwiftUI
  `.animation`), no JS frame loop.
- `children` - array of `Node`.

### State refs (reactive values)

A reactive value appears in `props`/`children` as a placeholder object:

```json
{ "__stateRef": "<id>" }
```

The host resolves it by reading the current value of that id from its state store
(`getState(id)` equivalent on the native side) and **must track which view read
which id**, so that a later `setState(id, ...)` re-renders exactly those views.

### Callback ids

Event props (e.g. `Button.onPress`) serialize to a **callback id string**. On the
event, the host calls `call(id)`; the handler runs in JS (and typically issues
`setState`s).

### Style/prop serialization

Some values are pre-serialized to strings before crossing the bridge and both
hosts must parse them identically: colors (`#RGB`/`#RRGGBB`/`rgb()`/`rgba()` →
`"R,G,B,A"`), padding shorthand → `"T,R,B,L"`. (See each host's `parsers/`.)

A few style props cross as nested objects (both hosts parse them identically):

- `gradient`: `{ type?: "linear"|"radial", colors: string[], direction?: "vertical"|"horizontal"|"diagonal" }`
  - needs 2+ colors; takes precedence over `backgroundColor`; `direction` is linear-only.
- `shadow`: `{ color?: string, radius?: number, x?: number, y?: number }` - a drop shadow.

## Reactivity protocol

The native side is the state store. The JS↔native dance:

1. **Mount** - `useState(initial)` → `native.registerState(id, initial)`. JS keeps
   only `id` (and a proxy whose `toJSON` emits `{ __stateRef: id }`).
2. **Read** - resolving a state value calls `native.getState(id)`. In the tree it
   appears as `{ __stateRef: id }`; the host resolves + dependency-tracks it.
3. **Event** - host calls `call(handlerId)`. The handler mutates state.
4. **Write** - `setState`/state updates call `native.setState(id, value)`. Writes
   inside one `call` are **batched** (collected, then flushed together at the end of
   the call), so a multi-`setState` handler triggers one coherent update.
5. **Re-render** - `native.setState` updates the cell; the host re-renders the views
   that read that id (and JS re-evaluates `render()` when structure may have changed).

## The `native.*` bridge (JS → native)

The host installs `globalThis.native` with **all** of:

### State (reactivity core)

| Function        | Signature                          | Notes                                     |
| --------------- | ---------------------------------- | ----------------------------------------- |
| `registerState` | `(id: string, value: any) => void` | Create a cell with an initial value.      |
| `setState`      | `(id: string, value: any) => void` | Update a cell → re-render its dependents. |
| `getState`      | `(id: string) => any`              | Read current value.                       |

### Logging

| Function                 | Signature                                                    |
| ------------------------ | ------------------------------------------------------------ |
| `log` / `warn` / `error` | `(parts: string[]) => void` (args pre-serialized to strings) |

### Timers

Native schedules; **on fire it calls `globalThis.call(id)`**.
| Function | Signature |
|---|---|
| `nativeSetTimeout` | `(id: string, delay: number) => void` |
| `nativeClearTimeout` | `(id: string) => void` |
| `nativeSetInterval` | `(id: string, delay: number) => void` |
| `nativeClearInterval` | `(id: string) => void` |

### Networking

| Function      | Signature                                                                         |
| ------------- | --------------------------------------------------------------------------------- |
| `nativeFetch` | `(url: string, optionsJson: string, resolveId: string, rejectId: string) => void` |

Native performs the request, then `call(resolveId, response)` or
`call(rejectId, errorString)`. The `response` object: `{ ok: boolean, status: number,
statusText: string, rawBody: string, jsonBody?: any }`.

### Storage (localStorage)

| Function              | Signature                              |
| --------------------- | -------------------------------------- |
| `nativeStorageGet`    | `(key: string) => string \| null`      |
| `nativeStorageSet`    | `(key: string, value: string) => void` |
| `nativeStorageRemove` | `(key: string) => void`                |
| `nativeStorageClear`  | `() => void`                           |

### Device / timing

| Function           | Signature      | Notes                                                                                                 |
| ------------------ | -------------- | ----------------------------------------------------------------------------------------------------- |
| `nativeDeviceInfo` | `() => string` | JSON: `{ platform: "wear-os"\|"apple-watch", shape: "rect"\|"round", dimensions: { width, height } }` |
| `performanceNow`   | `() => number` | Monotonic ms since start.                                                                             |

### Navigation / config

| Function              | Signature                                       | Notes                                                                                                                                                                       |
| --------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nativeNavigate`      | `() => void`                                    | Push a nav frame + re-render (the active route comes from the tree).                                                                                                        |
| `nativeGoBack`        | `() => void` _(optional, added in protocol v6)_ | Pop one nav frame. The host pops its view stack and then calls `__wrstBack` to sync JS. Backs the public `goBack()`; the same view-pop path a user swipe/system back takes. |
| `nativeSetShowHeader` | `(show: boolean) => void` _(optional)_          | Apple Watch only; Wear OS may omit / no-op.                                                                                                                                 |
| `nativeSetAppConfig`  | `(backgroundColor: string) => void`             | Apply app config. Invalid colors throw on the native side (surfaced as an error).                                                                                           |

> Functions are called via optional chaining (`native?.x`), so a host that hasn't
> implemented an **optional** one (e.g. `nativeSetShowHeader`) degrades gracefully.
> The non-optional ones above are **required**.

### Native modules (extension hook) - _added in protocol v2_

One generic dispatch channel lets a host's thin native shell expose extra native
capabilities (sensors, haptics-extras, HealthKit, ...) **without changing the
engine binary**. The engine ships only this single function; the actual modules
are registered by the shell with the same call on both platforms -
`WrstNativeModules.register(name) { ... }` (Kotlin object / Swift static).

| Function           | Signature                                            | Notes                                                                                                                                    |
| ------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `nativeModuleCall` | `(name: string, argsJson: string) => string \| null` | Look up the module `name`; call it with the JSON-decoded args; return its JSON-encoded result (or `null` if no such module / no result). |

JS reaches this via the public `callNativeModule(name, ...args)` /
`getNativeModule(name)` API: it `JSON.stringify`s the args array, calls
`native.nativeModuleCall`, and `JSON.parse`s the result.

**Streaming modules** (e.g. permission-gated sensors): JS uses
`subscribeNativeModule(name, onEvent, options)`, which calls the module with
`{ action: "start", callbackId, ...options }` (and `{ action: "stop", callbackId }`
on unsubscribe). The module then pushes each event to that callback id via the
host's `WrstNativeModules.emit(callbackId, json)`, which routes through
`globalThis.call(id, payload)` - the same channel timers/fetch/engine-sensors use.

### Engine sensors - _added in protocol v3_

The promptless built-in motion sensors (accelerometer / gyroscope /
magnetometer). Permission-gated sensors (heart rate, etc.) are native modules
instead. Sampling is a stream: native delivers each sample via
`call(callbackId, sample)`.

| Function            | Signature                                                        |
| ------------------- | ---------------------------------------------------------------- |
| `nativeSensorStart` | `(type: string, callbackId: string, intervalMs: number) => void` |
| `nativeSensorStop`  | `(callbackId: string) => void`                                   |

`type` is `"accelerometer" \| "gyroscope" \| "magnetometer"`. The sample object
passed to `call` is `{ x, y, z, timestamp }` with **normalized units** (both
platforms agree): accelerometer **m/s²**, gyroscope **rad/s**, magnetometer
**µT**; `timestamp` is epoch ms. JS reaches this via the public
`subscribeSensor(type, cb, { intervalMs })` / `Sensors.accelerometer(cb)` API.

### Runtime permissions - _added in protocol v4_

Request a permission at run time and read its status. `name` is a logical
permission from the wrst.config catalog (`heartRate`, `activity`, `location`,
`microphone`, `bluetooth`, `notifications`); each host maps it to the platform
permission(s).

| Function                  | Signature                                   | Notes                                                                  |
| ------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| `nativePermissionStatus`  | `(name: string) => string`                  | Sync. Returns `"granted"\|"denied"\|"undetermined"` without prompting. |
| `nativePermissionRequest` | `(name: string, resolveId: string) => void` | Shows the system dialog, then `call(resolveId, status)`.               |

JS reaches these via `getPermissionStatus(name)` (sync) and
`requestPermission(name)` (Promise). Android handles the whole catalog uniformly;
iOS is per-framework (currently `activity`/CoreMotion; others report
`"undetermined"`).

## Dev transport (server ↔ host)

Used only during development (hot reload). Not part of the runtime contract, but
both hosts implement the client side.

- **HTTP** `GET /bundle.js` (and `/bundle.min.js`):
  - `200` + body → the bundle (authoritative).
  - `422` + body → a build error message to display instead of rendering.
  - `503` → no bundle built yet; wait.
- **WebSocket** (`:8082`):
  - Host → server on connect: `{ "type": "hello", "name": "<device name>" }`.
  - Host → server (debug only): `{ "type": "log", "level": "log"|"warn"|"error", "message": string }`
    - forwarded `console.*` calls; the dev server streams them to its console.
  - Server → host: `"reload"` - a nudge to re-`GET /bundle.js` (HTTP is the source of truth).
