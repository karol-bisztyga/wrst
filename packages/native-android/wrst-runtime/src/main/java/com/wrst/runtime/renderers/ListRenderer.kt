package com.wrst.runtime.renderers

import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import com.wrst.runtime.JsRuntimeManager
import com.wrst.runtime.StateRegistry
import org.json.JSONArray
import org.json.JSONObject

object ListRenderer {
    @Composable
    fun Render(obj: JSONObject, renderTree: @Composable (String) -> Unit) {
        val props = obj.optJSONObject("props") ?: JSONObject()

        val hidden = StateRegistry.resolve(props.opt("hidden")) as? Boolean ?: false
        if (hidden) return

        val rawItems = StateRegistry.resolve(props.opt("items"))
        val renderItemId = props.optString("renderItemId")

        val rendered = remember { mutableStateListOf<String>() }

        // Log.d("ListRenderer", "render List [$renderItemId][${rawItems}]");

        LaunchedEffect(rawItems, renderItemId) {
            rendered.clear()
            val items: List<Any?> = when (rawItems) {
                is JSONArray -> (0 until rawItems.length()).map { rawItems.get(it) }
                is List<*> -> rawItems
                else -> return@LaunchedEffect
            }
            for ((index, item) in items.withIndex()) {
                val nodeJson = JsRuntimeManager.call(renderItemId, toJsonLiteral(item), index.toString())
                rendered.add(nodeJson)
            }
        }

        rendered.forEach { nodeJson ->
            renderTree(nodeJson)
        }
    }

    private fun toJsonLiteral(value: Any?): String = when (value) {
        null -> "null"
        is JSONObject -> value.toString()
        is JSONArray -> value.toString()
        is Map<*, *> -> JSONObject(value).toString()   // QuickJS JS objects → Kotlin Map
        is List<*> -> JSONArray(value).toString()      // QuickJS JS arrays → Kotlin List
        is String -> JSONObject.quote(value)
        is Boolean -> value.toString()
        else -> value.toString()
    }
}
