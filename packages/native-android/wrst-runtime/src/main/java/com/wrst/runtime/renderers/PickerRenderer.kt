package com.wrst.runtime.renderers

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.wear.compose.material.Picker
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.rememberPickerState
import com.wrst.runtime.JsRuntimeManager
import com.wrst.runtime.StateRegistry
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.max

// Scrolling wheel of options. Wear's Picker owns vertical scroll, which fights
// the parent ScalingLazyColumn when embedded - and a Main-pass gesture detector
// loses the slop race to the parent. So we intercept vertical drags in the
// INITIAL pointer pass (before the parent's scrollable sees them), consume them,
// and drive the wheel ourselves, snapping to the nearest option on release.
// Horizontal gestures (e.g. swipe-back) pass through. SwiftUI twin:
// TreeView.pickerView.
object PickerRenderer {
    @Composable
    fun Render(obj: JSONObject) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        if (StateRegistry.resolve(props.opt("hidden")) as? Boolean == true) return

        val resolved = StateRegistry.resolve(props.opt("options"))
        val options: List<String> = when (resolved) {
            is JSONArray -> (0 until resolved.length()).map { resolved.optString(it) }
            is List<*> -> resolved.map { it.toString() }
            else -> emptyList()
        }
        val selected = (StateRegistry.resolve(props.opt("selectedIndex")) as? Number)?.toInt() ?: 0
        val onChange = props.optString("onChange")
        val scope = rememberCoroutineScope()
        val modifier = StyleParser().parse(StateRegistry.resolveStyle(props))

        val state = rememberPickerState(
            initialNumberOfOptions = options.size.coerceAtLeast(1),
            initiallySelectedOption = selected.coerceIn(0, max(0, options.size - 1)),
            repeatItems = false,
        )
        // Report only genuine user moves (not the initial/echoed selection) to
        // avoid a feedback loop with the JS state round-trip.
        LaunchedEffect(state.selectedOption) {
            if (onChange.isNotEmpty() && state.selectedOption != selected) {
                JsRuntimeManager.call(onChange, state.selectedOption.toString())
            }
        }

        Picker(
            state = state,
            contentDescription = null,
            // We drive scrolling via the Initial-pass interceptor below; the
            // Picker's own touch scroll stays off so nothing reaches the parent.
            userScrollEnabled = false,
            modifier = modifier.pointerInput(state) {
                awaitPointerEventScope {
                    var dragging = false
                    while (true) {
                        val event = awaitPointerEvent(PointerEventPass.Initial)
                        if (event.changes.any { it.pressed }) {
                            val dy = event.changes.firstOrNull()?.positionChange()?.y ?: 0f
                            if (abs(dy) > 0f) {
                                dragging = true
                                state.dispatchRawDelta(-dy)
                                event.changes.forEach { it.consume() }
                            }
                        } else if (dragging) {
                            dragging = false
                            scope.launch { state.animateScrollToOption(state.selectedOption) }
                        }
                    }
                }
            },
        ) { i ->
            Text(options.getOrElse(i) { "" })
        }
    }
}
