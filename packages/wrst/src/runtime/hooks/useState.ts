import { isBatching, scheduleUpdate, resolveValue } from "../stateBatch.ts";
import { recordRead } from "../tracking.ts";
import { recomputeForChanges } from "../computed.ts";

type Native = {
  registerState: (id: string, value: any) => void;
  setState: (id: string, value: any) => void;
  getState: (id: string) => any;
};

function native(): Native | undefined {
  return (globalThis as any).native;
}

function generateId(): string {
  let id = "";
  while (!id) {
    id = Math.random().toString(36).slice(2);
  }
  return id;
}

export function useState<T>(
  initialValue: T,
): [T, (update: T | ((prev: T) => T)) => void] {
  const id = generateId();
  const resolved = resolveValue(initialValue) as T;
  native()?.registerState(id, resolved);

  const get = (): T => {
    recordRead(id);
    return (native()?.getState(id) as T) ?? resolved;
  };

  const stateValue = new Proxy({} as any, {
    get(_target, prop) {
      if (prop === "toJSON") return () => ({ __stateRef: id });
      if (prop === "valueOf") return get;
      if (prop === "toString") return () => String(get());
      if (prop === Symbol.toPrimitive) return () => get();
      const current = get();
      if (current === null || typeof current !== "object") return undefined;
      const value = (current as any)[prop];
      // bind functions to the real value so internal type checks (e.g. Array[Symbol.iterator]) pass
      return typeof value === "function" ? value.bind(current) : value;
    },
  });

  return [
    stateValue as unknown as T,
    (update: T | ((prev: T) => T)) => {
      if (isBatching()) {
        scheduleUpdate(id, update);
      } else if (typeof update === "function") {
        native()?.setState(id, (update as (prev: T) => T)(get()));
        recomputeForChanges(new Set([id]));
      } else {
        native()?.setState(id, resolveValue(update));
        recomputeForChanges(new Set([id]));
      }
    },
  ];
}
