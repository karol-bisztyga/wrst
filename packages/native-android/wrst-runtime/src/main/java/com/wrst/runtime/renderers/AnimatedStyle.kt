package com.wrst.runtime.renderers

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.DefaultShadowColor
import androidx.compose.ui.unit.dp
import com.wrst.runtime.StateRegistry
import org.json.JSONObject

// The animated counterpart of StyleParser.parse: builds the same Modifier but
// eases the animatable values (size / backgroundColor / opacity / offset /
// borderRadius) via Compose's animate*AsState, so a state change transitions
// smoothly instead of snapping. Used by ViewRenderer when `animate` is set.
// Gradient + shadow are applied (not animated). iOS twin: TreeView.boxContainer's
// .animation(value:).
@Composable
fun animatedStyleModifier(style: JSONObject): Modifier {
    val p = StyleParser() // reuse the parse helpers (parseColor / parseEdgeInsets / ...)

    val bgTarget = p.parseColor(StateRegistry.resolve(style.opt("backgroundColor")) as? String)
    val borderColor = p.parseColor(StateRegistry.resolve(style.opt("borderColor")) as? String)
    val borderWidth = p.parseFloat(StateRegistry.resolve(style.opt("borderWidth")))
    val radiusTarget = p.parseFloat(StateRegistry.resolve(style.opt("borderRadius")))
    val padding = p.parseEdgeInsets(StateRegistry.resolve(style.opt("padding")))
    val opacityTarget = (StateRegistry.resolve(style.opt("opacity")) as? Number)?.toFloat() ?: 1f
    val xTarget = p.parseFloat(StateRegistry.resolve(style.opt("x")))
    val yTarget = p.parseFloat(StateRegistry.resolve(style.opt("y")))

    val sizeStr = StateRegistry.resolve(style.opt("size"))?.toString() ?: ""
    val widthStr = if (sizeStr == "") StateRegistry.resolve(style.opt("width"))?.toString() ?: "" else sizeStr
    val heightStr = if (sizeStr == "") StateRegistry.resolve(style.opt("height"))?.toString() ?: "" else sizeStr
    val widthFill = widthStr == "fill"
    val heightFill = heightStr == "fill"
    val widthVal = if (widthFill) 0f else p.parseFloat(widthStr)
    val heightVal = if (heightFill) 0f else p.parseFloat(heightStr)

    val brush = p.parseGradient(style.optJSONObject("gradient"))

    // Animated values.
    val bg by animateColorAsState(
        if (bgTarget == Color.Unspecified) Color.Transparent else bgTarget, label = "bg")
    val radius by animateDpAsState(radiusTarget.dp, label = "radius")
    val opacity by animateFloatAsState(opacityTarget, label = "opacity")
    val x by animateDpAsState(xTarget.dp, label = "x")
    val y by animateDpAsState(yTarget.dp, label = "y")
    val w by animateDpAsState(widthVal.dp, label = "w")
    val h by animateDpAsState(heightVal.dp, label = "h")

    var modifier: Modifier = Modifier

    if (widthFill) modifier = modifier.fillMaxWidth() else if (widthVal > 0f) modifier = modifier.width(w)
    if (heightFill) modifier = modifier.fillMaxHeight() else if (heightVal > 0f) modifier = modifier.height(h)

    val shape = RoundedCornerShape(radius)

    // shadow (not animated) - behind clip/background
    val shadowObj = style.optJSONObject("shadow")
    if (shadowObj != null) {
        val sRadius = p.parseFloat(StateRegistry.resolve(shadowObj.opt("radius")))
        if (sRadius > 0f) {
            val sColor = p.parseColor(StateRegistry.resolve(shadowObj.opt("color")) as? String)
            val resolved = if (sColor != Color.Unspecified) sColor else DefaultShadowColor
            modifier = modifier.shadow(sRadius.dp, shape, ambientColor = resolved, spotColor = resolved)
        }
    }

    if (radiusTarget > 0f) modifier = modifier.clip(shape)

    if (brush != null) {
        modifier = modifier.background(brush = brush, shape = shape)
    } else if (bgTarget != Color.Unspecified) {
        modifier = modifier.background(color = bg, shape = shape)
    }

    if (borderWidth > 0f && borderColor != Color.Unspecified) {
        modifier = modifier.border(borderWidth.dp, borderColor, shape)
    }

    if (!p.isEdgeInsetsZero(padding)) {
        modifier = modifier.padding(padding.left.dp, padding.top.dp, padding.right.dp, padding.bottom.dp)
    }

    modifier = modifier.alpha(opacity)

    if (xTarget > 0f || yTarget > 0f) modifier = modifier.offset(x, y)

    return modifier
}
