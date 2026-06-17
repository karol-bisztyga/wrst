import Foundation
import WatchConnectivity

// Companion link to the paired iPhone app over WatchConnectivity (WCSession).
// The OS owns pairing/transport; we only read reachability + whether the
// counterpart app is installed, and exchange messages. Wired to the JS
// `Companion` API via RuntimeBridge. Design-identical to the Wear OS
// CompanionManager (Wearable Data Layer). See CONTRACT.md.
@MainActor
final class CompanionManager: NSObject {
    static let shared = CompanionManager()

    // Both sides agree on this dictionary key for the JSON payload. The phone-side
    // RN bridge (react-native-wrst) uses the same key.
    private static let messageKey = "wrst"

    private var session: WCSession?

    private override init() { super.init() }

    // Start the session (idempotent). Safe to call before a bundle is loaded.
    func activate() {
        guard session == nil, WCSession.isSupported() else { return }
        let s = WCSession.default
        session = s
        s.delegate = self
        s.activate()
    }

    // Current snapshot as JSON `{ available, reason }` for the JS sync read at
    // startup (native.nativeCompanionStatus). `reason` is null when available.
    func statusJSON() -> String {
        let (available, reason) = currentStatus()
        let reasonField = reason.map { "\"\($0)\"" } ?? "null"
        return "{\"available\":\(available),\"reason\":\(reasonField)}"
    }

    // The single behavior branch + an optional reason for UI text. On watchOS the
    // counterpart is always the one paired iPhone, so there's no separate "paired"
    // state - an inactive session reads as no-device.
    private func currentStatus() -> (Bool, String?) {
        guard let s = session, s.activationState == .activated else {
            return (false, "no-device")
        }
        if !s.isCompanionAppInstalled { return (false, "app-not-installed") }
        if !s.isReachable { return (false, "unreachable") }
        return (true, nil)
    }

    // Push the current status into JS (after activation / reachability changes).
    private func pushStatus() {
        RuntimeBridge.shared.companionStatus(statusJSON())
    }

    // Send a JSON-string message to the phone. Fire-and-forget; only delivered
    // when the phone is reachable (live link). Background queues come later.
    func send(_ json: String) {
        guard let s = session, s.isReachable else { return }
        s.sendMessage([Self.messageKey: json], replyHandler: nil, errorHandler: nil)
    }
}

// WCSessionDelegate is called on a background queue, so each method hops to the
// main actor (where the JS engine runs) before touching the runtime.
extension CompanionManager: WCSessionDelegate {
    nonisolated func session(_ session: WCSession,
                             activationDidCompleteWith activationState: WCSessionActivationState,
                             error: Error?) {
        Task { @MainActor in self.pushStatus() }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor in self.pushStatus() }
    }

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        guard let json = message[CompanionManager.messageKey] as? String else { return }
        Task { @MainActor in RuntimeBridge.shared.companionMessage(json) }
    }

    nonisolated func session(_ session: WCSession,
                             didReceiveMessage message: [String: Any],
                             replyHandler: @escaping ([String: Any]) -> Void) {
        replyHandler([:])
        guard let json = message[CompanionManager.messageKey] as? String else { return }
        Task { @MainActor in RuntimeBridge.shared.companionMessage(json) }
    }
}
