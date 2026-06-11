// Ambient runtime environment for wrst apps.
//
// wrst apps run inside QuickJS - NOT a browser and NOT Node. The framework
// installs the functions below on the global object (see runtime/timers.ts,
// fetch.ts, console.ts, localStorage.ts, globals.ts, bootstrap.ts), so app code
// uses them WITHOUT importing - like `setTimeout`/`fetch`/`console` in a browser.
//
// These signatures are the single source of truth: they describe wrst's actual
// implementations (e.g. setTimeout returns a string id, not a Node Timeout),
// which is why apps drop the DOM/Node libs and rely on this file instead.
//
// This is a global (non-module) declaration file - no top-level import/export.

interface WrstFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface WrstFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<any>;
  text(): Promise<string>;
}

// --- timers (return a string id; pass that id to the matching clear*) ---
declare function setTimeout(fn: () => void, delay?: number): string;
declare function clearTimeout(id: string): void;
declare function setInterval(fn: () => void, delay: number): string;
declare function clearInterval(id: string): void;

// --- networking ---
declare function fetch(
  url: string,
  options?: WrstFetchOptions,
): Promise<WrstFetchResponse>;

// --- microtask + timing ---
declare function queueMicrotask(fn: () => void): void;
declare const performance: { now(): number };

// --- logging (routed to the native host) ---
declare const console: {
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  info(...args: any[]): void;
};

// --- persistent key/value storage (backed by the native host) ---
declare const localStorage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
};

// --- framework globals ---
// JSX factory (tsconfig jsxFactory: "jsx"), installed by start().
declare function jsx(type: any, props: any, ...children: any[]): any;
// Wraps a derived value so the renderer tracks its state dependencies.
declare function computed<T>(fn: () => T): T;

declare namespace JSX {
  interface IntrinsicElements {
    [elem: string]: any;
  }
}
