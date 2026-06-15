package com.wrst.runtime

import android.util.Log
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.wear.compose.material.Text
import org.json.JSONObject

import androidx.compose.ui.graphics.Color
import com.wrst.runtime.renderers.ButtonRenderer
import com.wrst.runtime.renderers.CrownRenderer
import com.wrst.runtime.renderers.HorizontalViewRenderer
import com.wrst.runtime.renderers.IconRenderer
import com.wrst.runtime.renderers.ImageRenderer
import com.wrst.runtime.renderers.ListRenderer
import com.wrst.runtime.renderers.PickerRenderer
import com.wrst.runtime.renderers.ProgressRenderer
import com.wrst.runtime.renderers.RadioGroupRenderer
import com.wrst.runtime.renderers.ScalingScrollViewRenderer
import com.wrst.runtime.renderers.ScrollViewRenderer
import com.wrst.runtime.renderers.SliderRenderer
import com.wrst.runtime.renderers.StepperRenderer
import com.wrst.runtime.renderers.TextInputRenderer
import com.wrst.runtime.renderers.TextRenderer
import com.wrst.runtime.renderers.ToggleRenderer
import com.wrst.runtime.renderers.TouchableRenderer
import com.wrst.runtime.renderers.VerticalViewRenderer
import com.wrst.runtime.renderers.ViewRenderer

class Renderer {
    @Composable
    fun Render(json: String) {
        val obj = JSONObject(json)
        val type = obj.getString("type")

        when (type) {
            "View" -> {
                ViewRenderer.Render(obj, { child ->
                    Render(child)
                })
            }
            "VerticalView" -> {
                VerticalViewRenderer.Render(obj, { child ->
                    Render(child)
                })
            }
            "HorizontalView" -> {
                HorizontalViewRenderer.Render(obj, { child ->
                    Render(child)
                })
            }
            "Text" -> {
                TextRenderer.Render(obj)
            }
            "Icon" -> {
                IconRenderer.Render(obj)
            }
            "Progress" -> {
                ProgressRenderer.Render(obj)
            }
            "Image" -> {
                ImageRenderer.Render(obj) { child -> Render(child) }
            }
            "Button" -> {
                ButtonRenderer.Render(obj) { child -> Render(child) }
            }
            "List" -> {
                ListRenderer.Render(obj) { child -> Render(child) }
            }
            "ScrollView" -> {
                ScrollViewRenderer.Render(obj) { child -> Render(child) }
            }
            "ScalingScrollView" -> {
                ScalingScrollViewRenderer.Render(obj) { child -> Render(child) }
            }
            "Toggle" -> {
                ToggleRenderer.Render(obj)
            }
            "Slider" -> {
                SliderRenderer.Render(obj)
            }
            "Stepper" -> {
                StepperRenderer.Render(obj)
            }
            "Picker" -> {
                PickerRenderer.Render(obj)
            }
            "RadioGroup" -> {
                RadioGroupRenderer.Render(obj)
            }
            "Crown" -> {
                CrownRenderer.Render(obj) { child -> Render(child) }
            }
            "TextInput" -> {
                TextInputRenderer.Render(obj)
            }
            "Touchable" -> {
                TouchableRenderer.Render(obj) { child -> Render(child) }
            }

            else -> {
                Text("Unknown node: ${obj.getString("type")}", color = Color.Red)
            }
        }
    }
}