import { useEffect } from "./useEffect.ts";
import { subscribeNativeModule } from "../nativeModule.ts";

// Subscribe to a streaming native module for the lifetime of the component: it
// starts on mount and stops automatically on unmount - no manual unsubscribe.
// The hook form of subscribeNativeModule, and the module-side counterpart to
// useSensor (which is for the engine motion sensors).
//
//   useNativeModule<Reading>("heartRate", setReading, { intervalMs: 1000 });
export function useNativeModule<Event = unknown>(
  name: string,
  onEvent: (event: Event) => void,
  options?: Record<string, unknown>,
): void {
  useEffect(() => {
    const sub = subscribeNativeModule<Event>(name, onEvent, options);
    return () => sub.unsubscribe();
  }, []);
}
