package com.wrst.runtime.renderers

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.wear.compose.material.InlineSlider
import androidx.wear.compose.material.Text
import com.wrst.runtime.JsRuntimeManager
import com.wrst.runtime.StateRegistry
import kotlinx.coroutines.launch
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.roundToInt

// Horizontal value slider (crown-adjustable). Pushes the new number to JS via
// call(onChange, value). SwiftUI twin: TreeView.sliderView.
object SliderRenderer {
    @Composable
    fun Render(obj: JSONObject) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        if (StateRegistry.resolve(props.opt("hidden")) as? Boolean == true) return

        val value = (StateRegistry.resolve(props.opt("value")) as? Number)?.toFloat() ?: 0f
        val minV = (StateRegistry.resolve(props.opt("min")) as? Number)?.toFloat() ?: 0f
        var maxV = (StateRegistry.resolve(props.opt("max")) as? Number)?.toFloat() ?: 1f
        if (maxV <= minV) maxV = minV + 1f
        var step = (StateRegistry.resolve(props.opt("step")) as? Number)?.toFloat() ?: 0.1f
        if (step <= 0f) step = 0.1f
        val onChange = props.optString("onChange")
        val scope = rememberCoroutineScope()
        // InlineSlider's `steps` is the count of intermediate stops (endpoints excluded).
        val steps = max(0, ((maxV - minV) / step).roundToInt() - 1)
        val modifier = StyleParser().parse(StateRegistry.resolveStyle(props)).fillMaxWidth()

        InlineSlider(
            value = value.coerceIn(minV, maxV),
            onValueChange = { v ->
                if (onChange.isNotEmpty()) scope.launch { JsRuntimeManager.call(onChange, v.toString()) }
            },
            steps = steps,
            valueRange = minV..maxV,
            decreaseIcon = { Text("−") },
            increaseIcon = { Text("+") },
            modifier = modifier,
        )
    }
}
