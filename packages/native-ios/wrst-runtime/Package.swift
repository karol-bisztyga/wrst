// swift-tools-version: 5.9
import PackageDescription

// The wrst Apple Watch runtime, mirroring the Android `:wrst-runtime` library.
// - CQuickJS: the vendored QuickJS engine + the C shim (qjs_bridge). Only
//   qjs_bridge.h is public (it's the sole header in include/), so Swift never
//   sees QuickJS internals.
// - WrstRuntime: the Swift host (renderers, parsers, bridge, SwiftUI) exposing
//   the public `WrstRootView`. A thin app shell just renders `WrstRootView()`.
let package = Package(
    name: "WrstRuntime",
    platforms: [.watchOS(.v10)],
    products: [
        // Consumed as a normal SPM dependency (source), referenced by local path
        // from node_modules - the iOS twin of how the app links the Android AAR.
        // NB: a prebuilt .xcframework was attempted but a *dynamic* SwiftUI
        // framework can't link Apple's private SwiftUICore ("not an allowed
        // client"); source-SPM sidesteps that and is simpler. See plan item D.
        .library(name: "WrstRuntime", targets: ["WrstRuntime"]),
    ],
    targets: [
        .target(name: "CQuickJS"),
        .target(name: "WrstRuntime", dependencies: ["CQuickJS"]),
    ]
)
