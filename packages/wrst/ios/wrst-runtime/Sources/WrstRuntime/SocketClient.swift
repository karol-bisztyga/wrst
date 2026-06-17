import Foundation
import WatchKit

// pulls the bundle over HTTP and listens for reload /
// build_error signals over a WebSocket. Host is "localhost" because the watchOS
// simulator shares the Mac's network (Android used 10.0.2.2 for the emulator).
@MainActor
final class SocketClient {
    private let host: String
    private let session = URLSession(configuration: .default)
    private var webSocket: URLSessionWebSocketTask?

    var onCode: (String) -> Void = { _ in }
    var onError: (String) -> Void = { _ in }

    init(host: String = "localhost") {
        self.host = host
    }

    func connect() {
        guard let url = URL(string: "ws://\(host):8082") else { return }
        let task = session.webSocketTask(with: url)
        webSocket = task
        task.resume()
        sendHello()
        receive()
    }

    // Identify this device to the dev server (for the `l` key binding).
    private func sendHello() {
        let name = WKInterfaceDevice.current().name
        guard let data = try? JSONSerialization.data(withJSONObject: ["type": "hello", "name": name]),
              let json = String(data: data, encoding: .utf8) else { return }
        webSocket?.send(.string(json)) { _ in }
    }

    func disconnect() {
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
    }

    private func receive() {
        webSocket?.receive { [weak self] result in
            Task { @MainActor in
                guard let self else { return }
                switch result {
                case .success(let message):
                    if case .string(let text) = message { self.handle(text) }
                    self.receive()
                case .failure(let error):
                    self.onError("[ws] error: \(error.localizedDescription)")
                }
            }
        }
    }

    private func handle(_ text: String) {
        // Server only sends a re-pull nudge; the HTTP response is authoritative.
        pullCode()
    }

    func pullCode() {
        guard let url = URL(string: "http://\(host):8081/bundle.js") else { return }
        let task = session.dataTask(with: url) { [weak self] data, response, error in
            Task { @MainActor in
                guard let self else { return }
                if let error {
                    self.onError("[http] fetch failed: \(error.localizedDescription)")
                    return
                }
                let status = (response as? HTTPURLResponse)?.statusCode ?? -1
                if status == 503 { return } // no bundle built yet - wait for build
                let body = data.flatMap { String(data: $0, encoding: .utf8) }
                if status == 422 {
                    // server is hosting a build error instead of the bundle
                    self.onError(body ?? "Build failed")
                    return
                }
                guard (200..<300).contains(status), let body else {
                    self.onError("[http] bad response: \(status)")
                    return
                }
                self.onCode(body)
            }
        }
        task.resume()
    }
}
