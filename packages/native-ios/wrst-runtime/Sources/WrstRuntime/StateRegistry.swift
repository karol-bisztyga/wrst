import Foundation
import Observation

// One observable cell per state id. When a view body reads a cell's `json`,
// SwiftUI's Observation records that dependency - so a setState re-renders ONLY
// the views that read that id. This is the SwiftUI analog of Compose's snapshot
// system, mirroring how StateRegistry.kt's MutableState drives recomposition.
@Observable
final class StateCell {
    var json: String
    init(_ json: String) { self.json = json }
}

@MainActor
final class StateRegistry {
    static let shared = StateRegistry()

    private var cells: [String: StateCell] = [:]

    // Initial registration during render() - seed the cell.
    func register(_ id: String, json: String) {
        if let cell = cells[id] { cell.json = json } else { cells[id] = StateCell(json) }
    }

    // State change - update the cell. Only views that read this id re-render.
    func set(_ id: String, json: String) {
        if let cell = cells[id] { cell.json = json } else { cells[id] = StateCell(json) }
    }

    func json(_ id: String) -> String? { cells[id]?.json }

    func clear() { cells.removeAll() }

    // Unwrap a value that may be a stateRef {"__stateRef": id} into its current
    // parsed value. Reading cell.json here is what registers the per-view
    // dependency (when called from a view body).
    func resolve(_ value: Any?) -> Any? {
        guard let dict = value as? [String: Any], let id = dict["__stateRef"] as? String else {
            return value
        }
        guard let json = cells[id]?.json, let data = json.data(using: .utf8) else { return nil }
        let parsed = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
        // Plain-object values (e.g. a computed style that reads state) are
        // pre-serialized to a JSON string by the JS layer, so they arrive
        // double-encoded: the first parse yields that inner JSON string - decode
        // it once more into an object/array (mirrors Android's resolve heuristic).
        if let inner = parsed as? String, let nested = decodeJSONContainer(inner) {
            return nested
        }
        return parsed
    }

    private func decodeJSONContainer(_ s: String) -> Any? {
        let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
        guard t.hasPrefix("{") || t.hasPrefix("[") else { return nil }
        guard let data = t.data(using: .utf8) else { return nil }
        return try? JSONSerialization.jsonObject(with: data)
    }
}
