package com.wrst.runtime

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.NodeClient
import com.google.android.gms.wearable.Wearable

// Companion link to the paired phone app over the Wearable Data Layer. Design-
// identical to the Apple Watch CompanionManager (WatchConnectivity). See CONTRACT.md.
//
// Availability is based on a connected NODE (NodeClient), which is reliable on
// real devices AND emulators. We do NOT gate availability on CapabilityClient
// discovery: on emulators that capability sync often never completes (no Google
// account), even though the nodes are connected. We still advertise our capability
// (addLocalCapability) + listen for capability changes purely as a refresh trigger.
// Messages go to /wrst, which only the counterpart wrst app (same package) listens on.
object CompanionManager {
    private const val CAPABILITY = "wrst_companion"
    private const val MESSAGE_PATH = "/wrst"
    private const val TAG = "CompanionManager"

    private var capabilityClient: CapabilityClient? = null
    private var messageClient: MessageClient? = null
    private var nodeClient: NodeClient? = null

    @Volatile private var available = false
    @Volatile private var reason: String? = "no-device"
    @Volatile private var targetNodeIds: List<String> = emptyList()

    var statusEmitter: ((String) -> Unit)? = null
    var messageEmitter: ((String) -> Unit)? = null

    // Capability changes (counterpart connecting/advertising) → re-check the link.
    private val capListener = CapabilityClient.OnCapabilityChangedListener { refresh() }
    private val msgListener = MessageClient.OnMessageReceivedListener { event ->
        if (event.path == MESSAGE_PATH) {
            messageEmitter?.invoke(String(event.data, Charsets.UTF_8))
            // A message proves a live link; re-check availability too.
            refresh()
        }
    }

    fun init(context: Context) {
        val app = context.applicationContext
        capabilityClient = Wearable.getCapabilityClient(app)
        messageClient = Wearable.getMessageClient(app)
        nodeClient = Wearable.getNodeClient(app)
        capabilityClient?.addListener(capListener, CAPABILITY)
        messageClient?.addListener(msgListener)
        // Advertise dynamically (more reliable than the static wear.xml).
        capabilityClient?.addLocalCapability(CAPABILITY)
            ?.addOnFailureListener { e -> Log.e(TAG, "addLocalCapability failed", e) }
        refresh()
    }

    fun statusJSON(): String {
        val reasonField = reason?.let { "\"$it\"" } ?: "null"
        return "{\"available\":$available,\"reason\":$reasonField}"
    }

    // Recompute from connected nodes (the reliable signal), then push to JS.
    fun refresh() {
        val nc = nodeClient ?: return
        nc.connectedNodes
            .addOnSuccessListener { nodes ->
                targetNodeIds = nodes.map { it.id }
                available = nodes.isNotEmpty()
                reason = if (available) null else "no-device"
                Log.d(TAG, "refresh: nodes=${nodes.map { it.displayName }} available=$available")
                statusEmitter?.invoke(statusJSON())
            }
            .addOnFailureListener { e -> Log.e(TAG, "connectedNodes failed", e) }
    }

    // Send a JSON-string message to every connected node. Only the counterpart
    // wrst app (same package, listening on /wrst) receives it. Fire-and-forget.
    fun send(json: String) {
        val mc = messageClient ?: return
        val data = json.toByteArray(Charsets.UTF_8)
        for (id in targetNodeIds) {
            mc.sendMessage(id, MESSAGE_PATH, data)
                .addOnFailureListener { e -> Log.e(TAG, "sendMessage failed", e) }
        }
    }

    fun close() {
        capabilityClient?.removeListener(capListener)
        messageClient?.removeListener(msgListener)
    }
}
