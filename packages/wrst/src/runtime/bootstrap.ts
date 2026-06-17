import { jsx } from "./jsx.ts";
import "./protocol.ts";
import "./functions.ts";
import "./console.ts";
import "./timers.ts";
import "./globals.ts";
import "./fetch.ts";
import "./localStorage.ts";
import "./device.ts";
import { runInitialEffects, teardownEffects } from "./effects.ts";
import { computed, clearComputedEntries } from "./computed.ts";
import { Component } from "./types.ts";

// Wires the framework runtime into the JS host (QuickJS / JavaScriptCore) and
// registers the app's root component. Every app calls this once from its entry
// point - it installs the globals the bundle and native host depend on
// (jsx, computed, render) plus the runtime side-effect modules.
export function start(App: Component): void {
  (globalThis as any).jsx = jsx;
  (globalThis as any).computed = computed;
  (globalThis as any).render = () => {
    // A full render is a fresh mount of the current screen: unmount the previous
    // one's effects (runs their cleanups, e.g. sensor unsubscribe) first.
    teardownEffects();
    clearComputedEntries();
    const tree = App();
    runInitialEffects();
    return tree;
  };
  // First paint goes through __wrstNavRestore (see CONTRACT.md). createNavigation
  // installs a stack-aware version at import time; an app WITHOUT navigation never
  // does, so install a default that renders the single root screen - otherwise the
  // host's first paint gets an empty stack and shows nothing ("connecting...").
  if (!(globalThis as any).__wrstNavRestore) {
    (globalThis as any).__wrstNavRestore = () =>
      JSON.stringify([JSON.stringify((globalThis as any).render())]);
  }
}
