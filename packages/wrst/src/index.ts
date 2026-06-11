/// <reference path="./global.d.ts" />
// The reference above pulls wrst's ambient runtime globals (setTimeout, fetch,
// console, localStorage, performance, jsx, computed) into any project that
// imports `wrst`, so they type-check with no import - see global.d.ts.

// Entry point - every app calls start(App) once from its entry file.
export { start } from "./runtime/bootstrap.ts";

// Components.
export * from "./components/index.ts";

// Hooks.
export { useState } from "./runtime/hooks/useState.ts";
export { useEffect } from "./runtime/hooks/useEffect.ts";

// Navigation.
export {
  createNavigation,
  navigate,
  useNavigation,
} from "./runtime/navigation.ts";

// App-level state.
export {
  createAppState,
  getAppState,
  setAppState,
} from "./runtime/appState.ts";

// App config + the device descriptor (both are imports, not globals).
export { createAppConfig } from "./runtime/appConfig.ts";
export { Device } from "./runtime/device.ts";

// Types.
export type {
  Component,
  Node,
  Style,
  StateRef,
  MaybeState,
} from "./runtime/types.ts";
export type { AppConfig } from "./runtime/appConfig.ts";
export type { DeviceInfo } from "./runtime/device.ts";

// NB: setTimeout / clearTimeout / setInterval / clearInterval / fetch / console /
// localStorage / performance / jsx are ambient GLOBALS (global.d.ts), not exports -
// use them with no import, like in a browser. `render` is installed on the global
// by start() for the native host; it is not part of the public API either.
