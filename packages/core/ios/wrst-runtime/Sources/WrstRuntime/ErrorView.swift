import SwiftUI

// Mirrors ErrorHandler.kt's error screen - shows the build/JS error with a
// reload button.
struct ErrorView: View {
    let message: String
    let onReload: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                Button("Reload", action: onReload)
                Text(message)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }
            .padding()
        }
    }
}
