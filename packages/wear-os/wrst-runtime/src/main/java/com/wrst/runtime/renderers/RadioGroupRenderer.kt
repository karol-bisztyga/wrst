package com.wrst.runtime.renderers

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.RadioButton
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.ToggleChip
import com.wrst.runtime.JsRuntimeManager
import com.wrst.runtime.StateRegistry
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

// Vertical single-select list: one ToggleChip + RadioButton per option. Reports
// the selected index via call(onChange, index). SwiftUI twin: TreeView.radioGroupView.
object RadioGroupRenderer {
    @Composable
    fun Render(obj: JSONObject) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        if (StateRegistry.resolve(props.opt("hidden")) as? Boolean == true) return

        val resolved = StateRegistry.resolve(props.opt("options"))
        val options: List<String> = when (resolved) {
            is JSONArray -> (0 until resolved.length()).map { resolved.optString(it) }
            is List<*> -> resolved.map { it.toString() }
            else -> emptyList()
        }
        val selected = (StateRegistry.resolve(props.opt("selectedIndex")) as? Number)?.toInt() ?: 0
        val onChange = props.optString("onChange")
        val scope = rememberCoroutineScope()
        val modifier = StyleParser().parse(StateRegistry.resolveStyle(props))

        Column(modifier = modifier.fillMaxWidth()) {
            options.forEachIndexed { i, opt ->
                ToggleChip(
                    checked = i == selected,
                    onCheckedChange = { checked ->
                        if (checked && onChange.isNotEmpty()) {
                            scope.launch { JsRuntimeManager.call(onChange, i.toString()) }
                        }
                    },
                    label = { Text(opt) },
                    toggleControl = { RadioButton(selected = i == selected) },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(4.dp))
            }
        }
    }
}
