import SwiftUI
import Combine

// One pushed screen: a unique key + its rendered tree (rendered once at
// navigate-time, like Android's per-entry treeMap; stateRefs in it stay live).
struct ScreenEntry: Hashable, Identifiable {
    let id: Int
    let treeJSON: String
}

// Ties the socket, JS runtime, and view together (the role MainActivity.kt plays
// on Android). Holds the root screen, the navigation stack, and error state.
@MainActor
final class RuntimeController: ObservableObject {
    @Published var rootTree: String?
    @Published var error: String?
    @Published var navPath: [ScreenEntry] = []

    private var navCounter = 0
    private let runtime = JSRuntime()
    private let socket = SocketClient()

    init() {
        runtime.setErrorHandler { [weak self] message in self?.error = message }
        socket.onError = { [weak self] message in self?.error = message }
        socket.onCode = { [weak self] code in self?.loadCode(code) }

        // A callback's setState updates StateCell(s), and SwiftUI re-renders only
        // the views that read those cells - so callbacks just run.
        RuntimeBridge.shared.onCall = { [weak self] id in
            self?.runtime.call(id)
        }
        RuntimeBridge.shared.onRenderItem = { [weak self] id, item, index in
            self?.runtime.renderListItem(id, itemJSON: item, index: index)
        }
        RuntimeBridge.shared.onCallJSON = { [weak self] id, json in
            self?.runtime.callWithJSON(id, json: json)
        }
        RuntimeBridge.shared.onNavigate = { [weak self] in
            // Defer past the current JS call (navigate() runs inside a callback)
            // to avoid re-entrant eval, then render the new screen and push it.
            Task { @MainActor in self?.handleNavigate() }
        }
    }

    func start() {
        // Debug hot-reloads from the dev server; release loads the JS bundle
        // embedded in the app (the package compiles per-app, so #if DEBUG tracks
        // the consuming app's configuration).
        #if DEBUG
        socket.connect()
        socket.pullCode()
        #else
        loadEmbeddedBundle()
        #endif
    }

    func reload() {
        socket.pullCode()
    }

    private func loadEmbeddedBundle() {
        guard let url = Bundle.main.url(forResource: "bundle", withExtension: "js"),
              let code = try? String(contentsOf: url, encoding: .utf8) else {
            error = "wrst: no embedded bundle found"
            return
        }
        loadCode(code)
    }

    private func loadCode(_ code: String) {
        error = nil
        runtime.load(code)          // may set error via the exception handler
        guard error == nil else { return }
        navPath = []
        navCounter = 0
        rootTree = runtime.render()
    }

    // JS already updated currentRoute; render the new current screen and push it.
    private func handleNavigate() {
        guard let tree = runtime.render() else { return }
        navCounter += 1
        navPath.append(ScreenEntry(id: navCounter, treeJSON: tree))
    }
}
