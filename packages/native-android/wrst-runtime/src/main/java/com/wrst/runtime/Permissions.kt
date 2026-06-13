package com.wrst.runtime

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

// Runtime permissions (layer 2). Maps wrst's logical permission names (the same
// ones used in wrst.config.ts) to Android permissions, checks status, and - via
// a requester wired by WrstHost - launches the system request dialog. Names with
// no Android permission need no grant.
object Permissions {
    private var appContext: Context? = null

    // Wired by WrstHost (it owns the composable that can launch the dialog):
    // launches the system request for `perms`, then reports whether all granted.
    var requester: ((perms: List<String>, result: (Boolean) -> Unit) -> Unit)? = null

    fun init(context: Context) {
        appContext = context.applicationContext
    }

    private fun perms(name: String): List<String> = when (name) {
        "heartRate" -> listOf(Manifest.permission.BODY_SENSORS)
        "activity" -> listOf(Manifest.permission.ACTIVITY_RECOGNITION)
        "location" -> listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        )
        "microphone" -> listOf(Manifest.permission.RECORD_AUDIO)
        "bluetooth" -> listOf(
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.BLUETOOTH_SCAN,
        )
        "notifications" -> listOf(Manifest.permission.POST_NOTIFICATIONS)
        else -> emptyList()
    }

    // "granted" / "denied". (Android's checkSelfPermission can't reliably tell
    // "undetermined" from "denied", so we don't report it from status().)
    fun status(name: String): String {
        val perms = perms(name)
        if (perms.isEmpty()) return "granted" // nothing to grant
        val ctx = appContext ?: return "undetermined"
        val all = perms.all {
            ContextCompat.checkSelfPermission(ctx, it) == PackageManager.PERMISSION_GRANTED
        }
        return if (all) "granted" else "denied"
    }

    // Request, then call back with the resulting status string.
    fun request(name: String, onResult: (String) -> Unit) {
        val perms = perms(name)
        if (perms.isEmpty()) {
            onResult("granted")
            return
        }
        val r = requester
        if (r == null) {
            onResult(status(name))
            return
        }
        r(perms) { granted -> onResult(if (granted) "granted" else "denied") }
    }
}
