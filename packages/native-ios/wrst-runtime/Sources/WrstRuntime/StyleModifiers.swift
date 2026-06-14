import SwiftUI

// Applies a resolved ViewStyle as SwiftUI modifiers. Absent values use neutral
// no-ops (clear color, zero width, nil frame) so everything can be applied
// unconditionally except the rounded-corner clip.
struct ViewStyleModifier: ViewModifier {
    let style: ViewStyle
    // Alignment used when a frame is larger than its content (fixed size or
    // "fill"). Containers pass their own alignment so children pin correctly;
    // for leaves it's a no-op (no oversized frame).
    var alignment: Alignment = .topLeading

    func body(content: Content) -> some View {
        content
            .padding(style.padding)
            .frame(width: style.width?.pointValue, height: style.height?.pointValue, alignment: alignment)
            .frame(maxWidth: style.width?.isFill == true ? .infinity : nil,
                   maxHeight: style.height?.isFill == true ? .infinity : nil,
                   alignment: alignment)
            .background(
                RoundedRectangle(cornerRadius: style.borderRadius)
                    .fill(style.backgroundFill)
            )
            .modifier(ClipIfNeeded(radius: style.borderRadius))
            .modifier(ShadowIfNeeded(shadow: style.shadow))
            .overlay(
                RoundedRectangle(cornerRadius: style.borderRadius)
                    .strokeBorder(style.borderColor ?? .clear, lineWidth: style.borderWidth)
            )
            .opacity(style.opacity)
            .offset(style.offset)
    }
}

private struct ClipIfNeeded: ViewModifier {
    let radius: CGFloat

    @ViewBuilder
    func body(content: Content) -> some View {
        if radius > 0 {
            content.clipShape(RoundedRectangle(cornerRadius: radius))
        } else {
            content
        }
    }
}

private struct ShadowIfNeeded: ViewModifier {
    let shadow: ShadowSpec?

    @ViewBuilder
    func body(content: Content) -> some View {
        if let s = shadow {
            content.shadow(color: s.color, radius: s.radius, x: s.x, y: s.y)
        } else {
            content
        }
    }
}

extension View {
    func viewStyle(_ style: ViewStyle, alignment: Alignment = .topLeading) -> some View {
        modifier(ViewStyleModifier(style: style, alignment: alignment))
    }
}
