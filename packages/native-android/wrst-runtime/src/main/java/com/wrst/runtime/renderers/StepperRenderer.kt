package com.wrst.runtime.renderers

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.Text
import com.wrst.runtime.JsRuntimeManager
import com.wrst.runtime.StateRegistry
import kotlinx.coroutines.launch
import org.json.JSONObject

// A compact "−  value  +" stepper. Wear's full-screen `Stepper` can't compose
// inside a scroll, so this is a small inline control that embeds anywhere and
// mirrors SwiftUI's inline Stepper (TreeView.stepperView).
object StepperRenderer {
    @Composable
    fun Render(obj: JSONObject) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        if (StateRegistry.resolve(props.opt("hidden")) as? Boolean == true) return

        val value = (StateRegistry.resolve(props.opt("value")) as? Number)?.toFloat() ?: 0f
        val minV = (StateRegistry.resolve(props.opt("min")) as? Number)?.toFloat() ?: 0f
        var maxV = (StateRegistry.resolve(props.opt("max")) as? Number)?.toFloat() ?: 10f
        if (maxV <= minV) maxV = minV + 1f
        var step = (StateRegistry.resolve(props.opt("step")) as? Number)?.toFloat() ?: 1f
        if (step <= 0f) step = 1f
        val label = StateRegistry.resolve(props.opt("label")) as? String
        val onChange = props.optString("onChange")
        val scope = rememberCoroutineScope()
        val modifier = StyleParser().parse(StateRegistry.resolveStyle(props))

        fun emit(next: Float) {
            if (onChange.isNotEmpty()) scope.launch { JsRuntimeManager.call(onChange, next.toString()) }
        }

        Row(
            modifier = modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            StepButton("−", enabled = value > minV) {
                emit((value - step).coerceAtLeast(minV))
            }
            Text(label ?: formatNumber(value))
            StepButton("+", enabled = value < maxV) {
                emit((value + step).coerceAtMost(maxV))
            }
        }
    }

    @Composable
    private fun StepButton(symbol: String, enabled: Boolean, onClick: () -> Unit) {
        val tint = if (enabled) Color(0xFF3C4043) else Color(0xFF202124)
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(tint)
                .clickable(enabled = enabled, onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            Text(symbol, color = if (enabled) Color.White else Color(0xFF5F6368))
        }
    }

    private fun formatNumber(v: Float): String =
        if (v == v.toLong().toFloat()) v.toLong().toString() else v.toString()
}
