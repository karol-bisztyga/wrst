import { Component } from "./types.ts";

type NavNative = {
  nativeNavigate: () => void;
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
};

let config: Config | null = null;
let stack: string[] = [];
let currentRoute = "";

export function createNavigation(cfg: Config): void {
  if (config !== null) throw new Error("createNavigation already called");
  config = cfg;
  stack = [cfg.initial];
  currentRoute = cfg.initial;
  native()?.nativeSetShowHeader?.(cfg.showHeader ?? true);
}

export function navigate(name: string): void {
  if (!config) throw new Error("createNavigation not called");
  if (!config.routes[name]) throw new Error(`Unknown route: "${name}"`);
  stack.push(name);
  currentRoute = name;
  native()?.nativeNavigate();
}

export function useNavigation(): { Screen: Component; route: string } {
  if (!config) throw new Error("createNavigation not called");
  return { Screen: config.routes[currentRoute], route: currentRoute };
}
