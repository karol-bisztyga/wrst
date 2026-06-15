import Foundation
import os

// C-callable entry points invoked from the QuickJS shim (qjs_bridge.c) during
// eval. They run synchronously on the main thread (eval happens on the main
// actor), so MainActor.assumeIsolated is safe.

private let jsLogger = Logger(subsystem: "wrst", category: "JS")

@_cdecl("swift_native_log")
public nonisolated func swift_native_log(_ msg: UnsafePointer<CChar>?) {
    guard let msg else { return }
    let s = String(cString: msg)
    jsLogger.log("\(s, privacy: .public)")
    MainActor.assumeIsolated { DevLog.shared.forward("log", s) }
}

@_cdecl("swift_native_warn")
public nonisolated func swift_native_warn(_ msg: UnsafePointer<CChar>?) {
    guard let msg else { return }
    let s = String(cString: msg)
    jsLogger.warning("\(s, privacy: .public)")
    MainActor.assumeIsolated { DevLog.shared.forward("warn", s) }
}

@_cdecl("swift_native_error")
public nonisolated func swift_native_error(_ msg: UnsafePointer<CChar>?) {
    guard let msg else { return }
    let s = String(cString: msg)
    jsLogger.error("\(s, privacy: .public)")
    MainActor.assumeIsolated { DevLog.shared.forward("error", s) }
}

@_cdecl("swift_native_register_state")
public nonisolated func swift_native_register_state(_ id: UnsafePointer<CChar>?, _ value: UnsafePointer<CChar>?) {
    guard let id, let value else { return }
    let key = String(cString: id), json = String(cString: value)
    MainActor.assumeIsolated { StateRegistry.shared.register(key, json: json) }
}

@_cdecl("swift_native_set_state")
public nonisolated func swift_native_set_state(_ id: UnsafePointer<CChar>?, _ value: UnsafePointer<CChar>?) {
    guard let id, let value else { return }
    let key = String(cString: id), json = String(cString: value)
    MainActor.assumeIsolated { StateRegistry.shared.set(key, json: json) }
}

// Returns a malloc'd C string the caller (C) frees, or nil.
@_cdecl("swift_native_get_state")
public nonisolated func swift_native_get_state(_ id: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    guard let id else { return nil }
    let key = String(cString: id)
    let json: String? = MainActor.assumeIsolated { StateRegistry.shared.json(key) }
    guard let json else { return nil }
    return strdup(json)
}

// Returns nil on success, or a malloc'd error message (the caller, C, frees it
// and throws it as a JS exception → surfaces on the error screen).
@_cdecl("swift_native_set_app_config")
public nonisolated func swift_native_set_app_config(_ color: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    guard let color else { return nil }
    let value = String(cString: color)
    let error: String? = MainActor.assumeIsolated { AppConfig.shared.setBackgroundColor(value) }
    guard let error else { return nil }
    return strdup(error)
}

@_cdecl("swift_native_performance_now")
public nonisolated func swift_native_performance_now() -> Double {
    PerformanceClock.now()
}

@_cdecl("swift_native_set_timeout")
public nonisolated func swift_native_set_timeout(_ id: UnsafePointer<CChar>?, _ delay: Double) {
    guard let id else { return }
    let key = String(cString: id)
    MainActor.assumeIsolated { TimerManager.shared.setTimeout(key, delayMs: delay) }
}

@_cdecl("swift_native_clear_timeout")
public nonisolated func swift_native_clear_timeout(_ id: UnsafePointer<CChar>?) {
    guard let id else { return }
    let key = String(cString: id)
    MainActor.assumeIsolated { TimerManager.shared.clear(key) }
}

@_cdecl("swift_native_set_interval")
public nonisolated func swift_native_set_interval(_ id: UnsafePointer<CChar>?, _ delay: Double) {
    guard let id else { return }
    let key = String(cString: id)
    MainActor.assumeIsolated { TimerManager.shared.setInterval(key, delayMs: delay) }
}

@_cdecl("swift_native_clear_interval")
public nonisolated func swift_native_clear_interval(_ id: UnsafePointer<CChar>?) {
    guard let id else { return }
    let key = String(cString: id)
    MainActor.assumeIsolated { TimerManager.shared.clear(key) }
}

@_cdecl("swift_native_navigate")
public nonisolated func swift_native_navigate() {
    MainActor.assumeIsolated { RuntimeBridge.shared.navigate() }
}

