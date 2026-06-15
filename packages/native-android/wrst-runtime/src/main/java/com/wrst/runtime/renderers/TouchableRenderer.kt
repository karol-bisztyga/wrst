package com.wrst.runtime.renderers

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.draw.alpha
import com.wrst.runtime.JsRuntimeManager
import com.wrst.runtime.StateRegistry
import kotlinx.coroutines.launch
import org.json.JSONObject

// General press wrapper (RN TouchableOpacity-style): tap + long-press over any
// children, with a press-dim. combinedClickable gives mutually-exclusive
// tap/long-click (no double-fire); a null indication + isPressed-driven alpha
// gives the opacity feedback. SwiftUI twin: TreeView.touchableView.
object TouchableRenderer {
    @OptIn(ExperimentalFoundationApi::class)
    @Composable
    fun Render(obj: JSONObject, renderTree: @Composable (String) -> Unit) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        if (StateRegistry.resolve(props.opt("hidden")) as? Boolean == true) return

        val onPress = props.optString("onPress")
        val onLongPress = props.optString("onLongPress")
        val activeOpacity = (StateRegistry.resolve(props.opt("activeOpacity")) as? Number)?.toFloat() ?: 0.6f
        val scope = rememberCoroutineScope()
        val style = StateRegistry.resolveStyle(props)
        val modifier = StyleParser().parse(style)
        val (contentAlignment, _, _) = ContainerStyleParser().parse(style)

        val interaction = remember { MutableInteractionSource() }
        val isPressed by interaction.collectIsPressedAsState()

        Box(
            modifier = modifier
                .alpha(if (isPressed) activeOpacity else 1f)
                .combinedClickable(
                    interactionSource = interaction,
                    indication = null,
                    onClick = {
                        if (onPress.isNotEmpty()) scope.launch { JsRuntimeManager.call(onPress) }
                    },
                    onLongClick = if (onLongPress.isNotEmpty()) {
                        { scope.launch { JsRuntimeManager.call(onLongPress) } }
                    } else null,
                ),
            contentAlignment = contentAlignment,
        ) {
            val children = obj.optJSONArray("children")
            if (children != null) {
                for (i in 0 until children.length()) {
                    renderTree(children.getJSONObject(i).toString())
                }
            }
        }
    }
}
