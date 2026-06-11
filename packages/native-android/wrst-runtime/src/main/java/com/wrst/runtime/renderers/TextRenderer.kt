package com.wrst.runtime.renderers

import android.util.Log
import androidx.compose.runtime.Composable
import androidx.wear.compose.material.Text
import com.wrst.runtime.StateRegistry
import com.wrst.runtime.parsers.TextStyleParser
import org.json.JSONObject

object TextRenderer {
    @Composable
    fun Render(obj: JSONObject) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        val style = StateRegistry.resolveStyle(props)

        val hidden = StateRegistry.resolve(props.opt("hidden")) as? Boolean ?: false
        if (hidden) return

        val childrenArray = obj.optJSONArray("children")
        val children = buildString {
            for (i in 0 until (childrenArray?.length() ?: 0)) {
                val resolved = StateRegistry.resolve(childrenArray?.opt(i))
                if (resolved != null) append(resolved.toString())
            }
        }

        // Log.d("TextRenderer", "rendering Text [$props][$children]")

        val modifier = StyleParser().parse(style)
        val textStyles = TextStyleParser().parse(style)

        Text(
            text = children,
            modifier = modifier,
            color = textStyles.color,
            fontSize = textStyles.fontSize,
            fontStyle = textStyles.fontStyle,
            fontWeight = textStyles.fontWeight,
            fontFamily = textStyles.fontFamily,
            letterSpacing = textStyles.letterSpacing,
            textDecoration = textStyles.textDecoration,
            textAlign = textStyles.textAlign,
            lineHeight = textStyles.lineHeight,
            overflow = textStyles.overflow,
            softWrap = textStyles.softWrap,
            maxLines = textStyles.maxLines,
            minLines = textStyles.minLines,
            onTextLayout = textStyles.onTextLayout,
        )
    }
}