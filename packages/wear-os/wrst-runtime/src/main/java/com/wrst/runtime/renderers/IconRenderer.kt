package com.wrst.runtime.renderers

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.wear.compose.material.Icon
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Warning
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.wrst.runtime.StateRegistry
import org.json.JSONObject

// Renders an Icon node: maps the cross-platform name to a Material icon, tints
// and sizes it. The SF-Symbols twin lives in iOS TreeView.iconView.
object IconRenderer {
    @Composable
    fun Render(obj: JSONObject) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        if (StateRegistry.resolve(props.opt("hidden")) as? Boolean == true) return

        val name = StateRegistry.resolve(props.opt("name")) as? String ?: ""
        val size = (StateRegistry.resolve(props.opt("size")) as? Number)?.toFloat() ?: 24f
        val colorStr = StateRegistry.resolve(props.opt("color")) as? String

        val parser = StyleParser()
        val modifier = parser.parse(StateRegistry.resolveStyle(props))
        val tint = parser.parseColor(colorStr).let { if (it == Color.Unspecified) Color.White else it }

        Icon(
            imageVector = iconFor(name),
            contentDescription = name,
            tint = tint,
            modifier = modifier.size(size.dp),
        )
    }

    private fun iconFor(name: String): ImageVector = when (name) {
        "home" -> Icons.Filled.Home
        "search" -> Icons.Filled.Search
        "settings" -> Icons.Filled.Settings
        "heart" -> Icons.Filled.Favorite
        "star" -> Icons.Filled.Star
        "check" -> Icons.Filled.Check
        "close" -> Icons.Filled.Close
        "add" -> Icons.Filled.Add
        "delete" -> Icons.Filled.Delete
        "edit" -> Icons.Filled.Edit
        "back" -> Icons.Filled.ArrowBack
        "forward" -> Icons.Filled.ArrowForward
        "play" -> Icons.Filled.PlayArrow
        "info" -> Icons.Filled.Info
        "warning" -> Icons.Filled.Warning
        "share" -> Icons.Filled.Share
        "menu" -> Icons.Filled.Menu
        "refresh" -> Icons.Filled.Refresh
        "person" -> Icons.Filled.Person
        "notifications" -> Icons.Filled.Notifications
        else -> Icons.Filled.Star
    }
}
