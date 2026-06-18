import { NativeEventEmitter, NativeModules, Platform } from "react-native";

// Phone-side companion API: the counterpart to the watch's `Companion` (from the
// `wrst` package). The OS owns pairing/transport; this only reads whether the
// watch app is reachable + installed, and exchanges messages. iOS is backed by
// WatchConnectivity (WCSession), Android by the Wearable Data Layer. The wire
// contract (capability `wrst_companion`, message path `/wrst` / dict key `wrst`,
// JSON-string payloads) is shared with the watch hosts - see CONTRACT.md.

const LINKING_ERROR =
  "@wrst/react-native: the native module 'WrstCompanion' is not linked.\n" +
  Platform.select({
    ios: "Run `pod install` in your ios/ dir and rebuild.\n",
    default: "Rebuild the app after installing.\n",
  }) +
  "Note: it has no effect in Expo Go / a web build (no native host).";

const WrstCompanion = NativeModules.WrstCompanion;

const native: any = WrstCompanion
  ? WrstCompanion
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      },
    );

const emitter = WrstCompanion ? new NativeEventEmitter(WrstCompanion) : undefined;

// Why the link is unavailable (or null when available) - for UI text only; the
// single behavior branch is `available`. Mirrors the watch-side CompanionReason.
export type CompanionReason =
  | "no-device"
  | "app-not-installed"
  | "unreachable"
  | null;

export type CompanionStatus = { available: boolean; reason: CompanionReason };

export type CompanionMessage = any;
export type Subscription = { remove: () => void };

export const Companion = {
  // Read the current link status (is the watch counterpart reachable + installed?).
  getStatus(): Promise<CompanionStatus> {
    return native.getStatus();
  },

  // Subscribe to link-status changes. Returns a subscription; call remove() to stop.
  onStatusChange(handler: (status: CompanionStatus) => void): Subscription {
    if (!emitter) throw new Error(LINKING_ERROR);
    return emitter.addListener("wrstCompanionStatus", handler);
  },

  // Send a message to the watch app. Fire-and-forget (delivered when reachable;
  // Android also queues to nearby nodes). The watch receives it via
  // `Companion.onMessage` in its bundle.
  sendMessage(message: CompanionMessage): Promise<void> {
    return native.sendMessage(JSON.stringify(message));
  },

  // Subscribe to messages pushed from the watch. Returns a subscription.
  onMessage(handler: (message: CompanionMessage) => void): Subscription {
    if (!emitter) throw new Error(LINKING_ERROR);
    return emitter.addListener("wrstCompanionMessage", (json: string) => {
      let msg: CompanionMessage;
      try {
        msg = JSON.parse(json);
      } catch {
        msg = json;
      }
      handler(msg);
    });
  },
};

export default Companion;
