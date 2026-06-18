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
    // The navPath.count we last set programmatically (load/navigate). A drop
    // below it means the user backed out (swipe/system back), which we sync to
    // JS; equal-or-greater is our own change and is ignored. See onNavChange.
    var syncedNavCount = 0
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
        // Companion link status / incoming messages → JS entry points. The eval's
        // setState re-renders the views reading those cells (no manual refresh).
        RuntimeBridge.shared.onCompanionStatus = { [weak self] json in
            self?.runtime.companionStatus(json)
        }
        RuntimeBridge.shared.onCompanionMessage = { [weak self] json in
            self?.runtime.companionMessage(json)
        }
        RuntimeBridge.shared.onNavigate = { [weak self] in
            // Defer past the current JS call (navigate() runs inside a callback)
            // to avoid re-entrant eval, then render the new screen and push it.
            Task { @MainActor in self?.handleNavigate() }
        }
        RuntimeBridge.shared.onGoBack = { [weak self] in
            // goBack() popped the JS stack request; pop our view stack to match.
            // The resulting navPath change syncs JS via onNavChange → back().
            Task { @MainActor in
                guard let self, !self.navPath.isEmpty else { return }
                self.navPath.removeLast()
            }
        }
    }

    // Called when navPath shrinks: a user back (swipe/system) we didn't initiate
    // programmatically. Sync the JS stack down and re-persist.
    func onNavChange(_ newCount: Int) {
        if newCount < syncedNavCount { runtime.back() }
        syncedNavCount = newCount
    }

    func start() {
        // Begin watching the companion (phone) link. Independent of bundle load;
        // status pushes are guarded so they no-op until the bundle (and Companion)
        // are present.
        CompanionManager.shared.activate()

        // Debug live-reloads from the dev server; release loads the JS bundle
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
        // Rebuild the stack from JS: trees[0] is the root, the rest are pushed
        // screens (a restored path when persistCurrentScreen kept one; otherwise
        // just the root).
        let trees = runtime.navRestore()
        // The bundle loaded but produced no screen - a real config/code error,
        // not a "still connecting" state. Surface it instead of a blank wait.
        guard !trees.isEmpty else {
            error = "wrst: nothing to render - make sure your entry calls start(App) and your root component returns a tree."
            return
        }
        navCounter = 0
        rootTree = trees.first
        navPath = trees.dropFirst().map { json in
            navCounter += 1
            return ScreenEntry(id: navCounter, treeJSON: json)
        }
        syncedNavCount = navPath.count
    }

    // JS already updated currentRoute; render the new current screen and push it.
    private func handleNavigate() {
        guard let tree = runtime.render() else { return }
        navCounter += 1
        navPath.append(ScreenEntry(id: navCounter, treeJSON: tree))
        syncedNavCount = navPath.count
    }
}
