package com.example.wearos.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.wrst.runtime.WrstHost
// import android.util.Log
// import com.wrst.runtime.WrstNativeModules

// Thin app shell - all runtime behavior lives in the `wrst-runtime` library.
// A scaffolded project owns this file (app name, icon, manifest, signing).
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Register app-specific native modules here (the extension hook), before
        // setContent. Reach them from your TS with
        // `callNativeModule("example", ...args)`. `args` is the JSON-decoded
        // argument array; return any JSON-encodable value (or null for none).
        // Mirror the same registration in ios/.../AppleWatchApp.swift so the
        // module exists on both platforms.
        //
        // WrstNativeModules.register("example") {
        //     Log.d("wrst", "hello from native module")
        //     "hello from native module"
        // }

        setContent { WrstHost() }
    }
}
