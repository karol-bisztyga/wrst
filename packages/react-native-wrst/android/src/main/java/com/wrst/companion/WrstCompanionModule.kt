package com.wrst.companion

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable

// Phone-side companion bridge over the Wearable Data Layer. Availability is based
// on a connected NODE (reliable on devices + emulators); CapabilityClient
// discovery often doesn't sync on emulators, so we don't gate on it (we still
// advertise our capability + listen, as a refresh trigger). Counterpart of the
// watch's CompanionManager. See CONTRACT.md.
class WrstCompanionModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    CapabilityClient.OnCapabilityChangedListener,
    MessageClient.OnMessageReceivedListener {

    private val capabilityClient = Wearable.getCapabilityClient(reactContext)
    private val messageClient = Wearable.getMessageClient(reactContext)
    private val nodeClient = Wearable.getNodeClient(reactContext)

    @Volatile private var targetNodeIds: List<String> = emptyList()

    companion object {
        private const val CAPABILITY = "wrst_companion"
        private const val MESSAGE_PATH = "/wrst"
        private const val EVENT_STATUS = "wrstCompanionStatus"
        private const val EVENT_MESSAGE = "wrstCompanionMessage"
        private const val TAG = "WrstCompanion"
    }

    override fun getName() = "WrstCompanion"

    override fun initialize() {
        super.initialize()
        capabilityClient.addListener(this, CAPABILITY)
        messageClient.addListener(this)
        capabilityClient.addLocalCapability(CAPABILITY)
            .addOnFailureListener { e -> Log.e(TAG, "addLocalCapability failed", e) }
        refresh(null)
    }

    override fun invalidate() {
        capabilityClient.removeListener(this)
        messageClient.removeListener(this)
        super.invalidate()
    }

    private fun emit(event: String, body: Any?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, body)
    }

    private fun statusMap(available: Boolean, reason: String?): WritableMap =
        Arguments.createMap().apply {
            putBoolean("available", available)
            if (reason == null) putNull("reason") else putString("reason", reason)
        }

    // Recompute from connected nodes (reliable). Resolve `promise` if given, else
    // emit a status-change event.
    private fun refresh(promise: Promise?) {
        nodeClient.connectedNodes
            .addOnSuccessListener { nodes ->
                targetNodeIds = nodes.map { it.id }
                val available = nodes.isNotEmpty()
                val reason = if (available) null else "no-device"
                Log.d(TAG, "refresh: nodes=${nodes.map { it.displayName }} available=$available")
                val map = statusMap(available, reason)
                if (promise != null) promise.resolve(map) else emit(EVENT_STATUS, map)
            }
            .addOnFailureListener { e -> promise?.reject("status_failed", e) ?: Log.e(TAG, "connectedNodes failed", e) }
    }

    @ReactMethod
    fun getStatus(promise: Promise) = refresh(promise)

    @ReactMethod
    fun sendMessage(json: String, promise: Promise) {
        val targets = targetNodeIds
        if (targets.isEmpty()) {
            promise.resolve(false)
            return
        }
        val data = json.toByteArray(Charsets.UTF_8)
        var remaining = targets.size
        for (id in targets) {
            messageClient.sendMessage(id, MESSAGE_PATH, data)
                .addOnCompleteListener { if (--remaining == 0) promise.resolve(true) }
        }
    }

    // Required no-ops so RN's NativeEventEmitter doesn't warn.
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    override fun onCapabilityChanged(info: com.google.android.gms.wearable.CapabilityInfo) = refresh(null)

    override fun onMessageReceived(event: MessageEvent) {
        if (event.path == MESSAGE_PATH) {
            emit(EVENT_MESSAGE, String(event.data, Charsets.UTF_8))
            refresh(null)
        }
    }
}
