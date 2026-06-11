type DeviceNative = { nativeDeviceInfo?: () => string };

function native(): DeviceNative | undefined {
  return (globalThis as any).native;
}

export type DeviceInfo = {
  platform: "wear-os" | "apple-watch";
  shape: "rect" | "round";
  dimensions: { width: number; height: number };
};

// Read once at startup from the native host (values are static per device).
function loadDevice(): DeviceInfo {
  const raw = native()?.nativeDeviceInfo?.();
  if (raw) {
    try {
      return JSON.parse(raw) as DeviceInfo;
    } catch {}
  }
  return {
    platform: "wear-os",
    shape: "rect",
    dimensions: { width: 0, height: 0 },
  };
}

const info = loadDevice();
Object.freeze(info.dimensions);

// Read-only value, mirroring React Native's Platform/Dimensions.
// Import it explicitly: `import { Device } from "wrst"` - it is NOT a global.
export const Device: DeviceInfo = Object.freeze(info);
