package com.wrst.runtime

// Resolves an Image `src` to a Coil model string:
//   - a full URL (contains "://")            → used as-is (remote image)
//   - a project-local name, in debug         → http://<devhost>:8091/assets/<name>
//                                               (served live by the dev server)
//   - a project-local name, in release       → file:///android_asset/wrst-assets/<name>
//                                               (embedded by `wrst build:wear-os`)
// iOS twin: AssetResolver.swift.
object AssetResolver {
    @Volatile
    var debug = false

    fun resolve(src: String): String {
        if (src.contains("://")) return src
        return if (debug) {
            "http://$EMULATOR_HOST_IP:8091/assets/$src"
        } else {
            "file:///android_asset/wrst-assets/$src"
        }
    }
}
