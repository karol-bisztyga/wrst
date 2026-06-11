package com.example.wearos.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.wrst.runtime.WrstHost

// Thin app shell - all runtime behavior lives in the `wrst-runtime` library.
// A scaffolded project owns this file (app name, icon, manifest, signing) and
// nothing else.
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { WrstHost() }
    }
}
