import { recordRead } from "./tracking.ts";
import { recomputeForChanges } from "./computed.ts";

// Companion: phone↔watch link for apps that run as a companion to a React
// Native phone app (iOS + Apple Watch via WatchConnectivity / Android + Wear OS
// via the Wearable Data Layer). The OS owns pairing; this API only reads the
// link status and exchanges messages. Identical surface on both platforms - the
// native hosts implement it design-identically. See CONTRACT.md.
//
// Typical 3-tier pattern in an app:
//   1. if Companion.isCompanionAvailable → sendMessage(...) and let the phone answer
//   2. else fetch() directly from the watch
//   3. else fall back to a cached value in localStorage

type CompanionNative = {
  registerState: (id: string, value: any) => void;
  setState: (id: string, value: any) => void;
  getState: (id: string) => any;
  // Returns JSON: { available: boolean, reason: string | null }. Read once at
  // startup; thereafter the host pushes changes via __wrstCompanionStatus.
  nativeCompanionStatus?: () => string;
  // Send a message to the paired phone app (fire-and-forget). `json` is the
  // JSON-serialized message payload.
  nativeCompanionSend?: (json: string) => void;
};

function native(): CompanionNative | undefined {
  return (globalThis as any).native;
}

// Why the link is unavailable - drives optional UI text only; the single
// behavior branch is `isCompanionAvailable`. `null` when available.
//   no-device          - no connected/paired device right now
//   app-not-installed  - the counterpart phone app isn't installed
//   unreachable        - paired + installed but not reachable this moment
export type CompanionReason =
  | "no-device"
  | "app-not-installed"
  | "unreachable"
  | null;

// Fixed state-cell ids (the reactivity backbone - native holds the values and
// re-resolves any tree node that read them when they change).
const AVAILABLE_ID = "__wrst_companion_available__";
const REASON_ID = "__wrst_companion_reason__";

function readInitialStatus(): { available: boolean; reason: CompanionReason } {
  try {
    const raw = native()?.nativeCompanionStatus?.();
    if (raw) {
      const s = JSON.parse(raw);
      return { available: !!s.available, reason: (s.reason ?? null) as CompanionReason };
    }
  } catch {
    /* fall through to the default below */
  }
  return { available: false, reason: "no-device" };
}

const initial = readInitialStatus();
native()?.registerState(AVAILABLE_ID, initial.available);
native()?.registerState(REASON_ID, initial.reason);

// A reactive getter proxy, mirroring useState/appState: serializes to a stateRef
// in JSX (toJSON) and unwraps to the live value in plain JS (valueOf/toString/
// Symbol.toPrimitive), recording the read so dependent computed()s recompute.
function makeProxy<T>(id: string, fallback: T): T {
  const get = (): T => {
    recordRead(id);
    const value = native()?.getState(id);
    return (value ?? fallback) as T;
  };
  return new Proxy({} as any, {
    get(_t, prop) {
      if (prop === "toJSON") return () => ({ __stateRef: id });
      if (prop === "valueOf") return get;
      if (prop === "toString") return () => String(get());
      if (prop === Symbol.toPrimitive) return () => get();
      const current = get();
      if (current === null || typeof current !== "object") return undefined;
      const v = (current as any)[prop];
      return typeof v === "function" ? v.bind(current) : v;
    },
  }) as unknown as T;
}

const availableProxy = makeProxy<boolean>(AVAILABLE_ID, false);
const reasonProxy = makeProxy<CompanionReason>(REASON_ID, "no-device");

export type CompanionMessage = any;
export type CompanionSubscription = { unsubscribe: () => void };
type MessageHandler = (message: CompanionMessage) => void;

const messageHandlers = new Set<MessageHandler>();

export const Companion = {
  // The one behavior branch: is our counterpart phone app reachable right now?
  // Reactive - use it in JSX or computed(); it updates when the link changes.
  get isCompanionAvailable(): boolean {
    return availableProxy as unknown as boolean;
  },

  // Why the link is unavailable (or null when available) - for UI text only.
  get reason(): CompanionReason {
    return reasonProxy as unknown as CompanionReason;
  },

  // Send a message to the paired phone app. Fire-and-forget; the phone answers
  // (if at all) via an incoming message delivered to onMessage handlers.
  sendMessage(message: CompanionMessage): void {
    native()?.nativeCompanionSend?.(JSON.stringify(message));
  },

  // Subscribe to messages pushed from the phone. Returns a handle; call
  // unsubscribe() to stop (e.g. from a useEffect cleanup).
  onMessage(handler: MessageHandler): CompanionSubscription {
    messageHandlers.add(handler);
    return {
      unsubscribe() {
        messageHandlers.delete(handler);
      },
    };
  },
};

// Native entry point: the host calls this with JSON { available, reason }
// whenever the link status changes, so the reactive value re-resolves and any
// dependent tree nodes recompose. See CONTRACT.md.
function applyStatus(json: string): void {
  let available = false;
  let reason: CompanionReason = "no-device";
  try {
    const s = JSON.parse(json);
    available = !!s.available;
    reason = (s.reason ?? null) as CompanionReason;
  } catch {
    return;
  }
  native()?.setState(AVAILABLE_ID, available);
  native()?.setState(REASON_ID, reason);
  recomputeForChanges(new Set([AVAILABLE_ID, REASON_ID]));
}
(globalThis as any).__wrstCompanionStatus = applyStatus;

// Native entry point: the host calls this with the JSON payload of an incoming
// message from the phone; we dispatch it to every onMessage handler.
function deliverMessage(json: string): void {
  let msg: CompanionMessage;
  try {
    msg = JSON.parse(json);
  } catch {
    msg = json;
  }
  messageHandlers.forEach((h) => h(msg));
}
(globalThis as any).__wrstCompanionMessage = deliverMessage;
