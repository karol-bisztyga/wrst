package com.wrst.runtime.parsers

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import com.wrst.runtime.ErrorHandler
import com.wrst.runtime.StateRegistry
import org.json.JSONObject

data class TextStyles(
    val color: Color = Color.Unspecified,
    val fontSize: TextUnit = TextUnit.Unspecified,
    val fontStyle: FontStyle? = null,
    val fontWeight: FontWeight? = null,
    val fontFamily: FontFamily? = null,
    val letterSpacing: TextUnit = TextUnit.Unspecified,
    val textDecoration: TextDecoration? = null,
    val textAlign: TextAlign? = null,
    val lineHeight: TextUnit = TextUnit.Unspecified,
    val overflow: TextOverflow = TextOverflow.Clip,
    val softWrap: Boolean = true,
    val maxLines: Int = Int.MAX_VALUE,
    val minLines: Int = 1,
    val onTextLayout: (TextLayoutResult) -> Unit = {}
)

class TextStyleParser : PropParser() {
    fun parse(props: JSONObject): TextStyles {
        return TextStyles(
            color = parseColor(
                StateRegistry.resolve(props.opt("color")) as? String
            ),

            fontSize = parseTextUnit(
                StateRegistry.resolve(props.opt("fontSize"))
            ),

            fontStyle = parseFontStyle(
                StateRegistry.resolve(props.opt("fontStyle")) as? String
            ),

            fontWeight = parseFontWeight(
                StateRegistry.resolve(props.opt("fontWeight"))
            ),

            fontFamily = parseFontFamily(
                StateRegistry.resolve(props.opt("fontFamily")) as? String
            ),

            letterSpacing = parseTextUnit(
                StateRegistry.resolve(props.opt("letterSpacing"))
            ),

            textDecoration = parseTextDecoration(
                StateRegistry.resolve(props.opt("textDecoration")) as? String
            ),

            textAlign = parseTextAlign(
                StateRegistry.resolve(props.opt("textAlign")) as? String
            ),

            lineHeight = parseTextUnit(
                StateRegistry.resolve(props.opt("lineHeight"))
            ),

            overflow = parseOverflow(
                StateRegistry.resolve(props.opt("textOverflow")) as? String
            ),

            softWrap = StateRegistry.resolve(props.opt("softWrap")) as? Boolean ?: true,

            maxLines = parseInt(
                StateRegistry.resolve(props.opt("maxLines")),
                Int.MAX_VALUE
            ),

            minLines = parseInt(
                StateRegistry.resolve(props.opt("minLines")),
                1
            )
        )
    }

    private fun parseTextUnit(value: Any?): TextUnit {
        val number = parseFloat(value)

        return if (number > 0f) {
            number.sp
        } else {
            TextUnit.Unspecified
        }
    }

    private fun parseFontStyle(value: String?): FontStyle? {
        if (value.isNullOrBlank()) return null
        return when (value.lowercase()) {
            "italic" -> FontStyle.Italic
            "normal" -> FontStyle.Normal
            else -> {
                ErrorHandler.set("invalid font style value: $value, supported values: italic, normal")
                null
            }
        }
    }

    private fun parseFontWeight(value: Any?): FontWeight? {
        if (value == null) return FontWeight.Normal
        return when (parseInt(value, 400)) {
            100 -> FontWeight.Thin
            200 -> FontWeight.ExtraLight
            300 -> FontWeight.Light
            400 -> FontWeight.Normal
            500 -> FontWeight.Medium
            600 -> FontWeight.SemiBold
            700 -> FontWeight.Bold
            800 -> FontWeight.ExtraBold
            900 -> FontWeight.Black
            else -> {
                ErrorHandler.set("invalid font weight value: $value, supported values: 100, 200, 300, 400, 500, 600, 700, 800, 900")
                FontWeight.Normal
            }
        }
    }

    private fun parseFontFamily(value: String?): FontFamily? {
        if (value.isNullOrBlank()) return null
        return when (value.lowercase()) {
            "sansserif" -> FontFamily.SansSerif
            "serif" -> FontFamily.Serif
            "monospace" -> FontFamily.Monospace
            "cursive" -> FontFamily.Cursive
            else -> {
                ErrorHandler.set("invalid font family value: $value, supported values: sansserif, serif, monospace, cursive")
                null
            }
        }
    }

    private fun parseTextDecoration(value: String?): TextDecoration? {
        if (value.isNullOrBlank()) return null
        return when (value.lowercase()) {
            "underline" -> TextDecoration.Underline
            "line-through" -> TextDecoration.LineThrough
            "underline line-through" -> TextDecoration.combine(
                listOf(TextDecoration.Underline, TextDecoration.LineThrough)
            )
            else -> {
                ErrorHandler.set("invalid text decoration value: $value, supported values: underline, line-through, underline line-through")
                null
            }
        }
    }

    private fun parseTextAlign(value: String?): TextAlign? {
        if (value.isNullOrBlank()) return null
        return when (value.lowercase()) {
            "left" -> TextAlign.Left
            "center" -> TextAlign.Center
            "right" -> TextAlign.Right
            "justify" -> TextAlign.Justify
            "start" -> TextAlign.Start
            "end" -> TextAlign.End
            else -> {
                ErrorHandler.set("invalid text align value: $value, supported values: left, center, right, justify, start, end")
                null
            }
        }
    }

    private fun parseOverflow(value: String?): TextOverflow {
        if (value.isNullOrBlank()) return TextOverflow.Clip
        return when (value.lowercase()) {
            "ellipsis" -> TextOverflow.Ellipsis
            "visible" -> TextOverflow.Visible
            "clip" -> TextOverflow.Clip
            else -> {
                ErrorHandler.set("invalid text overflow value: $value, supported values: ellipsis, visible, clip")
                TextOverflow.Clip
            }
        }
    }
}