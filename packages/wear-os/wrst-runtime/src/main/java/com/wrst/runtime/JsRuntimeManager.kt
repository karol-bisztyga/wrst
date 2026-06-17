package com.wrst.runtime

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.dokar.quickjs.QuickJs
import com.dokar.quickjs.binding.define
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.concurrent.ConcurrentHashMap
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

object JsRuntimeManager {
    private var quickJs: QuickJs? = null
    private val mutex = Mutex()
    private val timerScope = CoroutineScope(Dispatchers.IO)
    private val timerJobs = ConcurrentHashMap<String, Job>()
    val rerenderChannel = Channel<Unit>(Channel.CONFLATED)
    val navigateChannel = Channel<Unit>(Channel.UNLIMITED)
    val goBackChannel = Channel<Unit>(Channel.UNLIMITED)

    // The JS↔native wire-contract version this host implements (see CONTRACT.md).
    // Must match the bundle's globalThis.__WRST_PROTOCOL__.
    private const val WRST_PROTOCOL_VERSION = 11

    // Decode the JSON args array JS passes to a native module into a List.
    private fun decodeModuleArgs(json: String): List<Any?> {
        val arr = try { JSONArray(json) } catch (e: Exception) { return emptyList() }
        return (0 until arr.length()).map { i -> if (arr.isNull(i)) null else arr.get(i) }
    }

    // Encode a native module's return value as a JSON string for JS (or null).
    private fun encodeModuleResult(value: Any?): String? = when (value) {
        null -> null
        is String -> JSONObject.quote(value)
        is Boolean, is Number -> value.toString()
        is JSONObject, is JSONArray -> value.toString()
        is Map<*, *> -> JSONObject(value).toString()
        is List<*> -> JSONArray(value).toString()
        else -> JSONObject.quote(value.toString())
    }

