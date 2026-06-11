import { jsx } from "./jsx.ts";
import "./protocol.ts";
import "./functions.ts";
import "./console.ts";
import "./timers.ts";
import "./globals.ts";
import "./fetch.ts";
import "./localStorage.ts";
import "./device.ts";
import { runInitialEffects } from "./effects.ts";
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
    clearComputedEntries();
    const tree = App();
    runInitialEffects();
    return tree;
  };
}
