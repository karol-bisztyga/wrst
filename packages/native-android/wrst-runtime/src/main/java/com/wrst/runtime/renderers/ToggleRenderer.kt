package com.wrst.runtime.renderers

import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.wear.compose.material.Switch
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.ToggleChip
import com.wrst.runtime.JsRuntimeManager
import com.wrst.runtime.StateRegistry
import kotlinx.coroutines.launch
import org.json.JSONObject

// On/off switch. Pushes the new boolean to JS via call(onChange, value).
// SwiftUI twin: TreeView.toggleView.
object ToggleRenderer {
    @Composable
    fun Render(obj: JSONObject) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        if (StateRegistry.resolve(props.opt("hidden")) as? Boolean == true) return

        val value = StateRegistry.resolve(props.opt("value")) as? Boolean ?: false
        val label = StateRegistry.resolve(props.opt("label")) as? String ?: ""
        val onChange = props.optString("onChange")
        val scope = rememberCoroutineScope()
        val modifier = StyleParser().parse(StateRegistry.resolveStyle(props))

        ToggleChip(
            checked = value,
            onCheckedChange = { v ->
                if (onChange.isNotEmpty()) scope.launch { JsRuntimeManager.call(onChange, v.toString()) }
            },
            label = { Text(label) },
            toggleControl = { Switch(checked = value) },
            modifier = modifier,
        )
    }
}
