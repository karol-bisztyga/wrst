// Native modules - the escape hatch for capabilities the engine doesn't ship.
//
// A host app's thin native shell registers a function by name (Kotlin:
// `WrstHost(modules = listOf(NativeModule("x") { ... }))`; Swift:
// `WrstNativeModules.shared.register("x") { ... }`). App JS reaches it here
// WITHOUT touching the engine binary. Sensors, haptics-extras, HealthKit, etc.
// are built this way; the engine only provides this one dispatch channel
// (`native.nativeModuleCall`), not a new bridge method per capability.

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

// Typed convenience wrapper for a single named module:
//   const hello = createNativeModule<[], string>("hello");
//   hello(); // -> "hello from native module"
export function createNativeModule<
  Args extends unknown[] = unknown[],
  Result = unknown,
>(name: string): (...args: Args) => Result | undefined {
  return (...args: Args) => callNativeModule<Result>(name, ...args);
}
