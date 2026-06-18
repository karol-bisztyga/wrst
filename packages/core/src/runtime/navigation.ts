import { Component } from "./types.ts";

type NavNative = {
  nativeNavigate: () => void;
  nativeGoBack?: () => void;
  nativeSetShowHeader?: (show: boolean) => void;
};

function native(): NavNative | undefined {
  return (globalThis as any).native;
}

type Routes = Record<string, Component>;

type Config = {
  initial: string;
  routes: Routes;
  /**
   * Show the navigation header bar above each screen.
   *
   * ⚠️ **Apple Watch only.** Wear OS has no navigation header (screens are
   * always full-screen), so this is ignored there.
   *
   * @default true
   */
  showHeader?: boolean;
  /**
   * Persist the navigation stack across app launches / bundle reloads.
   *
   * When on, the whole stack is saved to `localStorage` on every navigation and
   * restored on the next launch (so the app reopens on the screen you left).
   * If the saved stack is incompatible with the current routes (a route was
   * removed/renamed, or the data is corrupt) it's cleared and the app starts at
   * `initial`.
   *
   * **Always on in debug** regardless of this flag, so live reload keeps you on
   * the current screen instead of resetting to `initial`.
   *
   * @default false
   */
  persistCurrentScreen?: boolean;
};

const STORAGE_KEY = "__wrst_nav_stack__";

let config: Config | null = null;
let stack: string[] = [];
let currentRoute = "";
let persistEnabled = false;

function isDebug(): boolean {
  return (globalThis as any).__WRST_DEBUG__ === true;
}

function storage() {
  return (globalThis as any).localStorage as
    | {
        getItem(k: string): string | null;
        setItem(k: string, v: string): void;
        removeItem(k: string): void;
      }
    | undefined;
}

// Read + validate the persisted stack. Returns null (and clears storage) when
// it's missing, corrupt, or references a route this bundle no longer has.
function restoreStack(cfg: Config): string[] | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (
      Array.isArray(arr) &&
      arr.length > 0 &&
      arr.every((r) => typeof r === "string" && !!cfg.routes[r])
    ) {
      return arr;
    }
  } catch {
    /* fall through to clear */
  }
  store.removeItem(STORAGE_KEY);
  return null;
}

function persistStack(): void {
  if (!persistEnabled) return;
  storage()?.setItem(STORAGE_KEY, JSON.stringify(stack));
}

export function createNavigation(cfg: Config): void {
  if (config !== null) throw new Error("createNavigation already called");
  config = cfg;
  // Debug forces persistence on (keeps the current screen across live reloads);
  // in release it follows the flag (default off).
  persistEnabled = isDebug() || (cfg.persistCurrentScreen ?? false);

  const restored = persistEnabled ? restoreStack(cfg) : null;
  stack = restored ?? [cfg.initial];
  currentRoute = stack[stack.length - 1];
  persistStack();

  (globalThis as any).__wrstNavRestore = navRestore;

  native()?.nativeSetShowHeader?.(cfg.showHeader ?? true);
}

export function navigate(name: string): void {
  if (!config) throw new Error("createNavigation not called");
  if (!config.routes[name]) throw new Error(`Unknown route: "${name}"`);
  stack.push(name);
  currentRoute = name;
  persistStack();
  native()?.nativeNavigate();
}

// Go back one screen programmatically. Asks the host to pop its view stack; the
// host then drives the JS stack back down via __wrstBack (the same path a native
// swipe/system back takes), so there's a single source of truth and no
// double-pop. No-op at the root.
export function goBack(): void {
  if (!config) throw new Error("createNavigation not called");
  if (stack.length <= 1) return;
  native()?.nativeGoBack?.();
}

export function useNavigation(): { Screen: Component; route: string } {
  if (!config) throw new Error("createNavigation not called");
  return { Screen: config.routes[currentRoute], route: currentRoute };
}

// Native entry point: called by the host after it pops a screen (swipe/system
// back, or in response to goBack()) to keep the JS stack in sync and re-persist.
// Root is never popped. Returns the new top route. See CONTRACT.md.
export function navBack(): string {
  if (stack.length > 1) {
    stack.pop();
    currentRoute = stack[stack.length - 1];
    persistStack();
  }
  return currentRoute;
}
(globalThis as any).__wrstBack = navBack;

// Native entry point used at load time to rebuild its view stack. Renders every
// level of the (possibly restored) stack bottom-first, leaving currentRoute at
// the top, and returns a JSON array of per-level tree-JSON strings. For a normal
// fresh start the stack is [initial], so this returns a single tree. See
// CONTRACT.md / PROTOCOL_VERSION.
export function navRestore(): string {
  const render = (globalThis as any).render as (() => unknown) | undefined;
  if (!render) return JSON.stringify([]);
  const trees = stack.map((route) => {
    currentRoute = route;
    return JSON.stringify(render());
  });
  return JSON.stringify(trees);
}
