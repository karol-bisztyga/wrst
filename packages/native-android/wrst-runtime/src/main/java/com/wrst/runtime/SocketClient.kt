package com.wrst.runtime

import android.os.Build
import android.util.Log
import okhttp3.*
import org.json.JSONObject

// The dev server host as seen from a Wear OS emulator (10.0.2.2 aliases the host
// machine's localhost). Physical-device support comes with the CLI (Phase H/I).
const val EMULATOR_HOST_IP = "10.0.2.2"

class SocketClient {

    private val client = OkHttpClient()
    private var webSocket: WebSocket? = null

    private var onMessageReceived: ((String) -> Unit)? = null

    fun setListener(listener: (String) -> Unit) {
        onMessageReceived = listener
    }

    fun connect() {
        val request = Request.Builder()
            .url("ws://${EMULATOR_HOST_IP}:8082")
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {

            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d("SocketClient", "[ws] connected")
                // Identify this device to the dev server (for the `l` key binding).
                val hello = JSONObject().apply {
                    put("type", "hello")
                    put("name", "${Build.MANUFACTURER} ${Build.MODEL}")
                }
                webSocket.send(hello.toString())
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d("SocketClient", "[ws] message: $text")
                // Server only sends a re-pull nudge; the HTTP response is authoritative.
                pullCode()
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.d("SocketClient", "[ws] closing: $code / $reason")
                webSocket.close(1000, null)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d("SocketClient", "[ws] closed: $code / $reason")
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e("SocketClient", "[ws] error: ${t.message}")
                ErrorHandler.set("[ws] error: ${t.message}")
            }
        })
    }

    fun pullCode() {
        val request = Request.Builder()
            .url("http://${EMULATOR_HOST_IP}:8081/bundle.js")
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: java.io.IOException) {
                Log.e("SocketClient", "[http] fetch failed: ${e.message}")
                ErrorHandler.set("[http] fetch failed: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                Log.d("SocketClient", "onResponse: ${response.code}")
                if (response.code == 503) {
                    // No bundle built yet - wait for a build
                    Log.d("SocketClient", "[http] bundle not ready, waiting for build")
                    return
                }

                val body = response.body.string()
                if (response.code == 422) {
                    // Server is hosting a build error instead of the bundle
                    ErrorHandler.set(if (body.isNotEmpty()) body else "Build failed")
                    return
                }
                if (!response.isSuccessful) {
                    Log.e("SocketClient", "[http] bad response: ${response.code}")
                    ErrorHandler.set("[http] bad response: ${response.code}")
                    return
                }

                Log.d("SocketClient", "[http] bundle fetched (${body.length} chars)")
                ErrorHandler.set(null);
                onMessageReceived?.invoke(body)
            }
        })
    }

    fun send(message: String) {
        webSocket?.send(message)
    }

    fun disconnect() {
        webSocket?.close(1000, "bye")
    }
}