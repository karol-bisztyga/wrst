import Foundation

// performance.now() origin - monotonic ms since the app started, set once at
// launch via reset(), mirroring Android's JsRuntimeManager.startTime.
//
// The origin defaults to a plain 0 (not a systemUptime read), so now() never
// lazily initializes the origin during its own evaluation. That avoids the bug
// where the first call returned ~0/negative and effectively counted from first
// use instead of app start.
enum PerformanceClock {
    nonisolated(unsafe) private static var origin: TimeInterval = 0

    static func reset() {
        origin = ProcessInfo.processInfo.systemUptime
    }

    static func now() -> Double {
        (ProcessInfo.processInfo.systemUptime - origin) * 1000
    }
}
