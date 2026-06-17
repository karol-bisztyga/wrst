import SwiftUI

// Parses the serialized tree and renders it. Mirrors Renderer.kt's dispatch.
// No state observation here - each NodeView tracks its own stateRef reads, so a
// state change re-renders only the affected views (fine-grained), not the tree.
struct TreeView: View {
    let json: String

    var body: some View {
        if let data = json.data(using: .utf8),
           let node = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            NodeView(node: node)
        } else {
            Text("invalid tree").foregroundColor(.red)
        }
    }
}

// Recursive node renderer. All stateRef resolution happens in `body` (and the
// computed properties it reads), so SwiftUI's Observation records exactly which
// state cells each node depends on and re-renders only those - like Compose
// recomposing only the composables that read a changed MutableState.
struct NodeView: View, Equatable {
    let node: [String: Any]

    // The tree structure is frozen between renders (only cell values change), so
    // two NodeViews for the same node are equal. This lets SwiftUI skip
    // re-evaluating a child when its parent re-renders - Compose-style
    // skippability. A view's own Observation still re-renders it when a cell it
    // read changes, so this never suppresses a real update.
    nonisolated static func == (lhs: NodeView, rhs: NodeView) -> Bool {
        (lhs.node as NSDictionary).isEqual(rhs.node)
    }

    private var type: String { node["type"] as? String ?? "" }
    private var props: [String: Any] { node["props"] as? [String: Any] ?? [:] }
    private var children: [Any] { node["children"] as? [Any] ?? [] }
    // Resolved in a body-reachable computed property so cell reads are tracked.
    private var style: [String: Any] {
        StateRegistry.shared.resolve(props["style"]) as? [String: Any] ?? [:]
    }

    var body: some View {
        if StateRegistry.shared.resolve(props["hidden"]) as? Bool == true {
            EmptyView()
        } else {
            content
        }
    }

    @ViewBuilder
    private var content: some View {
        switch type {
        case "Text": textView
        case "View": boxContainer
        case "VerticalView": columnContainer
        case "HorizontalView": rowContainer
        case "ScrollView": scrollContainer
        case "ScalingScrollView": scalingScrollContainer
        case "Button": buttonView
        case "List":
            ListNodeView(
                renderItemId: props["renderItemId"] as? String ?? "",
                items: (StateRegistry.shared.resolve(props["items"]) as? [Any]) ?? []
            )
        default:
            Text("Unknown: \(type)").foregroundColor(.red)
        }
    }

    // MARK: - Containers

    private var boxContainer: some View {
        let a = ContainerStyleParser().parse(style)
        return ZStack(alignment: a.box) { childViews }
            .viewStyle(StyleParser().parse(style), alignment: a.box)
    }

    private var columnContainer: some View {
        let a = ContainerStyleParser().parse(style)
        return VStack(alignment: a.columnHorizontal, spacing: 0) { childViews }
            .viewStyle(StyleParser().parse(style),
                       alignment: Alignment(horizontal: a.columnHorizontal, vertical: .top))
    }

    private var rowContainer: some View {
        let a = ContainerStyleParser().parse(style)
        return HStack(alignment: a.rowVertical, spacing: 0) { childViews }
            .viewStyle(StyleParser().parse(style),
                       alignment: Alignment(horizontal: .leading, vertical: a.rowVertical))
    }

    private var scrollContainer: some View {
        ScrollView { VStack(spacing: 0) { childViews } }
            .viewStyle(StyleParser().parse(style))
    }

    // Native watch scaling list (carousel) - the Apple Watch counterpart to
    // Wear's ScalingLazyColumn. Each child becomes a row; row chrome (insets,
    // background, separators) is stripped so the tree renders cleanly.
    private var scalingScrollContainer: some View {
        List {
            ForEach(Array(children.enumerated()), id: \.offset) { pair in
                if let childNode = pair.element as? [String: Any] {
                    NodeView(node: childNode)
                        .equatable()
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }
            }
        }
        .listStyle(.carousel)
        .scrollContentBackground(.hidden)
        .viewStyle(StyleParser().parse(style))
    }

    private var buttonView: some View {
        let a = ContainerStyleParser().parse(style)
        return Button(action: {
            if let id = props["onPress"] as? String { RuntimeBridge.shared.call(id) }
        }) {
            ZStack(alignment: a.box) { childViews }
        }
        .buttonStyle(.plain)
        .viewStyle(StyleParser().parse(style), alignment: a.box)
    }

    @ViewBuilder
    private var childViews: some View {
        ForEach(Array(children.enumerated()), id: \.offset) { pair in
            if let childNode = pair.element as? [String: Any] {
                // List nodes aren't wrapped in .equatable(): their bare-ForEach
                // body must stay transparent to flatten into this container.
                if (childNode["type"] as? String) == "List" {
                    NodeView(node: childNode)
                } else {
                    NodeView(node: childNode).equatable()
                }
            }
        }
    }

    // MARK: - Text

    private var textView: some View {
        let ts = TextStyleParser().parse(style)
        var text = Text(textContent)
        if let font = ts.font { text = text.font(font) }
        if let color = ts.color { text = text.foregroundColor(color) }
        if ts.italic { text = text.italic() }
        if let tracking = ts.tracking { text = text.tracking(tracking) }
        if ts.underline { text = text.underline() }
        if ts.strikethrough { text = text.strikethrough() }
        let horizontal: HorizontalAlignment =
            ts.alignment == .center ? .center : ts.alignment == .trailing ? .trailing : .leading
        return text
            .multilineTextAlignment(ts.alignment)
            .lineLimit(ts.lineLimit)
            .truncationMode(ts.truncation)
            .lineSpacing(ts.lineSpacing)
            .viewStyle(StyleParser().parse(style),
                       alignment: Alignment(horizontal: horizontal, vertical: .top))
    }

    private var textContent: String {
        children.compactMap { child -> String? in
            let resolved = StateRegistry.shared.resolve(child)
            guard let resolved, !(resolved is NSNull) else { return nil }
            return Self.stringify(resolved)
        }.joined()
    }

    private static func stringify(_ value: Any) -> String {
        if let s = value as? String { return s }
        if let n = value as? NSNumber {
            if CFGetTypeID(n) == CFBooleanGetTypeID() { return n.boolValue ? "true" : "false" }
            if n.doubleValue == n.doubleValue.rounded(), abs(n.doubleValue) < 1e15 {
                return String(n.intValue)
            }
            return n.stringValue
        }
        return String(describing: value)
    }
}

// Renders a List by emitting the cached item nodes via a bare ForEach with no
// wrapper, so they flatten into the parent container (like Android's
// ListRenderer). ListCache reruns the JS renderItem only when items/renderItemId
// change, so this does no JS work on an ordinary re-render.
struct ListNodeView: View {
    let renderItemId: String
    let items: [Any]

    var body: some View {
        let rendered = ListCache.shared.rendered(renderItemId: renderItemId, items: items)
        ForEach(Array(rendered.enumerated()), id: \.offset) { pair in
            TreeView(json: pair.element)
        }
    }
}
