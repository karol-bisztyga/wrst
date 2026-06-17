package com.wrst.runtime

import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.graphics.Color
import com.wrst.runtime.parsers.PropParser

// App-wide config set from JS via createAppConfig(). Values live in Compose
// state so changes apply on hot reload (after the bundle re-evaluates).
object AppConfig {
    private val parser = object : PropParser() {}

    private val DEFAULT_BACKGROUND = Color.Black

    val backgroundColor = mutableStateOf(DEFAULT_BACKGROUND)

    fun setBackgroundColor(raw: String) {
        val color = parser.parseColor(raw)
        if (color == Color.Unspecified) {
            throw IllegalArgumentException(
                "invalid appBackgroundColor: \"$raw\" " +
                    "(supported: #RGB | #RRGGBB | #RRGGBBAA | rgb() | rgba())"
            )
        }
        backgroundColor.value = color
    }

    // Reset to defaults before each bundle load so a reload that omits
    // createAppConfig falls back instead of keeping the previous value.
    fun reset() {
        backgroundColor.value = DEFAULT_BACKGROUND
    }
}
