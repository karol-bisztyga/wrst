package com.wrst.runtime

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import java.util.concurrent.ConcurrentHashMap

// Engine motion sensors via Android's SensorManager. No permission needed
// (accelerometer / gyroscope / magnetometer are promptless). Each JS
// subscription registers one listener keyed by its callback id; on each sample
// (throttled to the requested interval) it invokes the JS callback through
// `onSample`, which the runtime turns into call(callbackId, sampleJson).
object Sensors {
    private var sensorManager: SensorManager? = null
    private val listeners = ConcurrentHashMap<String, SensorEventListener>()

    // (callbackId, sampleJson) -> the runtime delivers it to JS.
    private var onSample: ((String, String) -> Unit)? = null

    fun init(context: Context) {
        sensorManager =
            context.applicationContext.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
    }

    fun setSampleHandler(handler: (callbackId: String, sampleJson: String) -> Unit) {
        onSample = handler
    }

    fun start(type: String, callbackId: String, intervalMs: Long) {
        val sm = sensorManager ?: return
        val sensorType = when (type) {
            "accelerometer" -> Sensor.TYPE_ACCELEROMETER // m/s²
            "gyroscope" -> Sensor.TYPE_GYROSCOPE         // rad/s
            "magnetometer" -> Sensor.TYPE_MAGNETIC_FIELD // µT
            else -> return
        }
        val sensor = sm.getDefaultSensor(sensorType) ?: return
        stop(callbackId)

        var lastEmit = 0L
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                val now = System.currentTimeMillis()
                if (now - lastEmit < intervalMs) return
                lastEmit = now
                val x = event.values.getOrElse(0) { 0f }
                val y = event.values.getOrElse(1) { 0f }
                val z = event.values.getOrElse(2) { 0f }
                onSample?.invoke(
                    callbackId,
                    """{"x":$x,"y":$y,"z":$z,"timestamp":$now}""",
                )
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
        }
        listeners[callbackId] = listener
        sm.registerListener(listener, sensor, (intervalMs * 1000).toInt())
    }

    fun stop(callbackId: String) {
        listeners.remove(callbackId)?.let { sensorManager?.unregisterListener(it) }
    }

    fun stopAll() {
        listeners.values.forEach { sensorManager?.unregisterListener(it) }
        listeners.clear()
    }
}
