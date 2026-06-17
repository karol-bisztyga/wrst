package com.wrst.runtime.renderers

import android.app.RemoteInput
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material.Text
import com.wrst.runtime.JsRuntimeManager
import com.wrst.runtime.StateRegistry
import kotlinx.coroutines.launch
import org.json.JSONObject

// Text field. Tapping launches the Wear system input activity (keyboard /
// handwriting / voice) via RemoteInput and reports the committed text via
// call(onChange, text). Uses the framework RemoteInput + the well-known Wear
// launch constants (the same values androidx.wear.input uses) so no extra
// dependency is needed. SwiftUI twin: TreeView.textInputView.
object TextInputRenderer {
    private const val RESULT_KEY = "wrst_text"
    private const val ACTION_REMOTE_INPUT = "android.support.wearable.input.action.REMOTE_INPUT"
    private const val EXTRA_REMOTE_INPUTS = "android.support.wearable.input.extra.REMOTE_INPUTS"

    @Composable
    fun Render(obj: JSONObject) {
        val props = obj.optJSONObject("props") ?: JSONObject()
        if (StateRegistry.resolve(props.opt("hidden")) as? Boolean == true) return

        val value = StateRegistry.resolve(props.opt("value")) as? String ?: ""
        val placeholder = StateRegistry.resolve(props.opt("placeholder")) as? String ?: ""
        val onChange = props.optString("onChange")
        val scope = rememberCoroutineScope()
        val style = StateRegistry.resolveStyle(props)
        val modifier = StyleParser().parse(style)
        val (contentAlignment, _, _) = ContainerStyleParser().parse(style)

        val launcher = rememberLauncherForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) { result ->
            val text = RemoteInput.getResultsFromIntent(result.data)
                ?.getCharSequence(RESULT_KEY)?.toString()
            if (text != null && onChange.isNotEmpty()) {
                // JSONObject.quote → a properly escaped JS string literal.
                scope.launch { JsRuntimeManager.call(onChange, JSONObject.quote(text)) }
            }
        }

        Box(
            modifier = modifier.clickable {
                val remoteInput = RemoteInput.Builder(RESULT_KEY)
                    .setLabel(placeholder.ifEmpty { "Text" })
                    .build()
                val intent = Intent(ACTION_REMOTE_INPUT)
                    .putExtra(EXTRA_REMOTE_INPUTS, arrayOf(remoteInput))
                runCatching { launcher.launch(intent) }
            },
            contentAlignment = contentAlignment,
        ) {
            if (value.isEmpty()) {
                Text(placeholder, color = Color(0xFF888888))
            } else {
                Text(value)
            }
        }
    }
}
