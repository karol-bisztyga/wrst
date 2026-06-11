package com.wrst.runtime

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.Text

object ErrorHandler {
    val error = mutableStateOf<String?>(null)
    var onReload: (() -> Unit)? = null

    fun isError(): Boolean {
        return error.value != null
    }

    fun set(message: String?) {
        error.value = message
    }

    @Composable
    fun Render() {
        if (error.value == null) return
        Log.e("ErrorHandler", error.value!!)
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
                .padding(18.dp, 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Button(onClick = { onReload?.invoke() }, modifier = Modifier.width(100.dp).height(20.dp)) {
                Text(
                    text = "Reload",
                    color = Color.Red,
                    textAlign = TextAlign.Center
                )
            }
            Box (modifier = Modifier.fillMaxWidth().height(6.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.Black)
                    .verticalScroll(rememberScrollState()),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = error.value!!,
                    color = Color.Red,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
