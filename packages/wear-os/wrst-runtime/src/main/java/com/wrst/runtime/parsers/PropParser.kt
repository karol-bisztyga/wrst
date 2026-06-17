package com.wrst.runtime.parsers

import androidx.compose.ui.graphics.Color
import com.wrst.runtime.ErrorHandler

data class EdgeInsets(
    val top: Float = 0f,
    val right: Float = 0f,
    val bottom: Float = 0f,
    val left: Float = 0f
)

abstract class PropParser {
    public fun parseColor(value: String?): Color {
        if (value.isNullOrBlank()) {
            return Color.Unspecified
        }

        // #RGB
        if (value.matches(Regex("^#[0-9a-fA-F]{3}$"))) {
            val hex = value.substring(1)
            val r = (hex[0].digitToInt(16) * 17) / 255f
            val g = (hex[1].digitToInt(16) * 17) / 255f
            val b = (hex[2].digitToInt(16) * 17) / 255f
            return Color(red = r, green = g, blue = b, alpha = 1f)
        }

        // #RRGGBB
        if (value.matches(Regex("^#[0-9a-fA-F]{6}$"))) {
            val hex = value.substring(1)
            val r = hex.substring(0, 2).toInt(16) / 255f
            val g = hex.substring(2, 4).toInt(16) / 255f
            val b = hex.substring(4, 6).toInt(16) / 255f
            return Color(red = r, green = g, blue = b, alpha = 1f)
        }

        // #RRGGBBAA
        if (value.matches(Regex("^#[0-9a-fA-F]{8}$"))) {
            val hex = value.substring(1)
            val r = hex.substring(0, 2).toInt(16) / 255f
            val g = hex.substring(2, 4).toInt(16) / 255f
            val b = hex.substring(4, 6).toInt(16) / 255f
            val a = hex.substring(6, 8).toInt(16) / 255f
            return Color(red = r, green = g, blue = b, alpha = a)
        }

        // rgb(r, g, b)
        val rgbMatch = Regex("""^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$""", RegexOption.IGNORE_CASE).find(value)
        if (rgbMatch != null) {
            val r = rgbMatch.groupValues[1].toInt() / 255f
            val g = rgbMatch.groupValues[2].toInt() / 255f
            val b = rgbMatch.groupValues[3].toInt() / 255f
            return Color(red = r, green = g, blue = b, alpha = 1f)
        }

        // rgba(r, g, b, a)
        val rgbaMatch = Regex("""^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$""", RegexOption.IGNORE_CASE).find(value)
        if (rgbaMatch != null) {
            val r = rgbaMatch.groupValues[1].toInt() / 255f
            val g = rgbaMatch.groupValues[2].toInt() / 255f
            val b = rgbaMatch.groupValues[3].toInt() / 255f
            val a = rgbaMatch.groupValues[4].toFloat()
            return Color(red = r, green = g, blue = b, alpha = a)
        }

        ErrorHandler.set("invalid color value: $value, supported formats: r,g,b,a | #RGB | #RRGGBB | #RRGGBBAA | rgb() | rgba()")
        return Color.Unspecified
    }

    public fun parseEdgeInsets(value: Any?): EdgeInsets {
        if (value == null) return EdgeInsets()

        // Raw number from JS: padding: 10
        if (value is Number) {
            val v = value.toFloat()
            return EdgeInsets(top = v, right = v, bottom = v, left = v)
        }

        val str = value.toString().trim()
        if (str.isBlank()) return EdgeInsets()

        // Support both space-separated (raw JS: "10 20") and comma-separated (legacy)
        val separator = if (str.contains(",")) "," else " "

        return try {
            val parts = str.split(separator).map { it.trim().toFloat() }
            when (parts.size) {
                1 -> EdgeInsets(top = parts[0], right = parts[0], bottom = parts[0], left = parts[0])
                2 -> EdgeInsets(top = parts[0], right = parts[1], bottom = parts[0], left = parts[1])
                4 -> EdgeInsets(top = parts[0], right = parts[1], bottom = parts[2], left = parts[3])
                else -> throw Exception()
            }
        } catch (_: Exception) {
            ErrorHandler.set("invalid edge insets value: $value, supported formats: <all> | <vertical> <horizontal> | <top> <right> <bottom> <left>")
            return EdgeInsets()
        }
    }

    public fun isEdgeInsetsZero(edgeInsets: EdgeInsets): Boolean {
        return  edgeInsets.top == 0f &&
                edgeInsets.right == 0f &&
                edgeInsets.bottom == 0f &&
                edgeInsets.left == 0f
    }

    fun parseFloat(value: Any?, fallback: Float = 0f, customErrorMessage: String? = null): Float {
        val errorMessage = customErrorMessage ?: "invalid float value: $value"
        if (value == null) return fallback
        return when (value) {
            is Int -> value.toFloat()
            is Double -> value.toFloat()
            is Float -> value
            is Long -> value.toFloat()
            is String -> value.toFloatOrNull() ?: run {
                if (value != "") ErrorHandler.set(errorMessage)
                fallback
            }
            else -> {
                ErrorHandler.set(errorMessage)
                fallback
            }
        }
    }

    fun parseInt(value: Any?, fallback: Int, customErrorMessage: String? = null): Int {
        val errorMessage = customErrorMessage ?: "invalid int value: $value"
        if (value == null) return fallback
        return when (value) {
            is Int -> value
            is Long -> value.toInt()
            is Double -> value.toInt()
            is Float -> value.toInt()
            is String -> value.toIntOrNull() ?: run {
                if (value != "") ErrorHandler.set(errorMessage)
                fallback
            }
            else -> {
                ErrorHandler.set(errorMessage)
                fallback
            }
        }
    }
}