@_cdecl("swift_native_go_back")
public nonisolated func swift_native_go_back() {
    MainActor.assumeIsolated { RuntimeBridge.shared.goBack() }
}

// localStorage - UserDefaults is thread-safe, so no MainActor hop needed.

// Returns a malloc'd C string the caller (C) frees, or nil.
@_cdecl("swift_native_storage_get")
public nonisolated func swift_native_storage_get(_ key: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    guard let key, let value = LocalStorage.get(String(cString: key)) else { return nil }
    return strdup(value)
}

@_cdecl("swift_native_storage_set")
public nonisolated func swift_native_storage_set(_ key: UnsafePointer<CChar>?, _ value: UnsafePointer<CChar>?) {
    guard let key, let value else { return }
    LocalStorage.set(String(cString: key), String(cString: value))
}

@_cdecl("swift_native_storage_remove")
public nonisolated func swift_native_storage_remove(_ key: UnsafePointer<CChar>?) {
    guard let key else { return }
    LocalStorage.remove(String(cString: key))
}

@_cdecl("swift_native_storage_clear")
public nonisolated func swift_native_storage_clear() {
    LocalStorage.clear()
}

@_cdecl("swift_native_set_show_header")
public nonisolated func swift_native_set_show_header(_ show: Int32) {
    MainActor.assumeIsolated { AppConfig.shared.showHeader = (show != 0) }
}

// Returns a malloc'd C string the caller (C) frees.
@_cdecl("swift_native_device_info")
public nonisolated func swift_native_device_info() -> UnsafeMutablePointer<CChar>? {
    strdup(MainActor.assumeIsolated { DeviceInfo.json() })
}

// Extension hook: dispatch to a host-registered native module. Returns a
// malloc'd JSON C string (caller frees) of the module's result, or nil when no
// module is registered under `name` / it returns nothing.
@_cdecl("swift_native_module_call")
public nonisolated func swift_native_module_call(_ name: UnsafePointer<CChar>?,
                                                 _ argsJson: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    guard let name else { return nil }
    let moduleName = String(cString: name)
    let args = argsJson.map { String(cString: $0) } ?? "[]"
    let resultJSON: String? = MainActor.assumeIsolated {
        WrstNativeModules.shared.call(moduleName, argsJSON: args)
    }
    guard let resultJSON else { return nil }
    return strdup(resultJSON)
}

// Engine sensors: start/stop a motion-sensor stream for a JS callback id.
@_cdecl("swift_native_sensor_start")
public nonisolated func swift_native_sensor_start(_ type: UnsafePointer<CChar>?,
                                                  _ callbackId: UnsafePointer<CChar>?,
                                                  _ intervalMs: Double) {
    guard let type, let callbackId else { return }
    let t = String(cString: type), id = String(cString: callbackId)
    MainActor.assumeIsolated { WrstSensors.shared.start(type: t, callbackId: id, intervalMs: intervalMs) }
}

@_cdecl("swift_native_sensor_stop")
public nonisolated func swift_native_sensor_stop(_ callbackId: UnsafePointer<CChar>?) {
    guard let callbackId else { return }
    let id = String(cString: callbackId)
    MainActor.assumeIsolated { WrstSensors.shared.stop(id) }
}

// Runtime permissions: current status (sync, returned to JS) + async request.
@_cdecl("swift_native_permission_status")
public nonisolated func swift_native_permission_status(_ name: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    guard let name else { return nil }
    return strdup(Permissions.status(String(cString: name)))
}

@_cdecl("swift_native_permission_request")
public nonisolated func swift_native_permission_request(_ name: UnsafePointer<CChar>?,
                                                        _ resolveId: UnsafePointer<CChar>?) {
    guard let name, let resolveId else { return }
    let n = String(cString: name), rid = String(cString: resolveId)
    Permissions.request(n) { status in
        Task { @MainActor in RuntimeBridge.shared.callJSON(rid, "\"\(status)\"") }
    }
}

@_cdecl("swift_native_fetch")
public nonisolated func swift_native_fetch(_ url: UnsafePointer<CChar>?,
                                    _ options: UnsafePointer<CChar>?,
                                    _ resolveId: UnsafePointer<CChar>?,
                                    _ rejectId: UnsafePointer<CChar>?) {
    guard let url, let resolveId, let rejectId else { return }
    FetchManager.perform(
        url: String(cString: url),
        optionsJSON: options.map { String(cString: $0) } ?? "{}",
        resolveId: String(cString: resolveId),
        rejectId: String(cString: rejectId)
    )
}
