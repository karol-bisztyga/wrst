import { startTracking, stopTracking } from "./tracking.ts";

type ComputedEntry = {
  id: string;
  fn: () => any;
  deps: string[];
};

const computedEntries: ComputedEntry[] = [];

type Native = {
  registerState: (id: string, value: any) => void;
  setState: (id: string, value: any) => void;
};

function native(): Native | undefined {
  return (globalThis as any).native;
}

function generateId(): string {
  let id = "";
  while (!id) id = Math.random().toString(36).slice(2);
  return id;
}

// Plain JS object (not null, not array, not a proxy/stateRef).
// These are serialized as JSON strings so Kotlin can reconstruct them as JSONObject.
function isPlainObject(v: any): v is Record<string, any> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function computed<T>(fn: () => T): T {
  startTracking();
  const value = fn();
  const deps = stopTracking();

  // No state reads - return unchanged (plain literal, Node, direct proxy).
  if (deps.length === 0) return value;

  const isPrimitive =
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean";

  // For plain objects (e.g. style props), serialize to JSON string so Kotlin
  // can store it as a string MutableState and reconstruct a JSONObject on resolve.
  // Any nested stateRefs (e.g. { backgroundColor: colorProxy }) are preserved
  // via each proxy's toJSON(), so Kotlin still resolves them reactively.
  if (!isPrimitive && !isPlainObject(value)) return value; // Node, array, etc.

  const id = generateId();

  const serialize = (v: any): any => (isPlainObject(v) ? JSON.stringify(v) : v);

  native()?.registerState(id, serialize(value));
  computedEntries.push({ id, fn: () => serialize(fn()), deps });

  return { toJSON: () => ({ __stateRef: id }) } as unknown as T;
}

export function recomputeForChanges(changedIds: Set<string>): void {
  computedEntries.forEach((c) => {
    if (c.deps.some((dep) => changedIds.has(dep))) {
      startTracking();
      const newValue = c.fn();
      const newDeps = stopTracking();
      if (newDeps.length > 0) c.deps = newDeps;
      native()?.setState(c.id, newValue);
    }
  });
}

export function clearComputedEntries(): void {
  computedEntries.length = 0;
}
