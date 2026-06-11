package com.wrst.runtime.renderers

import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.rotary.onRotaryScrollEvent
import com.wrst.runtime.StateRegistry
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import org.json.JSONObject

object ScrollViewRenderer {
    @Composable
    fun Render(obj: JSONObject, renderTree: @Composable (String) -> Unit) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        val style = StateRegistry.resolveStyle(props)

        val hidden = StateRegistry.resolve(props.opt("hidden")) as? Boolean ?: false
        if (hidden) return

        val children = obj.optJSONArray("children")
        val modifier = StyleParser().parse(style)
        val autoCenter = StateRegistry.resolve(props.opt("autoCenter")) as? Boolean ?: false

        // Plain scrolling Column instead of ScalingLazyColumn: top-aligns
        // consistently whether the ScrollView has one tall child or many (a
        // ScalingLazyColumn centers the first item, which scrolls a single tall
        // child's top off-screen - e.g. MenuScreen). Matches Apple Watch's plain
        // ScrollView. Rotary (crown) scrolling is wired manually since we lose
        // ScalingLazyColumn's built-in support.
        val scrollState = rememberScrollState()
        val focusRequester = remember { FocusRequester() }
        val scope = rememberCoroutineScope()

        LaunchedEffect(autoCenter) {
            focusRequester.requestFocus()
            if (autoCenter) {
                // Wait for the real measured max, then center the content.
                val max = snapshotFlow { scrollState.maxValue }.first { it != Int.MAX_VALUE }
                if (max > 0) scrollState.scrollTo(max / 2)
            }
        }

        Column(
            modifier = modifier
                .verticalScroll(scrollState)
                .onRotaryScrollEvent { event ->
                    scope.launch { scrollState.scrollBy(event.verticalScrollPixels) }
                    true
                }
                .focusRequester(focusRequester)
                .focusable()
        ) {
            if (children != null) {
                for (i in 0 until children.length()) {
                    renderTree(children.getJSONObject(i).toString())
                }
            }
        }
    }
}
