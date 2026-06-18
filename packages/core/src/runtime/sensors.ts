import { register, registry } from "../registry/functions.ts";

// Engine motion sensors - the promptless, built-in sensors (no permission on
// either platform). Permission-gated sensors (heart rate, etc.) are native
// modules instead. See the engine-vs-module split.
//
// Sensors are streams: you subscribe with a callback that fires per sample, and
// unsubscribe to stop. Under the hood the native host samples the hardware and
// pushes each sample back through the same callback channel timers/fetch use.

export type SensorType = "accelerometer" | "gyroscope" | "magnetometer";

// A single reading. Units are normalized so both platforms agree:
//   accelerometer - m/s²,  gyroscope - rad/s,  magnetometer - microtesla (µT).
// `timestamp` is epoch milliseconds.
export type SensorSample = {
  x: number;
  y: number;
  z: number;
  timestamp: number;
};

export type SensorSubscription = { unsubscribe: () => void };

export type SensorOptions = {
  // Requested delivery interval in ms (a hint; hardware may differ). Default 200.
  intervalMs?: number;
};

type SensorNative = {
  nativeSensorStart?: (
    type: string,
    callbackId: string,
    intervalMs: number,
  ) => void;
  nativeSensorStop?: (callbackId: string) => void;
};

function native(): SensorNative | undefined {
  return (globalThis as any).native;
}

const DEFAULT_INTERVAL_MS = 200;

// Subscribe to a motion sensor. Returns a handle; call `unsubscribe()` to stop
// (e.g. from a useEffect cleanup).
export function subscribeSensor(
  type: SensorType,
  onSample: (sample: SensorSample) => void,
  options?: SensorOptions,
): SensorSubscription {
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const id = register((sample: SensorSample) => onSample(sample));
  native()?.nativeSensorStart?.(type, id, intervalMs);
  return {
    unsubscribe() {
      registry.delete(id);
      native()?.nativeSensorStop?.(id);
    },
  };
}

// Convenience handles per sensor: `Sensors.accelerometer(cb, { intervalMs })`.
export const Sensors = {
  accelerometer: (cb: (s: SensorSample) => void, opts?: SensorOptions) =>
    subscribeSensor("accelerometer", cb, opts),
  gyroscope: (cb: (s: SensorSample) => void, opts?: SensorOptions) =>
    subscribeSensor("gyroscope", cb, opts),
  magnetometer: (cb: (s: SensorSample) => void, opts?: SensorOptions) =>
    subscribeSensor("magnetometer", cb, opts),
};
