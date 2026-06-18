import { recomputeForChanges } from "./computed.ts";

type Native = {
  setState: (id: string, value: any) => void;
  getState: (id: string) => any;
};

function native(): Native | undefined {
  return (globalThis as any).native;
}

const pending = new Map<string, any>();
let depth = 0;
let onBatchEnd: ((changedIds: Set<string>) => void) | null = null;

export function setOnBatchEnd(fn: (changedIds: Set<string>) => void): void {
  onBatchEnd = fn;
}

export function beginBatch(): void {
  depth++;
}

export function endBatch(): void {
  depth--;
  if (depth === 0) {
    const changedIds = new Set<string>(pending.keys());
    pending.forEach((value, id) => native()?.setState(id, value));
    pending.clear();
    recomputeForChanges(changedIds);
    onBatchEnd?.(changedIds);
  }
}

// Flushes pending states without triggering onBatchEnd - used by effect runner
// to collect changes made by effects without re-entering the effect loop.
export function endEffectBatch(): Set<string> {
  depth--;
  const changedIds = new Set<string>(pending.keys());
  pending.forEach((value, id) => native()?.setState(id, value));
  pending.clear();
  recomputeForChanges(changedIds);
  return changedIds;
}

export function isBatching(): boolean {
  return depth > 0;
}

// unwrap state proxies passed as values (e.g. setN2(n1) should store n1's value, not the proxy)
export function resolveValue(value: any): any {
  if (value !== null && value !== undefined && typeof value === "object") {
    const v = value.valueOf?.();
    if (v !== value) return v;
  }
  return value;
}

export function scheduleUpdate<T>(
  id: string,
  update: T | ((prev: T) => T),
): void {
  if (typeof update === "function") {
    const current = pending.has(id) ? pending.get(id) : native()?.getState(id);
    pending.set(id, (update as (prev: T) => T)(current));
  } else {
    pending.set(id, resolveValue(update));
  }
}
