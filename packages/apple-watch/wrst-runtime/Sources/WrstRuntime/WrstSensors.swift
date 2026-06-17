import Foundation
import CoreMotion

// Engine motion sensors via CoreMotion - the iOS twin of Android's `Sensors`.
// Accelerometer / gyroscope / magnetometer are promptless (no permission).
//
// CoreMotion allows one stream per sensor, so we fan out: a sensor's hardware
// updates start when its first subscriber arrives and stop when the last leaves;
// each sample is delivered to every subscriber of that sensor, throttled to the
// subscriber's requested interval. Samples reach JS via call(callbackId, json),
// the same channel as timers/fetch.
@MainActor
final class WrstSensors {
    static let shared = WrstSensors()
    private let motion = CMMotionManager()

    private struct Sub {
        let type: String
        let intervalMs: Double
        var lastEmit: Double = 0
    }
    private var subs: [String: Sub] = [:] // callbackId -> Sub

    func start(type: String, callbackId: String, intervalMs: Double) {
        subs[callbackId] = Sub(type: type, intervalMs: intervalMs)
        ensureRunning(type)
    }

    func stop(_ callbackId: String) {
        guard let sub = subs.removeValue(forKey: callbackId) else { return }
        if !subs.values.contains(where: { $0.type == sub.type }) {
            stopHardware(sub.type)
        }
    }

    func stopAll() {
        subs.removeAll()
        for type in ["accelerometer", "gyroscope", "magnetometer"] { stopHardware(type) }
    }

    // Units normalized to match Android: accelerometer m/s² (CoreMotion reports
    // G, so ×g), gyroscope rad/s, magnetometer microtesla.
    private static let g = 9.80665

    private func ensureRunning(_ type: String) {
        let interval = max(0.01, minInterval(type) / 1000.0)
        switch type {
        case "accelerometer":
            guard motion.isAccelerometerAvailable else { return }
            motion.accelerometerUpdateInterval = interval
            if !motion.isAccelerometerActive {
                motion.startAccelerometerUpdates(to: .main) { [weak self] data, _ in
                    guard let d = data else { return }
                    let a = d.acceleration
                    self?.emit(type, a.x * Self.g, a.y * Self.g, a.z * Self.g)
                }
            }
        case "gyroscope":
            guard motion.isGyroAvailable else { return }
            motion.gyroUpdateInterval = interval
            if !motion.isGyroActive {
                motion.startGyroUpdates(to: .main) { [weak self] data, _ in
                    guard let r = data?.rotationRate else { return }
                    self?.emit(type, r.x, r.y, r.z)
                }
            }
        case "magnetometer":
            guard motion.isMagnetometerAvailable else { return }
            motion.magnetometerUpdateInterval = interval
            if !motion.isMagnetometerActive {
                motion.startMagnetometerUpdates(to: .main) { [weak self] data, _ in
                    guard let f = data?.magneticField else { return }
                    self?.emit(type, f.x, f.y, f.z)
                }
            }
        default:
            break
        }
    }

    private func stopHardware(_ type: String) {
        switch type {
        case "accelerometer": if motion.isAccelerometerActive { motion.stopAccelerometerUpdates() }
        case "gyroscope": if motion.isGyroActive { motion.stopGyroUpdates() }
        case "magnetometer": if motion.isMagnetometerActive { motion.stopMagnetometerUpdates() }
        default: break
        }
    }

    private func minInterval(_ type: String) -> Double {
        subs.values.filter { $0.type == type }.map { $0.intervalMs }.min() ?? 100
    }

    private func emit(_ type: String, _ x: Double, _ y: Double, _ z: Double) {
        let now = Date().timeIntervalSince1970 * 1000
        for (id, sub) in subs where sub.type == type {
            if now - sub.lastEmit < sub.intervalMs { continue }
            var updated = sub
            updated.lastEmit = now
            subs[id] = updated
            let json = "{\"x\":\(x),\"y\":\(y),\"z\":\(z),\"timestamp\":\(now)}"
            RuntimeBridge.shared.callJSON(id, json)
        }
    }
}
