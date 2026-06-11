import Foundation

// Disk-backed string key/value store for the JS localStorage shim, backed by a
// named UserDefaults suite (the iOS analog of Android's "wrst_storage"
// SharedPreferences). Persists across reloads and app restarts. UserDefaults is
// thread-safe, so no actor isolation is needed.
enum LocalStorage {
    private static let suiteName = "wrst_storage"
    private static var defaults: UserDefaults { UserDefaults(suiteName: suiteName) ?? .standard }

    static func get(_ key: String) -> String? { defaults.string(forKey: key) }
    static func set(_ key: String, _ value: String) { defaults.set(value, forKey: key) }
    static func remove(_ key: String) { defaults.removeObject(forKey: key) }
    static func clear() { defaults.removePersistentDomain(forName: suiteName) }
}
