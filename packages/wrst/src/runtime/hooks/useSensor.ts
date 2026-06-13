import { useEffect } from "./useEffect.ts";
import {
  subscribeSensor,
  type SensorType,
  type SensorSample,
  type SensorOptions,
} from "../sensors.ts";

// Subscribe to a motion sensor for the lifetime of the component: it starts on
// mount and stops automatically on unmount - no manual unsubscribe needed.
//
//   useSensor("accelerometer", (s) => setReading(s), { intervalMs: 200 });
export function useSensor(
  type: SensorType,
  onSample: (sample: SensorSample) => void,
  options?: SensorOptions,
): void {
  useEffect(() => {
    const sub = subscribeSensor(type, onSample, options);
    return () => sub.unsubscribe();
  }, []);
}
