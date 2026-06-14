import Foundation

// Where an Image's `src` should load from. Android twin: AssetResolver.kt.
enum AssetSource {
    case url(URL)           // remote, or the dev server's /assets URL in debug
    case bundled(String)    // a resource embedded by `wrst build-ios` (release)
    case none
}

enum AssetResolver {
    // - full URL (contains "://")        → used as-is (remote image)
    // - project-local name, debug        → http://localhost:8081/assets/<name> (dev server)
    // - project-local name, release      → bundled resource (embedded at build time)
    static func resolve(_ src: String) -> AssetSource {
        if src.contains("://") {
            return URL(string: src).map { .url($0) } ?? .none
        }
        #if DEBUG
        return URL(string: "http://localhost:8081/assets/\(src)").map { .url($0) } ?? .none
        #else
        return .bundled(src)
        #endif
    }
}
