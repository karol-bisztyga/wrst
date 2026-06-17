import Foundation

// Lets the stateless renderer reach the active JS runtime for button presses
// (call) and List item rendering, without threading the runtime through every
// view. The active RuntimeController wires these closures.
@MainActor
final class RuntimeBridge {
    static let shared = RuntimeBridge()

    // Invoke a registered callback by id (e.g. a Button's onPress).
    var onCall: ((String) -> Void)?
    // Render one List item: call(renderItemId, item, index) → node JSON.
    var onRenderItem: ((_ renderItemId: String, _ itemJSON: String, _ index: Int) -> String?)?
    // JS navigate() fired - push the new current screen.
    var onNavigate: (() -> Void)?
    // JS goBack() fired - pop the current screen.
    var onGoBack: (() -> Void)?
    // Invoke call(id, <jsonLiteral>) - used by fetch resolve/reject.
    var onCallJSON: ((_ id: String, _ argJSON: String) -> Void)?
    // Companion: push a link-status change / an incoming phone message into JS.
    var onCompanionStatus: ((_ statusJSON: String) -> Void)?
    var onCompanionMessage: ((_ messageJSON: String) -> Void)?

    func call(_ id: String) {
        onCall?(id)
    }

    func callJSON(_ id: String, _ argJSON: String) {
        onCallJSON?(id, argJSON)
    }

    func renderListItem(_ renderItemId: String, _ itemJSON: String, _ index: Int) -> String? {
        onRenderItem?(renderItemId, itemJSON, index)
    }

    func companionStatus(_ json: String) {
        onCompanionStatus?(json)
    }

    func companionMessage(_ json: String) {
        onCompanionMessage?(json)
    }

    func navigate() {
        onNavigate?()
    }

    func goBack() {
        onGoBack?()
    }
}
