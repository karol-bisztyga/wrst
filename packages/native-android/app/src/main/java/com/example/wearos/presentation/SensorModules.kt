package com.example.wearos.presentation

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.wrst.runtime.WrstNativeModules
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

// Example "custom native modules": scalar sensors that aren't engine built-ins.
// Each is a streaming module - JS subscribes via subscribeNativeModule(name), the
// module pushes { value, timestamp } per sample through WrstNativeModules.emit().
// These are SensorManager sensors, so one generic helper covers them.
//
// Kept cross-platform (also in iOS SensorModules.swift): barometer needs no
// permission; stepCount needs ACTIVITY_RECOGNITION ("activity"), requested from
// JS. (Android can also do heartRate/ambientLight, but those aren't symmetric
// with iOS, so the example omits them.)
object SensorModules {
    private lateinit var sensorManager: SensorManager
    private val listeners = ConcurrentHashMap<String, SensorEventListener>()

    fun register(context: Context) {
        sensorManager =
            context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        registerSensor("barometer", Sensor.TYPE_PRESSURE)       // hPa
        registerSensor("stepCount", Sensor.TYPE_STEP_COUNTER)   // cumulative steps
    }

    private fun registerSensor(name: String, sensorType: Int) {
        WrstNativeModules.register(name) { args ->
            val cmd = args.getOrNull(0) as? JSONObject ?: return@register null
            val callbackId = cmd.optString("callbackId")
            when (cmd.optString("action")) {
                "start" -> start(callbackId, sensorType, cmd.optLong("intervalMs", 1000L))
                "stop" -> stop(callbackId)
            }
            null
        }
    }

    private fun start(callbackId: String, sensorType: Int, intervalMs: Long) {
        if (callbackId.isEmpty()) return
        val sensor = sensorManager.getDefaultSensor(sensorType) ?: return
        stop(callbackId)
        var lastEmit = 0L
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                val now = System.currentTimeMillis()
                if (now - lastEmit < intervalMs) return
                lastEmit = now
                val value = event.values.getOrElse(0) { 0f }
                WrstNativeModules.emit(
                    callbackId,
                    """{"value":$value,"timestamp":$now}""",
                )
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
        }
        listeners[callbackId] = listener
        sensorManager.registerListener(listener, sensor, (intervalMs * 1000).toInt())
    }

    private fun stop(callbackId: String) {
        listeners.remove(callbackId)?.let { sensorManager.unregisterListener(it) }
    }
}
