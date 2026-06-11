//
//  AppleWatchApp.swift
//  AppleWatch Watch App
//
//  Thin app shell - all runtime behavior lives in the `WrstRuntime` package.
//  A scaffolded project owns this file (app name, icon, Info.plist, signing).
//

import SwiftUI
import WrstRuntime

@main
struct AppleWatch_Watch_AppApp: App {
    var body: some Scene {
        WindowGroup {
            WrstRootView()
        }
    }
}
