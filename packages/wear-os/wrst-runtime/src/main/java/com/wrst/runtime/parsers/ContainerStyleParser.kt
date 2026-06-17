package com.wrst.runtime.renderers

import androidx.compose.ui.Alignment
import com.wrst.runtime.StateRegistry
import com.wrst.runtime.parsers.PropParser
import org.json.JSONObject

data class ContainerStyleParserResult(
    val contentAlignment: Alignment,
    val verticalAlignment: Alignment.Vertical,
    val horizontalAlignment: Alignment.Horizontal,
)

class ContainerStyleParser : PropParser() {
    fun parse(props: JSONObject): ContainerStyleParserResult {

        val verticalValue =
            StateRegistry.resolve(props.opt("verticalAlignment"))?.toString() ?: "start"

        val horizontalValue =
            StateRegistry.resolve(props.opt("horizontalAlignment"))?.toString() ?: "start"

        val verticalAlignment =
            when (verticalValue) {
                "center" -> Alignment.CenterVertically
                "end" -> Alignment.Bottom
                else -> Alignment.Top
            }

        val horizontalAlignment =
            when (horizontalValue) {
                "center" -> Alignment.CenterHorizontally
                "end" -> Alignment.End

                else -> Alignment.Start
            }

        val contentAlignment =
            when (verticalValue to horizontalValue) {
                "start" to "start" -> Alignment.TopStart
                "start" to "center" -> Alignment.TopCenter
                "start" to "end" -> Alignment.TopEnd

                "center" to "start" -> Alignment.CenterStart
                "center" to "center" -> Alignment.Center
                "center" to "end" -> Alignment.CenterEnd

                "end" to "start" -> Alignment.BottomStart
                "end" to "center" -> Alignment.BottomCenter
                "end" to "end" -> Alignment.BottomEnd

                else -> Alignment.TopStart
            }

        return ContainerStyleParserResult(
            contentAlignment = contentAlignment,
            verticalAlignment = verticalAlignment,
            horizontalAlignment = horizontalAlignment,
        )
    }
}