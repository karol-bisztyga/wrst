package com.wrst.runtime.renderers

import androidx.compose.runtime.Composable
import androidx.compose.ui.layout.ContentScale
import coil.compose.SubcomposeAsyncImage
import com.wrst.runtime.AssetResolver
import com.wrst.runtime.StateRegistry
import org.json.JSONObject

// Renders an Image node by loading its `src` URL. Coil handles fetch + memory/
// disk caching automatically, so reopening a screen serves from cache. While
// loading, the `loader` node (if any) is rendered. SwiftUI twin: CachedAsyncImage.
object ImageRenderer {
    @Composable
    fun Render(obj: JSONObject, renderTree: @Composable (String) -> Unit) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        if (StateRegistry.resolve(props.opt("hidden")) as? Boolean == true) return

        val rawSrc = StateRegistry.resolve(props.opt("src")) as? String ?: return
        val src = AssetResolver.resolve(rawSrc)
        val mode = StateRegistry.resolve(props.opt("resizeMode")) as? String ?: "fit"
        val loader = props.optJSONObject("loader")
        val scale = when (mode) {
            "cover" -> ContentScale.Crop
            "stretch" -> ContentScale.FillBounds
            else -> ContentScale.Fit
        }
        val modifier = StyleParser().parse(StateRegistry.resolveStyle(props))

        SubcomposeAsyncImage(
            model = src,
            contentDescription = null,
            contentScale = scale,
            modifier = modifier,
            loading = { if (loader != null) renderTree(loader.toString()) },
        )
    }
}
