package com.wrst.runtime

import android.util.Log
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

object StateRegistry {
    val states = ConcurrentHashMap<String, MutableState<Any>>()

    fun register(id: String, value: Any) {
        states[id] = mutableStateOf(value)
    }

    fun set(id: String, value: Any) {
        states[id]?.value = value
    }

    // Resolves a value that may be a stateRef { "__stateRef": "uuid" } or a plain value.
    // Must be called inside a @Composable so Compose tracks the state read.
    fun resolve(value: Any?): Any? {
        if (value is JSONObject && value.has("__stateRef")) {
            val result = states[value.getString("__stateRef")]?.value
            // computed() serializes plain JS objects (e.g. style props) as JSON strings.
            // Parse them back to JSONObject so parsers can use them normally.
            if (result is String && result.startsWith("{")) {
                try { return JSONObject(result) } catch (_: Exception) {}
            }
            return result
        }
        return value
    }

    // Resolves the style prop from a component's props JSONObject.
    // Handles both a direct JSONObject style and a stateRef pointing to a serialized style.
    fun resolveStyle(props: JSONObject): JSONObject =
        resolve(props.opt("style")) as? JSONObject ?: JSONObject()

    fun clear() {
        states.clear()
    }
}