    private val httpClient: OkHttpClient = run {
        val trustAll = object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
            override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
        }
        val sslContext = SSLContext.getInstance("TLS").apply {
            init(null, arrayOf<TrustManager>(trustAll), SecureRandom())
        }
        OkHttpClient.Builder()
            .sslSocketFactory(sslContext.socketFactory, trustAll)
            .hostnameVerifier { _, _ -> true }
            .build()
    }
    private val startTime = System.nanoTime()

    // Disk-backed key/value store for the JS localStorage shim.
    private var prefs: SharedPreferences? = null

    // Dev-only: when set (debug builds with a dev-server connection), console.*
    // calls are forwarded here as (level, message) so the host can stream them
    // to the dev server. Null in release → logs go only to Logcat.
    @Volatile
    var logSink: ((level: String, message: String) -> Unit)? = null

    // Static device info for the JS `Device` global.
    private var deviceInfoJson: String =
        """{"platform":"wear-os","shape":"rect","dimensions":{"width":0,"height":0}}"""

    fun init(context: Context) {
        val app = context.applicationContext
        prefs = app.getSharedPreferences("wrst_storage", Context.MODE_PRIVATE)

        Permissions.init(app)

        // Engine motion sensors: sample → call(callbackId, sampleJson) in JS.
        Sensors.init(app)
        Sensors.setSampleHandler { callbackId, sampleJson ->
            timerScope.launch { call(callbackId, sampleJson) }
        }

        // Streaming native modules push to JS callbacks through the same path.
        WrstNativeModules.emitter = { callbackId, valueJson ->
            timerScope.launch { call(callbackId, valueJson) }
        }

        // Companion (phone↔watch link): start the Data Layer watcher and route its
        // status changes + incoming messages into the JS entry points. Guarded so
        // a host whose bundle doesn't import Companion is a no-op.
        CompanionManager.statusEmitter = { json -> timerScope.launch { companionStatus(json) } }
        CompanionManager.messageEmitter = { json -> timerScope.launch { companionMessage(json) } }
        CompanionManager.init(app)

        val config = app.resources.configuration
        deviceInfoJson = JSONObject().apply {
            put("platform", "wear-os")
            put("shape", if (config.isScreenRound) "round" else "rect")
            put("dimensions", JSONObject().apply {
                put("width", config.screenWidthDp)
                put("height", config.screenHeightDp)
            })
        }.toString()
    }

    private suspend fun createRuntime() = withContext(Dispatchers.IO) {
        // Stop any sensor listeners from a previous bundle before reloading.
        Sensors.stopAll()
        quickJs?.close()
        quickJs = QuickJs.create(Dispatchers.IO).apply {
            define("native") {
                function("log") { args: Array<Any?> ->
                    val m = args.joinToString(" ")
                    Log.d("JS", m); logSink?.invoke("log", m)
                }
                function("warn") { args: Array<Any?> ->
                    val m = args.joinToString(" ")
                    Log.w("JS", m); logSink?.invoke("warn", m)
                }
                function("error") { args: Array<Any?> ->
                    val m = args.joinToString(" ")
                    Log.e("JS", m); logSink?.invoke("error", m)
                }
                function("registerState") { args: Array<Any?> ->
                    val id = args.getOrNull(0) as? String ?: return@function
                    val value = args.getOrNull(1) ?: return@function
                    StateRegistry.register(id, value)
                }
                function("setState") { args: Array<Any?> ->
                    val id = args.getOrNull(0) as? String ?: return@function
                    val value = args.getOrNull(1) ?: return@function
                    StateRegistry.set(id, value)
                }
                function("getState") { args: Array<Any?> ->
                    val id = args.getOrNull(0) as? String ?: return@function null
                    StateRegistry.states[id]?.value
                }
                function("performanceNow") { _: Array<Any?> ->
                    (System.nanoTime() - startTime) / 1_000_000.0
                }
                function("nativeDeviceInfo") { _: Array<Any?> ->
                    deviceInfoJson
                }
                function("nativeSetShowHeader") { _: Array<Any?> ->
                    // No-op: Wear OS has no navigation header (Apple Watch only).
                    Unit
                }
                function("nativeSetTimeout") { args: Array<Any?> ->
                    val id = args.getOrNull(0) as? String ?: return@function
                    val delay = (args.getOrNull(1) as? Number)?.toLong() ?: 0L
                    val job = timerScope.launch {
                        delay(delay)
                        timerJobs.remove(id)
                        call(id)
                    }
                    timerJobs[id] = job
                }
                function("nativeClearTimeout") { args: Array<Any?> ->
                    val id = args.getOrNull(0) as? String ?: return@function
                    timerJobs[id]?.cancel()
                    timerJobs.remove(id)
                }
                function("nativeSetInterval") { args: Array<Any?> ->
                    val id = args.getOrNull(0) as? String ?: return@function
                    val delay = (args.getOrNull(1) as? Number)?.toLong() ?: 0L
                    val job = timerScope.launch {
                        while (isActive) {
                            delay(delay)
                            if (!isActive) break
                            call(id)
                        }
                    }
                    timerJobs[id] = job
                }
                function("nativeClearInterval") { args: Array<Any?> ->
                    val id = args.getOrNull(0) as? String ?: return@function
                    timerJobs[id]?.cancel()
                    timerJobs.remove(id)
                }
                function("nativeRerender") { _: Array<Any?> ->
                    rerenderChannel.trySend(Unit)
                    Unit
                }
                function("nativeNavigate") { _: Array<Any?> ->
                    navigateChannel.trySend(Unit)
                    Unit
                }
                function("nativeGoBack") { _: Array<Any?> ->
                    goBackChannel.trySend(Unit)
                    Unit
                }
                // Extension hook: dispatch to a host-registered native module.
                // args = [name, argsJson]; returns the module's JSON-encoded
                // result (or null if there's no such module / no result).
                function("nativeModuleCall") { args: Array<Any?> ->
                    val name = args.getOrNull(0) as? String ?: return@function null
                    val argsJson = args.getOrNull(1) as? String ?: "[]"
                    val handler = WrstNativeModules.handler(name) ?: return@function null
                    encodeModuleResult(handler(decodeModuleArgs(argsJson)))
                }
                // Engine sensors: native samples → call(callbackId, sampleJson).
                function("nativeSensorStart") { args: Array<Any?> ->
                    val type = args.getOrNull(0) as? String ?: return@function
                    val callbackId = args.getOrNull(1) as? String ?: return@function
                    val intervalMs = (args.getOrNull(2) as? Number)?.toLong() ?: 100L
                    Sensors.start(type, callbackId, intervalMs)
                }
                function("nativeSensorStop") { args: Array<Any?> ->
                    val callbackId = args.getOrNull(0) as? String ?: return@function
                    Sensors.stop(callbackId)
                }
                // Runtime permissions (layer 2): current status (sync) + request.
                function("nativePermissionStatus") { args: Array<Any?> ->
                    val name = args.getOrNull(0) as? String ?: return@function "undetermined"
                    Permissions.status(name)
                }
                function("nativePermissionRequest") { args: Array<Any?> ->
                    val name = args.getOrNull(0) as? String ?: return@function
                    val resolveId = args.getOrNull(1) as? String ?: return@function
                    Permissions.request(name) { status ->
                        timerScope.launch { call(resolveId, JSONObject.quote(status)) }
                    }
                }
                // Companion: sync snapshot read at startup + fire-and-forget send.
                // Link-status changes / incoming messages are pushed back into JS
                // via companionStatus()/companionMessage() (the __wrstCompanion*
                // entry points).
                function("nativeCompanionStatus") { _: Array<Any?> ->
                    CompanionManager.statusJSON()
                }
                function("nativeCompanionSend") { args: Array<Any?> ->
                    val json = args.getOrNull(0) as? String ?: return@function
                    CompanionManager.send(json)
                }
                function("nativeSetAppConfig") { args: Array<Any?> ->
                    val color = args.getOrNull(0) as? String
                        ?: throw IllegalArgumentException("appBackgroundColor must be a string")
                    AppConfig.setBackgroundColor(color)
                    Unit
                }
                function("nativeStorageGet") { args: Array<Any?> ->
                    val key = args.getOrNull(0) as? String ?: return@function null
                    prefs?.getString(key, null)
                }
                function("nativeStorageSet") { args: Array<Any?> ->
                    val key = args.getOrNull(0) as? String ?: return@function
                    val value = args.getOrNull(1) as? String ?: return@function
                    prefs?.edit()?.putString(key, value)?.apply()
                    Unit
                }
                function("nativeStorageRemove") { args: Array<Any?> ->
                    val key = args.getOrNull(0) as? String ?: return@function
                    prefs?.edit()?.remove(key)?.apply()
                    Unit
                }
                function("nativeStorageClear") { _: Array<Any?> ->
                    prefs?.edit()?.clear()?.apply()
                    Unit
                }
                function("nativeFetch") { args: Array<Any?> ->
                    val url = args.getOrNull(0) as? String ?: return@function
                    val optionsJson = args.getOrNull(1) as? String ?: "{}"
                    val resolveId = args.getOrNull(2) as? String ?: return@function
                    val rejectId = args.getOrNull(3) as? String ?: return@function

                    timerScope.launch {
                        try {
                            val options = JSONObject(optionsJson)
                            val method = options.optString("method", "GET").uppercase()
                            val headersObj = options.optJSONObject("headers")
                            val bodyStr = options.optString("body", "")

                            val requestBody = if (method != "GET" && method != "HEAD" && bodyStr.isNotEmpty())
                                bodyStr.toRequestBody("application/json".toMediaType())
                            else null

                            val requestBuilder = Request.Builder().url(url).method(method, requestBody)
                            headersObj?.keys()?.forEach { key ->
                                requestBuilder.addHeader(key, headersObj.getString(key))
                            }

                            val response = httpClient.newCall(requestBuilder.build()).execute()
                            val rawBody = response.body?.string() ?: ""
                            val jsonBody = try { JSONObject(rawBody) } catch (_: Exception) {
                                try { JSONArray(rawBody) } catch (_: Exception) { null }
                            }

                            val responseData = JSONObject().apply {
                                put("ok", response.isSuccessful)
                                put("status", response.code)
                                put("statusText", response.message)
                                put("rawBody", rawBody)
                                if (jsonBody != null) put("jsonBody", jsonBody)
                            }

                            call(resolveId, responseData.toString())
                        } catch (e: Exception) {
                            Log.e("JsRuntimeManager", "fetch error", e)
                            call(rejectId, JSONObject.quote(e.message ?: "fetch failed"))
                        }
                    }
                }
            }
        }
    }

    suspend fun load(code: String) = withContext(Dispatchers.IO) {
        Log.d("JsRuntimeManager", "loading code (${code.length} chars)")
        timerJobs.values.forEach { it.cancel() }
        timerJobs.clear()
        rerenderChannel.tryReceive()
        while (navigateChannel.tryReceive().isSuccess) {}
        while (goBackChannel.tryReceive().isSuccess) {}
        StateRegistry.clear()
        AppConfig.reset()
        ErrorHandler.set(null)
        mutex.withLock {
            createRuntime()
            try {
                // Tell the bundle whether this is a debug build (before it
                // evaluates, so createNavigation() can default
                // persistCurrentScreen on). iOS uses #if DEBUG.
                quickJs!!.evaluate<Any?>("globalThis.__WRST_DEBUG__ = ${AssetResolver.debug};")
                quickJs!!.evaluate<Unit>(code)
                Log.d("JsRuntimeManager", "code evaluated")
                val bundleProtocol =
                    (quickJs!!.evaluate<Any?>("globalThis.__WRST_PROTOCOL__") as? Number)?.toInt()
                if (bundleProtocol != WRST_PROTOCOL_VERSION) {
                    ErrorHandler.set(
                        "wrst protocol mismatch: bundle v${bundleProtocol ?: "?"}, " +
                            "runtime v$WRST_PROTOCOL_VERSION - update the app or the framework"
                    )
                }
            } catch (e: Exception) {
                Log.e("JsRuntimeManager", "load error", e)
                ErrorHandler.set(e.message ?: "Unknown error during bundle evaluation")
            }
        }
    }

    suspend fun render(): String? {
        ensureReady()
        return mutex.withLock {
            try {
                quickJs!!.evaluate("JSON.stringify(render())")
            } catch (e: Exception) {
                Log.e("JsRuntimeManager", "render error", e)
                ErrorHandler.set(e.message ?: "Unknown render error")
                null
            }
        }
    }

    // Rebuild the navigation stack at load time (see CONTRACT.md): one rendered
    // tree per stack level, bottom-first. [root] for a fresh start, or the whole
    // restored path when persistCurrentScreen kept one. Leaves the JS
    // currentRoute at the top. iOS twin: JSRuntime.navRestore().
    suspend fun navRestore(): List<String> {
        ensureReady()
        return mutex.withLock {
            try {
                val json = quickJs!!.evaluate<String>("__wrstNavRestore()")
                val arr = org.json.JSONArray(json)
                (0 until arr.length()).map { arr.getString(it) }
            } catch (e: Exception) {
                Log.e("JsRuntimeManager", "navRestore error", e)
                ErrorHandler.set(e.message ?: "Unknown navRestore error")
                emptyList()
            }
        }
    }

    // Sync the JS navigation stack back down after the host popped a screen
    // (swipe/system back or goBack()). See CONTRACT.md / __wrstBack.
    suspend fun back() {
        ensureReady()
        mutex.withLock {
            try {
                quickJs!!.evaluate<Any?>("__wrstBack()")
            } catch (e: Exception) {
                Log.e("JsRuntimeManager", "back error", e)
                ErrorHandler.set(e.message ?: "Unknown error in back")
            }
        }
    }

    // Push a companion link-status change into JS. Guarded - the entry point only
    // exists if the app imports Companion, and the runtime may not be loaded yet.
    // The status JSON is parsed by JS; its setState re-renders any reading views.
    suspend fun companionStatus(json: String) = withContext(Dispatchers.IO) {
        val qjs = quickJs ?: return@withContext
        mutex.withLock {
            try {
                qjs.evaluate<Any?>(
                    "if (typeof globalThis.__wrstCompanionStatus === 'function') " +
                        "globalThis.__wrstCompanionStatus(${JSONObject.quote(json)})"
                )
            } catch (e: Exception) {
                Log.e("JsRuntimeManager", "companionStatus error", e)
            }
        }
    }

    // Deliver an incoming message from the phone to JS onMessage handlers.
    suspend fun companionMessage(json: String) = withContext(Dispatchers.IO) {
        val qjs = quickJs ?: return@withContext
        mutex.withLock {
            try {
                qjs.evaluate<Any?>(
                    "if (typeof globalThis.__wrstCompanionMessage === 'function') " +
                        "globalThis.__wrstCompanionMessage(${JSONObject.quote(json)})"
                )
            } catch (e: Exception) {
                Log.e("JsRuntimeManager", "companionMessage error", e)
            }
        }
    }

    suspend fun call(id: String, vararg args: String): String {
        ensureReady()
        val argsStr = args.joinToString(", ")
        val callExpr = if (argsStr.isEmpty()) "call('${escape(id)}')"
                       else "call('${escape(id)}', $argsStr)"
        return mutex.withLock {
            try {
                quickJs!!.evaluate(callExpr)
            } catch (e: Exception) {
                Log.e("JsRuntimeManager", "call error", e)
                ErrorHandler.set(e.message ?: "Unknown error in callback")
                ""
            }
        }
    }

    private fun ensureReady() {
        if (quickJs == null) {
            ErrorHandler.set("Runtime not initialized. Call load() first.")
        }
    }

    fun close() {
        timerJobs.values.forEach { it.cancel() }
        timerJobs.clear()
        quickJs?.close()
        quickJs = null
    }

    private fun escape(input: String): String {
        return input.replace("'", "\\'")
    }
}
