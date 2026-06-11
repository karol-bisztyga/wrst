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
globalThis.__WRST_PROTOCOL__ = <integer>   // e.g. 1
```

Each native host hard-codes the version it implements. **After evaluating the
bundle**, the host reads `__WRST_PROTOCOL__` and compares:

- equal → proceed.
- missing or different → surface a clear error (do **not** render), e.g.
  _"wrst protocol mismatch: bundle vN, runtime vM - update the app / framework."_

Bump the version on any breaking change to: the tree schema, the `native.*`
surface, the entry points, or the reactivity protocol below.

## Entry points (native → JS)

The host calls these globals (installed by `start()` / framework bootstrap):

| Global   | Signature                                      | Purpose                                                                                                                                       |
| -------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `render` | `() => Node`                                   | Returns the current UI tree. Host does `JSON.stringify(render())`. Call it for the initial render and to obtain structural updates.           |
| `call`   | `(id: string, ...args) => string \| undefined` | Invokes a registered callback by id (button press, timer fire, fetch resolve/reject). Return value is `JSON.stringify`'d (often `undefined`). |

## UI tree schema (JSON)

`render()` returns a `Node`:

```ts
Node =
  | { type: string; props: Record<string, any>; children: Node[] }  // element
  | string | number | boolean                                       // text/leaf
  | Callback                                                         // (rare) raw fn
```

- `type` - component name (`"View"`, `"Text"`, `"Button"`, `"VerticalView"`,
  `"HorizontalView"`, `"List"`, `"ScrollView"`, `"ScalingScrollView"`, ...). The host
  switches on this and renders the platform equivalent.
- `props` - arbitrary; may contain **state refs** and **callback ids** (below).
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

| Function              | Signature                              | Notes                                                                             |
| --------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| `nativeNavigate`      | `() => void`                           | Push a nav frame + re-render (the active route comes from the tree).              |
| `nativeSetShowHeader` | `(show: boolean) => void` _(optional)_ | Apple Watch only; Wear OS may omit / no-op.                                       |
| `nativeSetAppConfig`  | `(backgroundColor: string) => void`    | Apply app config. Invalid colors throw on the native side (surfaced as an error). |

> Functions are called via optional chaining (`native?.x`), so a host that hasn't
> implemented an **optional** one (e.g. `nativeSetShowHeader`) degrades gracefully.
> The non-optional ones above are **required**.

## Dev transport (server ↔ host)

Used only during development (hot reload). Not part of the runtime contract, but
both hosts implement the client side.

- **HTTP** `GET /bundle.js` (and `/bundle.min.js`):
  - `200` + body → the bundle (authoritative).
  - `422` + body → a build error message to display instead of rendering.
  - `503` → no bundle built yet; wait.
- **WebSocket** (`:8082`):
  - Host → server on connect: `{ "type": "hello", "name": "<device name>" }`.
  - Server → host: `"reload"` - a nudge to re-`GET /bundle.js` (HTTP is the source of truth).
