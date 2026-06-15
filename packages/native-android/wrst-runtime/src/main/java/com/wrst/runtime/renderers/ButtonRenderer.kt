package com.wrst.runtime.renderers

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import com.wrst.runtime.JsRuntimeManager
import com.wrst.runtime.StateRegistry
import kotlinx.coroutines.launch
import org.json.JSONObject

object ButtonRenderer {
    @OptIn(ExperimentalFoundationApi::class)
    @Composable
    fun Render(obj: JSONObject, renderTree: @Composable (String) -> Unit) {
        val props = obj.optJSONObject("props") ?: JSONObject()

        val hidden = StateRegistry.resolve(props.opt("hidden")) as? Boolean ?: false
        if (hidden) return

        val style = StateRegistry.resolveStyle(props)
        val onPress = props.optString("onPress") ?: ""
        val onLongPress = props.optString("onLongPress") ?: ""
        val children = obj.optJSONArray("children")

        val modifier = StyleParser().parse(style)
        val (contentAlignment, _, _) = ContainerStyleParser().parse(style)
        val scope = rememberCoroutineScope()

        // No default Material styling (the blue rounded chip) - just a clickable
        // container rendering its children, consistent with iOS's .plain button.
        // All visual styling and alignment come from the `style` prop, like View.
        Box(
            modifier = modifier.combinedClickable(
                onClick = {
                    if (onPress != "") scope.launch { JsRuntimeManager.call(onPress) }
                },
                onLongClick = if (onLongPress != "") {
                    { scope.launch { JsRuntimeManager.call(onLongPress) } }
                } else null,
            ),
            contentAlignment = contentAlignment
        ) {
            if (children != null) {
                for (i in 0 until children.length()) {
                    renderTree(children.getJSONObject(i).toString())
                }
            }
        }
    }
}
