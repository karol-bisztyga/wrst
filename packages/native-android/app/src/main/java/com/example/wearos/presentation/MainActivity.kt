package com.example.wearos.presentation

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.wrst.runtime.WrstHost
import com.wrst.runtime.WrstNativeModules

// Thin app shell - all runtime behavior lives in the `wrst-runtime` library.
// A scaffolded project owns this file (app name, icon, manifest, signing) and
// registers any app-specific native modules (the extension hook).
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Example native module: reachable from JS via callNativeModule("hello").
        // Same call shape as the iOS shell (AppleWatchApp.swift).
        WrstNativeModules.register("hello") {
            Log.d("wrst", "hello from native module")
            "hello from native module"
        }

        setContent { WrstHost() }
    }
}
