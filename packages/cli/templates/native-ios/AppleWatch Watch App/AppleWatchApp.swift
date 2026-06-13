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
    init() {
        // Register app-specific native modules here (the extension hook).
        // Reach them from your TS with `callNativeModule("example", ...args)`.
        // The args you pass are the JSON-decoded argument array; return any
        // JSON-encodable value (or nil for none). Mirror the same registration
        // in android/.../MainActivity.kt so the module exists on both platforms.
        //
        // WrstNativeModules.register("example") { _ in
        //     print("hello from native module")
        //     return "hello from native module"
        // }
    }

    var body: some Scene {
        WindowGroup {
            WrstRootView()
        }
    }
}
