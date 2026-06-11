package com.wrst.runtime.renderers

import android.util.Log
import androidx.compose.foundation.layout.Row
import androidx.compose.runtime.Composable
import com.wrst.runtime.StateRegistry
import org.json.JSONObject

object HorizontalViewRenderer {
    @Composable
    fun Render(obj: JSONObject, renderTree: @Composable (String) -> Unit) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        val style = StateRegistry.resolveStyle(props)

        val hidden = StateRegistry.resolve(props.opt("hidden")) as? Boolean ?: false
        if (hidden) return

        val children = obj.optJSONArray("children")

        // Log.d("HorizontalViewRenderer", "rendering HorizontalView [$props][$children]")

        val modifier = StyleParser().parse(style)
        val (_, verticalAlignment, _) = ContainerStyleParser().parse(style)

        Row(modifier = modifier, verticalAlignment = verticalAlignment) {
            if (children != null) {
                for (i in 0 until children.length()) {
                    renderTree(children.getJSONObject(i).toString())
                }
            }
        }
    }
}