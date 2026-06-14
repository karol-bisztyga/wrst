import SwiftUI
import UIKit

// Shared decoded-image cache (a stored static can't live on the generic view).
enum ImageCache {
    static let shared = NSCache<NSString, UIImage>()
}

// A caching image view. SwiftUI's AsyncImage doesn't keep a decoded-image cache
// (it re-fetches on each appearance), so this backs loads with an NSCache keyed
// by source. Reopening a screen is then an instant cache hit, matching Coil on
// Android. Loads a remote/dev URL asynchronously, or a release-embedded resource
// from the bundle. Shows `placeholder` (the loader node, if any) while loading.
struct CachedAsyncImage<Placeholder: View>: View {
    let source: AssetSource
    let mode: String       // "fit" | "cover" | "stretch"
    @ViewBuilder let placeholder: () -> Placeholder

    @State private var image: UIImage?
    @State private var failed = false

    var body: some View {
        ZStack {
            Color.clear
            content
        }
        .task(id: cacheKey) { await load() }
    }

    private var cacheKey: String {
        switch source {
        case .url(let u): return u.absoluteString
        case .bundled(let n): return "bundled:\(n)"
        case .none: return "none"
        }
    }

    @ViewBuilder
    private var content: some View {
        if let image {
            let base = Image(uiImage: image).resizable()
            switch mode {
            case "cover": base.aspectRatio(contentMode: .fill)
            case "stretch": base
            default: base.aspectRatio(contentMode: .fit)
            }
        } else if failed {
            Color.clear
        } else {
            placeholder() // the loader node, or empty
        }
    }

    private func load() async {
        failed = false
        let key = cacheKey as NSString
        if let cached = ImageCache.shared.object(forKey: key) {
            image = cached
            return
        }
        switch source {
        case .none:
            failed = true
        case .bundled(let name):
            if let ui = Self.loadBundled(name) {
                ImageCache.shared.setObject(ui, forKey: key)
                image = ui
            } else {
                failed = true
            }
        case .url(let url):
            image = nil
            do {
                let (data, resp) = try await URLSession.shared.data(from: url)
                guard let ui = UIImage(data: data) else {
                    failed = true; return
                }
                ImageCache.shared.setObject(ui, forKey: key)
                image = ui
            } catch {
                failed = true
            }
        }
    }

    // A resource embedded by `wrst build-ios` (loose file in the app bundle).
    private static func loadBundled(_ name: String) -> UIImage? {
        let ns = name as NSString
        let ext = ns.pathExtension
        if let url = Bundle.main.url(
            forResource: ns.deletingPathExtension,
            withExtension: ext.isEmpty ? nil : ext),
            let data = try? Data(contentsOf: url) {
            return UIImage(data: data)
        }
        return UIImage(named: name)
    }
}
