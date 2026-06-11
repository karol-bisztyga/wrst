package com.wrst.runtime.renderers

import androidx.compose.runtime.Composable
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import com.wrst.runtime.StateRegistry
import org.json.JSONObject

// The native Wear scaling list: items scale/fade toward the edges and the list
// is center-anchored (default ScalingLazyColumn behavior, including rotary
// scrolling). For a plain top-aligned scroll, use ScrollView.
object ScalingScrollViewRenderer {
    @Composable
    fun Render(obj: JSONObject, renderTree: @Composable (String) -> Unit) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        val style = StateRegistry.resolveStyle(props)

        val hidden = StateRegistry.resolve(props.opt("hidden")) as? Boolean ?: false
        if (hidden) return

        val childrenArray = obj.optJSONArray("children")
        val children = (0 until (childrenArray?.length() ?: 0))
            .map { childrenArray!!.getJSONObject(it).toString() }

        val modifier = StyleParser().parse(style)

        ScalingLazyColumn(modifier = modifier, state = rememberScalingLazyListState(
            initialCenterItemIndex = 0
        )
        ) {
            items(children) { child ->
                renderTree(child)
            }
        }
    }
}
