import Foundation
import CoreMotion

// Runtime permissions (layer 2) for iOS. Unlike Android's uniform request, each
// iOS permission is a different framework, so this dispatches per name.
//
// Implemented: "activity" (CoreMotion / motion & fitness) - covers the step-count
// and barometer modules. Others return "undetermined" for now; add their
// framework here as needed (location → CLLocationManager, microphone →
// AVAudioSession, notifications → UNUserNotificationCenter, heartRate → HealthKit).
enum Permissions {
    nonisolated(unsafe) private static let pedometer = CMPedometer()

    static func status(_ name: String) -> String {
        switch name {
        case "activity": return motionStatus()
        default: return "undetermined"
        }
    }

    static func request(_ name: String, _ onResult: @escaping (String) -> Void) {
        switch name {
        case "activity":
            switch CMPedometer.authorizationStatus() {
            case .authorized: onResult("granted")
            case .denied, .restricted: onResult("denied")
            default:
                // notDetermined → a query triggers the motion & fitness prompt;
                // the completion fires once the user has answered.
                pedometer.queryPedometerData(
                    from: Date().addingTimeInterval(-1), to: Date()
                ) { _, _ in onResult(motionStatus()) }
            }
        default:
            onResult("undetermined")
        }
    }

    private static func motionStatus() -> String {
        switch CMPedometer.authorizationStatus() {
        case .authorized: return "granted"
        case .denied, .restricted: return "denied"
        case .notDetermined: return "undetermined"
        @unknown default: return "undetermined"
        }
    }
}
