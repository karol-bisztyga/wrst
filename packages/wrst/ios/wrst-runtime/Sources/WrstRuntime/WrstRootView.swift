//
//  WrstRootView.swift
//  WrstRuntime
//
//  The public entry point of the wrst Apple Watch runtime - the iOS twin of
//  Android's `WrstHost`. A thin app shell just renders `WrstRootView()`.
//

import SwiftUI

public struct WrstRootView: View {
    @StateObject private var controller = RuntimeController()
    @ObservedObject private var appConfig = AppConfig.shared

    public init() {
        // Pin the performance.now() origin to first use of the runtime.
        PerformanceClock.reset()
    }

    public var body: some View {
        Group {
            if let error = controller.error {
                background { ErrorView(message: error, onReload: controller.reload) }
            } else if let root = controller.rootTree {
                if appConfig.showHeader {
                    // System navigation: header bar + system swipe-back.
                    NavigationStack(path: $controller.navPath) {
                        styledScreen(root)
                            .navigationDestination(for: ScreenEntry.self) { entry in
                                styledScreen(entry.treeJSON)
                            }
                    }
                } else {
                    // Full-screen, no header. A custom stack avoids the watchOS
                    // NavigationStack "hidden bar" transition errors.
                    CustomNavHost(controller: controller)
                }
            } else {
                background { Text("connecting...").foregroundColor(.gray) }
            }
        }
        .onAppear { controller.start() }
    }

    private func styledScreen(_ json: String) -> some View {
        background {
            TreeView(json: json)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }

    private func background<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        ZStack(alignment: .topLeading) {
            appConfig.backgroundColor.ignoresSafeArea()
            content()
        }
    }
}

// Full-screen navigation without NavigationStack: shows the top screen and pops
// on a left→right swipe. Sidesteps the watchOS nav-controller errors that occur
// when the system navigation bar is hidden, while keeping fine-grained
// reactivity (the id only changes on navigation, not on state changes).
private struct CustomNavHost: View {
    @ObservedObject var controller: RuntimeController
    @ObservedObject private var appConfig = AppConfig.shared

    var body: some View {
        let json = controller.navPath.last?.treeJSON ?? (controller.rootTree ?? "")
        ZStack(alignment: .topLeading) {
            appConfig.backgroundColor.ignoresSafeArea()
            TreeView(json: json)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .id(controller.navPath.count)
                .transition(.opacity)
        }
        .animation(.default, value: controller.navPath.count)
        .simultaneousGesture(
            DragGesture(minimumDistance: 30).onEnded { value in
                guard value.translation.width > 60,
                      abs(value.translation.width) > abs(value.translation.height) * 1.5,
                      !controller.navPath.isEmpty else { return }
                controller.navPath.removeLast()
            }
        )
    }
}

#Preview {
    WrstRootView()
}
