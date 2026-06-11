import Foundation
import CQuickJS

// Mirrors JsRuntimeManager.kt - owns the QuickJS engine (via the C shim) and
// drives load / render / call. Runs on the main actor, which serializes JS
// execution (the engine is single-threaded). Engine is recreated on each load,
// matching Android's close/recreate.
@MainActor
final class JSRuntime {
    // The JS↔native wire-contract version this host implements (see CONTRACT.md).
    // Must match the bundle's globalThis.__WRST_PROTOCOL__.
    static let protocolVersion = 1

    private var bridge: OpaquePointer?
    private var onError: (String) -> Void = { _ in }

    func setErrorHandler(_ handler: @escaping (String) -> Void) {
        onError = handler
    }

    func load(_ code: String) {
        if let bridge { qjs_bridge_destroy(bridge) }
        TimerManager.shared.clearAll()
        StateRegistry.shared.clear()
        ListCache.shared.clear()
        AppConfig.shared.reset()

        bridge = qjs_bridge_create()
        var err: UnsafeMutablePointer<CChar>?
        let rc = qjs_bridge_eval(bridge, code, &err)
        if rc != 0 {
            let message = err.map { String(cString: $0) } ?? "JS error"
            if let err { free(err) }
            onError(message)
            return
        }

        // Protocol version check (see CONTRACT.md): refuse to render a bundle
        // built against a different contract version than this host implements.
        var bundleProtocol: Int? = nil
        if let cstr = qjs_bridge_eval_string(bridge, "String(globalThis.__WRST_PROTOCOL__)") {
            bundleProtocol = Int(String(cString: cstr))
            free(cstr)
        }
        if bundleProtocol != JSRuntime.protocolVersion {
            let got = bundleProtocol.map(String.init) ?? "?"
            onError("wrst protocol mismatch: bundle v\(got), runtime v\(JSRuntime.protocolVersion) - update the app or the framework")
        }
    }

    func render() -> String? {
        guard let bridge else { return nil }
        guard let cstr = qjs_bridge_eval_string(bridge, "JSON.stringify(render())") else { return nil }
        defer { free(cstr) }
        return String(cString: cstr)
    }

    func call(_ id: String) {
        guard let bridge else { return }
        let escaped = id.replacingOccurrences(of: "'", with: "\\'")
        var err: UnsafeMutablePointer<CChar>?
        if qjs_bridge_eval(bridge, "call('\(escaped)')", &err) != 0 {
            let message = err.map { String(cString: $0) } ?? "JS error"
            if let err { free(err) }
            onError(message)
        }
    }

    // Invoke call(id, <jsonLiteral>) - e.g. fetch resolve/reject with a response
    // object or error string. The JSON literal is a valid JS expression.
    func callWithJSON(_ id: String, json: String) {
        guard let bridge else { return }
        let escaped = id.replacingOccurrences(of: "'", with: "\\'")
        _ = qjs_bridge_eval(bridge, "call('\(escaped)', \(json))", nil)
    }

    // Render one List item. The JS global call() returns JSON.stringify(fn(...)),
    // so evaluating it yields the item's node JSON directly.
    func renderListItem(_ id: String, itemJSON: String, index: Int) -> String? {
        guard let bridge else { return nil }
        let escaped = id.replacingOccurrences(of: "'", with: "\\'")
        let code = "call('\(escaped)', \(itemJSON), \(index))"
        guard let cstr = qjs_bridge_eval_string(bridge, code) else { return nil }
        defer { free(cstr) }
        return String(cString: cstr)
    }

    deinit {
        if let bridge { qjs_bridge_destroy(bridge) }
    }
}
