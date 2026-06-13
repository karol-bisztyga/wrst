import Foundation
import CoreMotion
import WrstRuntime

// Example "custom native modules" for the sensors that aren't engine built-ins.
// Each is a streaming module: JS subscribes via subscribeNativeModule(name) and
// the module pushes { value, timestamp } per sample through WrstNativeModules.emit().
//
// barometer  -> CMAltimeter (hPa),  stepCount -> CMPedometer (cumulative steps).
// Both need NSMotionUsageDescription (declared in Info.plist). heartRate and
// ambientLight are intentionally not implemented on watchOS: live heart rate
// needs an HKWorkoutSession + the HealthKit entitlement, and there's no public
// ambient-light API - so subscribing to them here simply yields no samples.
@MainActor
enum SensorModules {
    private static let altimeter = CMAltimeter()
    private static let pedometer = CMPedometer()
    private static var barometerCallback: String?
    private static var stepCallback: String?

    static func register() {
        WrstNativeModules.register("barometer") { args in
            MainActor.assumeIsolated { handleBarometer(args) }
            return nil
        }
        WrstNativeModules.register("stepCount") { args in
            MainActor.assumeIsolated { handleSteps(args) }
            return nil
        }
    }

    private static func command(_ args: [Any]) -> (action: String, callbackId: String)? {
        guard let dict = args.first as? [String: Any],
              let action = dict["action"] as? String,
              let callbackId = dict["callbackId"] as? String else { return nil }
        return (action, callbackId)
    }

    private static func handleBarometer(_ args: [Any]) {
        guard let (action, callbackId) = command(args) else { return }
        switch action {
        case "start":
            guard CMAltimeter.isRelativeAltitudeAvailable() else { return }
            barometerCallback = callbackId
            altimeter.startRelativeAltitudeUpdates(to: .main) { data, _ in
                guard let kPa = data?.pressure.doubleValue else { return }
                MainActor.assumeIsolated {
                    guard let id = barometerCallback else { return }
                    WrstNativeModules.emit(id, "{\"value\":\(kPa * 10),\"timestamp\":\(now())}")
                }
            }
        case "stop":
            if barometerCallback == callbackId {
                altimeter.stopRelativeAltitudeUpdates()
                barometerCallback = nil
            }
        default:
            break
        }
    }

    private static func handleSteps(_ args: [Any]) {
        guard let (action, callbackId) = command(args) else { return }
        switch action {
        case "start":
            guard CMPedometer.isStepCountingAvailable() else { return }
            stepCallback = callbackId
            pedometer.startUpdates(from: Date()) { data, _ in
                guard let steps = data?.numberOfSteps.doubleValue else { return }
                DispatchQueue.main.async {
                    MainActor.assumeIsolated {
                        guard let id = stepCallback else { return }
                        WrstNativeModules.emit(id, "{\"value\":\(steps),\"timestamp\":\(now())}")
                    }
                }
            }
        case "stop":
            if stepCallback == callbackId {
                pedometer.stopUpdates()
                stepCallback = nil
            }
        default:
            break
        }
    }

    private static func now() -> Double { Date().timeIntervalSince1970 * 1000 }
}
