import Foundation

// Registry of host-provided native modules - the extension hook, and the iOS
// twin of Android's `NativeModule` list passed to `WrstHost`.
//
// A thin app shell registers a capability before the bundle calls it:
//
//   WrstNativeModules.shared.register("hello") { _ in
//       print("hello from native module")
//       return "hello from native module"
//   }
//
// App JS reaches it via `callNativeModule("hello", ...args)`. The handler
// receives the decoded JSON argument array and returns any JSON-encodable value
// (or nil for no result). The engine binary is untouched - this is the one
// dispatch channel; modules live here, in the shell.
@MainActor
public final class WrstNativeModules {
    public static let shared = WrstNativeModules()
    private init() {}

    public typealias Handler = (_ args: [Any]) -> Any?

    private var handlers: [String: Handler] = [:]

    public func register(_ name: String, _ handler: @escaping Handler) {
        handlers[name] = handler
    }

    // Convenience so the call site reads the same on both platforms:
    // `WrstNativeModules.register("hello") { ... }`.
    public static func register(_ name: String, _ handler: @escaping Handler) {
        shared.register(name, handler)
    }

    // Push a value to a JS callback id - for *streaming* modules (e.g. sensors):
    // JS hands the module a callback id, the module calls emit() per sample.
    public func emit(_ callbackId: String, _ valueJSON: String) {
        RuntimeBridge.shared.callJSON(callbackId, valueJSON)
    }

    public static func emit(_ callbackId: String, _ valueJSON: String) {
        shared.emit(callbackId, valueJSON)
    }

    // Invoked from swift_native_module_call. Decodes args JSON, runs the handler,
    // and JSON-encodes the result. Returns nil if no module / no result.
    func call(_ name: String, argsJSON: String) -> String? {
        guard let handler = handlers[name] else { return nil }
        let args = (try? JSONSerialization.jsonObject(
            with: Data(argsJSON.utf8), options: [.fragmentsAllowed]
        )) as? [Any] ?? []
        guard let result = handler(args) else { return nil }
        return encode(result)
    }

    // JSON-encode a handler result. Arrays/objects go straight through;
    // scalars (String/Number/Bool) aren't valid top-level JSON for
    // JSONSerialization, so wrap-in-array then strip the brackets.
    private func encode(_ value: Any) -> String? {
        if JSONSerialization.isValidJSONObject(value) {
            guard let data = try? JSONSerialization.data(withJSONObject: value) else { return nil }
            return String(data: data, encoding: .utf8)
        }
        guard let data = try? JSONSerialization.data(withJSONObject: [value]),
              let wrapped = String(data: data, encoding: .utf8) else { return nil }
        return String(wrapped.dropFirst().dropLast())
    }
}
