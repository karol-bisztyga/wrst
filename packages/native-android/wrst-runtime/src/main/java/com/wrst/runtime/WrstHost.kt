package com.wrst.runtime

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshots.SnapshotStateMap
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController

// The public entry point of the wrst runtime. A host app's Activity just does
// `setContent { WrstHost() }`; everything else (QuickJS, dev-server connection,
// navigation, rendering, hot reload) lives here. This is the Android twin of
// the iOS `WrstRootView`.
//
// Native capabilities (the extension hook) are registered separately via
// `WrstNativeModules.register(...)` and reached from app JS through
// `callNativeModule(name, ...args)`.

// Coalesces runtime permission requests (layer 2): multiple requestPermission()
// calls in the same tick become ONE system dialog, and requests arriving while a
// dialog is in flight are queued. All state is touched only on the main thread
// (every entry point hops through `post`), so no locking is needed.
private class PermissionCoordinator(
    private val launch: (Array<String>) -> Unit,
    private val post: (() -> Unit) -> Unit,
) {
    private val queue = mutableListOf<Pair<List<String>, (Boolean) -> Unit>>()
    private var inFlight: List<Pair<List<String>, (Boolean) -> Unit>>? = null
    private var scheduled = false

    fun request(perms: List<String>, cb: (Boolean) -> Unit) {
        post {
            queue.add(perms to cb)
            if (!scheduled) {
                scheduled = true
                post { scheduled = false; flush() }
            }
        }
    }

    private fun flush() {
        if (inFlight != null || queue.isEmpty()) return
        val batch = queue.toList()
        queue.clear()
        inFlight = batch
        launch(batch.flatMap { it.first }.distinct().toTypedArray())
    }

    fun onResult(result: Map<String, Boolean>) {
        val batch = inFlight ?: return
        inFlight = null
        batch.forEach { (perms, cb) -> cb(perms.all { result[it] == true }) }
        if (queue.isNotEmpty()) post { flush() } // run anything queued during the dialog
    }
}

@Composable
fun WrstHost() {
    val context = LocalContext.current
    val socketClient = remember { SocketClient() }
    val renderer = remember { Renderer() }
    val messageState = remember { mutableStateOf("") }

    // Runtime permission requests (layer 2). The launcher must live in the
    // composition; JS requests route through the coordinator (which coalesces
    // concurrent requests into one dialog and queues any during an in-flight one).
    val mainHandler = remember { android.os.Handler(android.os.Looper.getMainLooper()) }
    val launcherRef = remember { arrayOfNulls<(Array<String>) -> Unit>(1) }
    val permCoordinator = remember {
        PermissionCoordinator(
            launch = { perms -> launcherRef[0]?.invoke(perms) },
            post = { r -> mainHandler.post(r) },
        )
    }
    val permLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { result -> permCoordinator.onResult(result) }
    launcherRef[0] = { perms -> permLauncher.launch(perms) }

    // Bumped on every bundle pull so a reload re-runs even when the bundle bytes
    // are identical (an unchanged bundle wouldn't change messageState).
    val loadCounter = remember { mutableStateOf(0) }

    // Debug builds hot-reload from the dev server; release builds load the JS
    // bundle embedded in assets/ (the AAR is prebuilt, so we detect the *app's*
    // build type at runtime via FLAG_DEBUGGABLE rather than BuildConfig.DEBUG).
    DisposableEffect(Unit) {
        JsRuntimeManager.init(context)
        // Route JS permission requests to the coordinator (it hops to main,
        // coalesces same-tick requests into one dialog, and queues the rest).
        Permissions.requester = { perms, result -> permCoordinator.request(perms, result) }
        val isDebuggable =
            (context.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
        // Local images resolve to the dev server in debug, embedded assets in release.
        AssetResolver.debug = isDebuggable
        if (isDebuggable) {
            socketClient.setListener { msg ->
                messageState.value = msg
                loadCounter.value++
            }
            ErrorHandler.onReload = { socketClient.pullCode() }
            // Forward app console.* logs to the dev server over the same socket.
            JsRuntimeManager.logSink = { level, message ->
                socketClient.send(
                    org.json.JSONObject()
                        .put("type", "log")
                        .put("level", level)
                        .put("message", message)
                        .toString(),
                )
            }
            socketClient.connect()
            socketClient.pullCode()
            onDispose {
                Permissions.requester = null
                JsRuntimeManager.logSink = null
                socketClient.disconnect()
            }
        } else {
            val bundle = try {
                context.assets.open("bundle.js").bufferedReader().use { it.readText() }
            } catch (e: Exception) {
                ""
            }
            messageState.value = bundle
            loadCounter.value++
            onDispose { Permissions.requester = null }
        }
    }

    val navController = rememberSwipeDismissableNavController()

    // Each back stack entry gets its own rendered tree so WearOS swipe shows the
    // real previous screen as background during the animation.
    val treeMap: SnapshotStateMap<String, String> = remember { mutableStateMapOf() }

    // Load on every pull (keyed on the counter, not the bundle string) so a
    // reload re-runs even when the bundle is unchanged.
    LaunchedEffect(loadCounter.value) {
        val message = messageState.value
        if (message.isNotEmpty()) {
            JsRuntimeManager.load(message)
            if (!ErrorHandler.isError()) {
                val tree = JsRuntimeManager.render()
                val entryId = navController.currentBackStackEntry?.id
                if (tree != null && entryId != null) treeMap[entryId] = tree
            }
        }
    }

    // JS navigate() → push a new WearOS nav entry and render the new screen.
    LaunchedEffect(Unit) {
        for (event in JsRuntimeManager.navigateChannel) {
            navController.navigate("screen")
            val entryId = navController.currentBackStackEntry?.id
            val tree = JsRuntimeManager.render()
            if (tree != null && entryId != null) treeMap[entryId] = tree
        }
    }

    // In-screen state changes (button presses etc.) update the current tree.
    LaunchedEffect(Unit) {
        for (event in JsRuntimeManager.rerenderChannel) {
            val entryId = navController.currentBackStackEntry?.id
            val tree = JsRuntimeManager.render()
            if (tree != null && entryId != null) treeMap[entryId] = tree
        }
    }

    // Root background behind every screen - fills any area the NavHost doesn't
    // cover (e.g. the reveal during a swipe-back). Color comes from
    // createAppConfig() in JS and updates on hot reload.
    Box(modifier = Modifier.fillMaxSize().background(AppConfig.backgroundColor.value)) {
        SwipeDismissableNavHost(
            navController = navController,
            startDestination = "screen"
        ) {
            composable("screen") { backStackEntry ->
                val tree = treeMap[backStackEntry.id]
                when {
                    ErrorHandler.isError() -> ErrorHandler.Render()
                    tree != null -> renderer.Render(tree)
                }
            }
        }
    }
}
