import SwiftUI

enum Dimension {
    case fill
    case points(CGFloat)

    var isFill: Bool { if case .fill = self { return true } else { return false } }
    var pointValue: CGFloat? { if case .points(let p) = self { return p } else { return nil } }
}

// Resolved container/box style (mirrors StyleParser.kt → Modifier).
struct ViewStyle {
    var width: Dimension?
    var height: Dimension?
    var backgroundColor: Color?
    var borderColor: Color?
    var borderWidth: CGFloat = 0
    var borderRadius: CGFloat = 0
    var padding = EdgeInsets()
    var opacity: Double = 1
    var offset = CGSize.zero
}

// Resolved text style (mirrors TextStyleParser.kt).
struct TextStyleValues {
    var color: Color?
    var font: Font?
    var italic = false
    var tracking: CGFloat?
    var underline = false
    var strikethrough = false
    var alignment: TextAlignment = .leading
    var lineSpacing: CGFloat = 0
    var truncation: Text.TruncationMode = .tail
    var lineLimit: Int?
}

// Resolved container alignments (mirrors ContainerStyleParser.kt).
struct ContainerAlignment {
    var box: Alignment = .topLeading             // ZStack (View)
    var columnHorizontal: HorizontalAlignment = .leading // VStack (VerticalView)
    var rowVertical: VerticalAlignment = .top    // HStack (HorizontalView)
}

final class StyleParser: PropParser {
    func parse(_ style: [String: Any]) -> ViewStyle {
        var s = ViewStyle()

        // size overrides width/height
        let sizeStr = stringValue(resolve(style["size"]))
        s.width = dimension(sizeStr ?? stringValue(resolve(style["width"])))
        s.height = dimension(sizeStr ?? stringValue(resolve(style["height"])))

        s.backgroundColor = parseColor(resolve(style["backgroundColor"]) as? String)
        s.borderColor = parseColor(resolve(style["borderColor"]) as? String)
        s.borderWidth = parseFloat(resolve(style["borderWidth"]))
        s.borderRadius = parseFloat(resolve(style["borderRadius"]))
        s.padding = parseEdgeInsets(resolve(style["padding"]))
        s.opacity = Double(parseFloat(resolve(style["opacity"]), fallback: 1))
        s.offset = CGSize(width: parseFloat(resolve(style["x"])),
                          height: parseFloat(resolve(style["y"])))
        return s
    }

    private func dimension(_ str: String?) -> Dimension? {
        guard let str else { return nil }
        if str == "fill" { return .fill }
        if let d = Double(str), d > 0 { return .points(CGFloat(d)) }
        return nil
    }
}

final class TextStyleParser: PropParser {
    func parse(_ style: [String: Any]) -> TextStyleValues {
        var t = TextStyleValues()
        t.color = parseColor(resolve(style["color"]) as? String)

        let size = optionalFloat(resolve(style["fontSize"]))
        let weight = fontWeight(resolve(style["fontWeight"]))
        let design = fontDesign(stringValue(resolve(style["fontFamily"])))
        if size != nil || weight != nil || design != nil {
            t.font = .system(size: size ?? 16, weight: weight ?? .regular, design: design ?? .default)
        }

        t.italic = stringValue(resolve(style["fontStyle"]))?.lowercased() == "italic"
        t.tracking = optionalFloat(resolve(style["letterSpacing"]))

        switch stringValue(resolve(style["textDecoration"]))?.lowercased() {
        case "underline": t.underline = true
        case "line-through": t.strikethrough = true
        case "underline line-through": t.underline = true; t.strikethrough = true
        default: break
        }

        switch stringValue(resolve(style["textAlign"]))?.lowercased() {
        case "center": t.alignment = .center
        case "right", "end": t.alignment = .trailing
        default: t.alignment = .leading
        }

        if let lineHeight = optionalFloat(resolve(style["lineHeight"])) {
            t.lineSpacing = max(0, lineHeight - (size ?? 16))
        }

        switch stringValue(resolve(style["textOverflow"]))?.lowercased() {
        case "startellipsis": t.truncation = .head
        default: t.truncation = .tail
        }

        let softWrap = parseBool(resolve(style["softWrap"]), fallback: true)
        if !softWrap {
            t.lineLimit = 1
        } else if let maxLines = optionalInt(resolve(style["maxLines"])) {
            t.lineLimit = maxLines
        }

        return t
    }

    // parseFloat returns a fallback; for "present?" checks we need an optional.
    private func optionalFloat(_ value: Any?) -> CGFloat? {
        switch value {
        case let n as NSNumber: return CGFloat(n.doubleValue)
        case let s as String: return Double(s).map { CGFloat($0) }
        default: return nil
        }
    }

    private func optionalInt(_ value: Any?) -> Int? {
        switch value {
        case let n as NSNumber: return n.intValue
        case let s as String: return Int(s)
        default: return nil
        }
    }

    private func fontWeight(_ value: Any?) -> Font.Weight? {
        guard let w = optionalInt(value) else { return nil }
        switch w {
        case 100: return .thin
        case 200: return .ultraLight
        case 300: return .light
        case 400: return .regular
        case 500: return .medium
        case 600: return .semibold
        case 700: return .bold
        case 800: return .heavy
        case 900: return .black
        default: return .regular
        }
    }

    private func fontDesign(_ family: String?) -> Font.Design? {
        switch family?.lowercased() {
        case "serif": return .serif
        case "monospace": return .monospaced
        case "sansserif": return .default
        default: return nil
        }
    }
}

final class ContainerStyleParser: PropParser {
    func parse(_ style: [String: Any]) -> ContainerAlignment {
        let v = stringValue(resolve(style["verticalAlignment"])) ?? "start"
        let h = stringValue(resolve(style["horizontalAlignment"])) ?? "start"

        var a = ContainerAlignment()
        a.columnHorizontal = h == "center" ? .center : h == "end" ? .trailing : .leading
        a.rowVertical = v == "center" ? .center : v == "end" ? .bottom : .top
        a.box = Alignment(horizontal: a.columnHorizontal, vertical: a.rowVertical)
        return a
    }
}
