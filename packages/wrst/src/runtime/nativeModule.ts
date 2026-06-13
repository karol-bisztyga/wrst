// Native modules - the escape hatch for capabilities the engine doesn't ship.
//
// A host app's thin native shell registers a function by name (Kotlin:
// `WrstHost(modules = listOf(NativeModule("x") { ... }))`; Swift:
// `WrstNativeModules.shared.register("x") { ... }`). App JS reaches it here
// WITHOUT touching the engine binary. Sensors, haptics-extras, HealthKit, etc.
// are built this way; the engine only provides this one dispatch channel
// (`native.nativeModuleCall`), not a new bridge method per capability.

import { register, registry } from "../registry/functions.ts";

type NativeBridge = {
  nativeModuleCall?: (name: string, argsJson: string) => string | null;
};

function native(): NativeBridge | undefined {
  return (globalThis as any).native;
}

// Call a native module the host shell registered under `name`. Arguments are
// JSON-serialized across the bridge and the (optional) return value is
// JSON-parsed back. Returns `undefined` when no module is registered under
// `name`, or when it returns nothing.
export function callNativeModule<Result = unknown>(
  name: string,
  ...args: unknown[]
): Result | undefined {
  const raw = native()?.nativeModuleCall?.(name, JSON.stringify(args));
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as Result;
  } catch {
    return undefined;
  }
}

// Returns a typed, reusable caller bound to an (already host-registered) native
// module - it doesn't create anything, the native side does via register():
//   const hello = getNativeModule<[], string>("hello");
//   hello(); // -> "hello from native module"
export function getNativeModule<
  Args extends unknown[] = unknown[],
  Result = unknown,
>(name: string): (...args: Args) => Result | undefined {
  return (...args: Args) => callNativeModule<Result>(name, ...args);
}

export type NativeStreamSubscription = { unsubscribe: () => void };

// Subscribe to a *streaming* native module (e.g. a sensor module). The module
// is called with `{ action: "start", callbackId, ...options }`; it then pushes
// each event to that callback via the native `emit()`. `unsubscribe()` calls it
// with `{ action: "stop", callbackId }`. This is the streaming counterpart to
// callNativeModule, built on the same hook.
export function subscribeNativeModule<Event = unknown>(
  name: string,
  onEvent: (event: Event) => void,
  options?: Record<string, unknown>,
): NativeStreamSubscription {
  const callbackId = register((event: Event) => onEvent(event));
  callNativeModule(name, { action: "start", callbackId, ...(options ?? {}) });
  return {
    unsubscribe() {
      registry.delete(callbackId);
      callNativeModule(name, { action: "stop", callbackId });
    },
  };
}
