import { isBatching, scheduleUpdate, resolveValue } from "./stateBatch.ts";
import { recordRead } from "./tracking.ts";
import { recomputeForChanges } from "./computed.ts";

type Native = {
  registerState: (id: string, value: any) => void;
  setState: (id: string, value: any) => void;
  getState: (id: string) => any;
};

function native(): Native | undefined {
  return (globalThis as any).native;
}

// Global app state is just useState with stable, namespaced ids registered
// once at createAppState time, so every component reads/writes the same
// StateRegistry entry. Reactivity is identical to useState: changes go through
// native.setState + recomputeForChanges, and only nodes reading the id recompose.
const PREFIX = "app:";

let initialized = false;
const defaults = new Map<string, any>();
const proxies = new Map<string, any>();

function readRaw(key: string): any {
  const value = native()?.getState(PREFIX + key);
  return value ?? defaults.get(key);
}

// Mirrors the useState getter proxy: serializes to a stateRef in JSX and
// unwraps to the live value in plain JS expressions.
function makeProxy(key: string): any {
  const id = PREFIX + key;
  const get = () => {
    recordRead(id);
    return readRaw(key);
  };
  return new Proxy({} as any, {
    get(_target, prop) {
      if (prop === "toJSON") return () => ({ __stateRef: id });
      if (prop === "valueOf") return get;
      if (prop === "toString") return () => String(get());
      if (prop === Symbol.toPrimitive) return () => get();
      const current = get();
      if (current === null || typeof current !== "object") return undefined;
      const value = (current as any)[prop];
      return typeof value === "function" ? value.bind(current) : value;
    },
  });
}

function assertKnown(key: string): void {
  if (!proxies.has(key)) throw new Error(`Unknown app state key: "${key}"`);
}

export function createAppState(initial: Record<string, any>): void {
  if (initialized) throw new Error("createAppState already called");
  initialized = true;
  for (const key of Object.keys(initial)) {
    const value = resolveValue(initial[key]);
    defaults.set(key, value);
    native()?.registerState(PREFIX + key, value);
    proxies.set(key, makeProxy(key));
  }
}

export function getAppState(key: string): any {
  assertKnown(key);
  return proxies.get(key);
}

export function setAppState(
  key: string,
  update: any | ((prev: any) => any),
): void {
  assertKnown(key);
  const id = PREFIX + key;
  if (isBatching()) {
    scheduleUpdate(id, update);
  } else if (typeof update === "function") {
    native()?.setState(id, (update as (prev: any) => any)(readRaw(key)));
    recomputeForChanges(new Set([id]));
  } else {
    native()?.setState(id, resolveValue(update));
    recomputeForChanges(new Set([id]));
  }
}
