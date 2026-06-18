import SwiftUI
import Combine

// Mirrors AppConfig.kt - app-wide config set from JS via createAppConfig().
// Background color lives in @Published state so the root view updates on reload.
@MainActor
final class AppConfig: ObservableObject {
    static let shared = AppConfig()

    private static let defaultBackground = Color.black

    @Published var backgroundColor: Color = AppConfig.defaultBackground
    // Whether the NavigationStack header bar is shown (set by createNavigation).
    @Published var showHeader: Bool = false

    // Returns an error message on an invalid color (nil on success) so the caller
    // can surface it as a JS exception → error screen, mirroring Android's throw.
    func setBackgroundColor(_ raw: String) -> String? {
        guard let color = PropParser().parseColor(raw) else {
            return "invalid appBackgroundColor: \"\(raw)\" " +
                "(supported: #RGB | #RRGGBB | #RRGGBBAA | rgb() | rgba())"
        }
        backgroundColor = color
        return nil
    }

    func reset() {
        backgroundColor = AppConfig.defaultBackground
        showHeader = false
    }
}
