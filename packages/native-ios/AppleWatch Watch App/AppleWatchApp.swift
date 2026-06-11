//
//  AppleWatchApp.swift
//  AppleWatch Watch App
//
//  Thin app shell - all runtime behavior lives in the `WrstRuntime` package.
//  A scaffolded project owns this file (app name, icon, Info.plist, signing)
//  and registers any app-specific native modules (the extension hook).
//

import SwiftUI
import WrstRuntime

@main
struct AppleWatch_Watch_AppApp: App {
    init() {
        // Example native module: reachable from JS via callNativeModule("hello").
        // Prints natively + returns a string. The iOS twin of the Kotlin
        // NativeModule registered in Android's MainActivity.
        WrstNativeModules.register("hello") { _ in
            print("hello from native module")
            return "hello from native module"
        }
    }

    var body: some Scene {
        WindowGroup {
            WrstRootView()
        }
    }
}
