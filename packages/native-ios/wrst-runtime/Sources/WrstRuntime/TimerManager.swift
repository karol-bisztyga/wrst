import Foundation

// Mirrors JsRuntimeManager.kt's timerJobs: one cancellable task per timer id.
// Timeouts fire once then remove themselves; intervals loop until cleared. On
// fire, the registered JS callback is invoked via RuntimeBridge.call(id) - the
// same path as a button press - so any setState updates the UI reactively.
// Runs on the main actor (Task.sleep suspends without blocking) so timer
// callbacks are serialized with all other JS execution.
@MainActor
final class TimerManager {
    static let shared = TimerManager()

    private var timers: [String: Task<Void, Never>] = [:]

    func setTimeout(_ id: String, delayMs: Double) {
        timers[id]?.cancel()
        let nanos = UInt64(max(0, delayMs) * 1_000_000)
        timers[id] = Task { @MainActor in
            try? await Task.sleep(nanoseconds: nanos)
            if Task.isCancelled { return }
            timers[id] = nil
            RuntimeBridge.shared.call(id)
        }
    }

    func setInterval(_ id: String, delayMs: Double) {
        timers[id]?.cancel()
        let nanos = UInt64(max(0, delayMs) * 1_000_000)
        timers[id] = Task { @MainActor in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: nanos)
                if Task.isCancelled { break }
                RuntimeBridge.shared.call(id)
            }
        }
    }

    func clear(_ id: String) {
        timers[id]?.cancel()
        timers[id] = nil
    }

    func clearAll() {
        timers.values.forEach { $0.cancel() }
        timers.removeAll()
    }
}
