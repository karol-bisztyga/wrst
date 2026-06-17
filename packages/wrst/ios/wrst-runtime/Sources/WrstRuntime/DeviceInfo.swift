import Foundation
import WatchKit

// Static device info for the JS `Device` global. Apple Watch is always
// rectangular; dimensions come from the watch screen bounds (logical points).
@MainActor
enum DeviceInfo {
    static func json() -> String {
        let bounds = WKInterfaceDevice.current().screenBounds
        let dict: [String: Any] = [
            "platform": "apple-watch",
            "shape": "rect",
            "dimensions": ["width": Int(bounds.width), "height": Int(bounds.height)],
        ]
        return (try? JSONSerialization.data(withJSONObject: dict))
            .flatMap { String(data: $0, encoding: .utf8) }
            ?? #"{"platform":"apple-watch","shape":"rect","dimensions":{"width":0,"height":0}}"#
    }
}
