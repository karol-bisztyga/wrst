export const registry = new Map<string, Function>();

export function register(fn: Function): string {
  let id = null;
  while (!id || registry.has(id)) {
    id = Math.random().toString(36).slice(2);
  }
  registry.set(id, fn);
  return id;
}

import { beginBatch, endBatch } from "../runtime/stateBatch.ts";

export function call(id: string, ...args: any[]) {
  const fn = registry.get(id);
  if (!fn) return;
  beginBatch();
  try {
    return JSON.stringify(fn(...args));
  } finally {
    endBatch();
  }
}
