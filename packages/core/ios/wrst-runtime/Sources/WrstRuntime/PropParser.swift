import SwiftUI

// Base parser mirroring PropParser.kt - the shared, widely-used parse methods
// (color, float, int, edge insets). StyleParser / TextStyleParser /
// ContainerStyleParser inherit from this. Methods take already-resolved values;
// subclasses resolve stateRefs via `resolve(_:)` before calling them.
@MainActor
class PropParser {
    func resolve(_ value: Any?) -> Any? {
        StateRegistry.shared.resolve(value)
    }

    // Coerce a resolved value to a string (numbers via their string form).
    func stringValue(_ value: Any?) -> String? {
        switch value {
        case let s as String: return s
        case let n as NSNumber: return n.stringValue
        default: return nil
        }
    }

    // #RGB / #RRGGBB / #RRGGBBAA / rgb() / rgba(). nil means "unspecified".
    func parseColor(_ value: String?) -> Color? {
        guard let raw = value?.trimmingCharacters(in: .whitespaces), !raw.isEmpty else { return nil }
        if raw.hasPrefix("#") { return parseHex(String(raw.dropFirst())) }
        let lower = raw.lowercased()
        if lower.hasPrefix("rgba") { return parseRGB(raw, hasAlpha: true) }
        if lower.hasPrefix("rgb") { return parseRGB(raw, hasAlpha: false) }
        return nil
    }

    func parseFloat(_ value: Any?, fallback: CGFloat = 0) -> CGFloat {
        switch value {
        case let n as NSNumber: return CGFloat(n.doubleValue)
        case let s as String: return Double(s).map { CGFloat($0) } ?? fallback
        default: return fallback
        }
    }

    func parseInt(_ value: Any?, fallback: Int) -> Int {
        switch value {
        case let n as NSNumber: return n.intValue
        case let s as String: return Int(s) ?? fallback
        default: return fallback
        }
    }

    func parseBool(_ value: Any?, fallback: Bool) -> Bool {
        switch value {
        case let b as Bool: return b
        case let n as NSNumber: return n.boolValue
        default: return fallback
        }
    }

    func parseEdgeInsets(_ value: Any?) -> EdgeInsets {
        if let n = value as? NSNumber {
            let v = CGFloat(n.doubleValue)
            return EdgeInsets(top: v, leading: v, bottom: v, trailing: v)
        }
        if let s = value as? String, !s.isEmpty {
            let sep: Character = s.contains(",") ? "," : " "
            let p = s.split(separator: sep)
                .compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
                .map { CGFloat($0) }
            switch p.count {
            case 1: return EdgeInsets(top: p[0], leading: p[0], bottom: p[0], trailing: p[0])
            case 2: return EdgeInsets(top: p[0], leading: p[1], bottom: p[0], trailing: p[1])
            // JS order: top right bottom left
            case 4: return EdgeInsets(top: p[0], leading: p[3], bottom: p[2], trailing: p[1])
            default: return EdgeInsets()
            }
        }
        return EdgeInsets()
    }

    func isEdgeInsetsZero(_ i: EdgeInsets) -> Bool {
        i.top == 0 && i.leading == 0 && i.bottom == 0 && i.trailing == 0
    }

    // MARK: - color helpers

    private func parseHex(_ hex: String) -> Color? {
        let chars = Array(hex)
        switch chars.count {
        case 3:
            guard let r = chars[0].hexDigitValue,
                  let g = chars[1].hexDigitValue,
                  let b = chars[2].hexDigitValue else { return nil }
            return Color(red: Double(r) / 15, green: Double(g) / 15, blue: Double(b) / 15)
        case 6, 8:
            func byte(_ i: Int) -> Double? {
                guard let hi = chars[i].hexDigitValue,
                      let lo = chars[i + 1].hexDigitValue else { return nil }
                return Double(hi * 16 + lo) / 255
            }
            guard let r = byte(0), let g = byte(2), let b = byte(4) else { return nil }
            let a = chars.count == 8 ? (byte(6) ?? 1) : 1
            return Color(red: r, green: g, blue: b, opacity: a)
        default:
            return nil
        }
    }

    private func parseRGB(_ s: String, hasAlpha: Bool) -> Color? {
        guard let open = s.firstIndex(of: "("), let close = s.lastIndex(of: ")") else { return nil }
        let parts = s[s.index(after: open)..<close]
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
        let needed = hasAlpha ? 4 : 3
        guard parts.count == needed,
              let r = Double(parts[0]), let g = Double(parts[1]), let b = Double(parts[2]) else { return nil }
        let a = hasAlpha ? (Double(parts[3]) ?? 1) : 1
        return Color(red: r / 255, green: g / 255, blue: b / 255, opacity: a)
    }
}
