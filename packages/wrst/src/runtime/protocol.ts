// The JS↔native wire-contract version (see CONTRACT.md). Bump this on any
// breaking change to the UI tree schema, the native.* surface, the render/call
// entry points, or the reactivity protocol - and bump the supported version in
// both native hosts.
//
// Installed on the global at module-eval time, so it's present as soon as the
// host evaluates the bundle (before render()). Each host reads __WRST_PROTOCOL__
// after loading and refuses to render on a mismatch.
export const PROTOCOL_VERSION = 6;

(globalThis as any).__WRST_PROTOCOL__ = PROTOCOL_VERSION;
