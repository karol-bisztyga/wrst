package com.wrst.runtime.renderers

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.CircularProgressIndicator
import com.wrst.runtime.StateRegistry
import org.json.JSONObject

// Renders a Progress node: a determinate ring when `value` (0..1) is given,
// otherwise an indeterminate spinner. SwiftUI twin lives in TreeView.progressView.
object ProgressRenderer {
    @Composable
    fun Render(obj: JSONObject) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        if (StateRegistry.resolve(props.opt("hidden")) as? Boolean == true) return

        val value = (StateRegistry.resolve(props.opt("value")) as? Number)?.toFloat()
        val size = (StateRegistry.resolve(props.opt("size")) as? Number)?.toFloat() ?: 40f
        val colorStr = StateRegistry.resolve(props.opt("color")) as? String
        val animated = StateRegistry.resolve(props.opt("animated")) as? Boolean ?: false

        val parser = StyleParser()
        val modifier = parser.parse(StateRegistry.resolveStyle(props)).size(size.dp)
        val tint = parser.parseColor(colorStr).let { if (it == Color.Unspecified) Color.White else it }

        if (value != null) {
            val target = value.coerceIn(0f, 1f)
            val progress = if (animated) {
                animateFloatAsState(targetValue = target, label = "progress").value
            } else {
                target
            }
            CircularProgressIndicator(
                progress = progress,
                modifier = modifier,
                indicatorColor = tint,
            )
        } else {
            CircularProgressIndicator(
                modifier = modifier,
                indicatorColor = tint,
            )
        }
    }
}
