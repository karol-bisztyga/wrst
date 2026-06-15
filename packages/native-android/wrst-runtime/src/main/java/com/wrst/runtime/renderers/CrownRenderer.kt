package com.wrst.runtime.renderers

import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.rotary.onRotaryScrollEvent
import com.wrst.runtime.JsRuntimeManager
import com.wrst.runtime.StateRegistry
import kotlinx.coroutines.launch
import org.json.JSONObject
import kotlin.math.abs

// Raw Digital Crown / rotary input. A focusable Box whose `value` advances by
// `step` as the crown turns; renders its children (the custom visual). Reports
// the new value via call(onChange, value). SwiftUI twin: TreeView.crownView.
object CrownRenderer {
    @Composable
    fun Render(obj: JSONObject, renderTree: @Composable (String) -> Unit) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        if (StateRegistry.resolve(props.opt("hidden")) as? Boolean == true) return

        val value = (StateRegistry.resolve(props.opt("value")) as? Number)?.toFloat() ?: 0f
        val minV = (StateRegistry.resolve(props.opt("min")) as? Number)?.toFloat() ?: 0f
        var maxV = (StateRegistry.resolve(props.opt("max")) as? Number)?.toFloat() ?: 100f
        if (maxV <= minV) maxV = minV + 1f
        var step = (StateRegistry.resolve(props.opt("step")) as? Number)?.toFloat() ?: 1f
        if (step <= 0f) step = 1f
        val onChange = props.optString("onChange")
        val scope = rememberCoroutineScope()
        val modifier = StyleParser().parse(StateRegistry.resolveStyle(props))
        val (contentAlignment, _, _) = ContainerStyleParser().parse(StateRegistry.resolveStyle(props))

        val focusRequester = remember { FocusRequester() }
        LaunchedEffect(Unit) { runCatching { focusRequester.requestFocus() } }
        // Accumulate scroll pixels and step once a notch threshold is crossed, so
        // the value advances at a usable pace rather than per raw event.
        val acc = remember { floatArrayOf(0f) }
        val notch = 48f

        Box(
            modifier = modifier
                .onRotaryScrollEvent { e ->
                    acc[0] += e.verticalScrollPixels
                    if (abs(acc[0]) >= notch) {
                        val dir = if (acc[0] > 0) 1f else -1f
                        acc[0] = 0f
                        val next = (value + dir * step).coerceIn(minV, maxV)
                        if (next != value && onChange.isNotEmpty()) {
                            scope.launch { JsRuntimeManager.call(onChange, next.toString()) }
                        }
                    }
                    true
                }
                .focusRequester(focusRequester)
                .focusable(),
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
