package com.wrst.runtime.renderers

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp
import com.wrst.runtime.StateRegistry
import com.wrst.runtime.parsers.PropParser
import org.json.JSONObject

class StyleParser: PropParser() {
    fun parse(props: JSONObject): Modifier {
        val backgroundColor = parseColor(StateRegistry.resolve(props.opt("backgroundColor")) as? String)
        val borderColor = parseColor(StateRegistry.resolve(props.opt("borderColor")) as? String)

        val borderWidth = parseFloat(StateRegistry.resolve(props.opt("borderWidth")))
        val borderRadius = parseFloat(StateRegistry.resolve(props.opt("borderRadius")))

        val padding = parseEdgeInsets(StateRegistry.resolve(props.opt("padding")))

        val sizeStr = StateRegistry.resolve(props.opt("size"))?.toString() ?: ""
        val widthStr = if (sizeStr == "") StateRegistry.resolve(props.opt("width"))?.toString() ?: "" else sizeStr
        val heightStr = if (sizeStr == "") StateRegistry.resolve(props.opt("height"))?.toString() ?: "" else sizeStr

        val x = parseFloat(StateRegistry.resolve(props.opt("x")))
        val y = parseFloat(StateRegistry.resolve(props.opt("y")))

        val opacity = (StateRegistry.resolve(props.opt("opacity")) as? Number)?.toFloat() ?: 1.0f

        var modifier: Modifier = Modifier

        // size - width
        if (widthStr == "fill") {
            modifier = modifier.fillMaxWidth()
        } else {
            val width = parseFloat(widthStr, customErrorMessage = "invalid width value: $widthStr, supported formats: 'fill' | <number>")
            if (width > 0f) {
                modifier = modifier.width(width.dp)
            }
        }

        // size - height
        if (heightStr == "fill") {
            modifier = modifier.fillMaxHeight()
        } else {
            val height = parseFloat(heightStr, customErrorMessage = "invalid height value: $heightStr, supported formats: 'fill' | <number>")
            if (height > 0f) {
                modifier = modifier.height(height.dp)
            }
        }

        // shape
        val shape = RoundedCornerShape(borderRadius.dp)

        if (borderRadius > 0f) {
            modifier = modifier.clip(shape)
        }

        // background
        if (backgroundColor != Color.Unspecified) {
            modifier = modifier.background(
                color = backgroundColor,
                shape = shape
            )
        }

        // border
        if (borderWidth > 0f && borderColor != Color.Unspecified) {
            modifier = modifier.border(
                width = borderWidth.dp,
                color = borderColor,
                shape = shape
            )
        }

        // padding
        if (!isEdgeInsetsZero(padding)) {
            modifier = modifier.padding(
                padding.left.dp,
                padding.top.dp,
                padding.right.dp,
                padding.bottom.dp,
            )
        }

        // opacity
        modifier = modifier.alpha(opacity)

        if (x > 0f || y > 0f) {
            modifier = modifier.offset(x.dp, y.dp)
        }

        return modifier
    }
}