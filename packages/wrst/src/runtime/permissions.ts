import { register, registry } from "../registry/functions.ts";

// Runtime permissions (layer 2): ask the user at run time and learn the result.
// Layer 1 (declaring the permission in Info.plist / AndroidManifest) is handled
// by wrst.config.ts + `wrst sync`. Names match the wrst.config permission catalog.

export type PermissionName =
  | "heartRate"
  | "activity"
  | "location"
  | "microphone"
  | "bluetooth"
  | "notifications";

export type PermissionStatus = "granted" | "denied" | "undetermined";

type PermissionNative = {
  nativePermissionStatus?: (name: string) => string;
  nativePermissionRequest?: (name: string, resolveId: string) => void;
};

function native(): PermissionNative | undefined {
  return (globalThis as any).native;
}

// Current status without prompting. Permissions that need no OS grant (or that a
// platform doesn't support) report "granted" / "undetermined" respectively.
export function getPermissionStatus(name: PermissionName): PermissionStatus {
  return (
    (native()?.nativePermissionStatus?.(name) as PermissionStatus) ??
    "undetermined"
  );
}

// Ask the user (shows the system dialog if not yet decided). Resolves with the
// resulting status. Native calls back the resolve id with the status string.
export function requestPermission(
  name: PermissionName,
): Promise<PermissionStatus> {
  return new Promise((resolve) => {
    const n = native();
    if (!n?.nativePermissionRequest) {
      resolve("undetermined");
      return;
    }
    let resolveId = "";
    resolveId = register((status: PermissionStatus) => {
      registry.delete(resolveId);
      resolve(status ?? "undetermined");
    });
    n.nativePermissionRequest(name, resolveId);
  });
}
