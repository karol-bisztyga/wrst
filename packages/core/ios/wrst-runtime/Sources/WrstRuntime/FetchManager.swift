import Foundation

// Mirrors JsRuntimeManager.kt's nativeFetch: performs the request off-main, then
// invokes the JS resolve/reject callback via call(id, json). The response object
// matches what fetch.ts expects: { ok, status, statusText, rawBody, jsonBody? }.
// Like Android (dev), it trusts all server certs.
enum FetchManager {
    private final class TrustAllDelegate: NSObject, URLSessionDelegate {
        func urlSession(_ session: URLSession,
                        didReceive challenge: URLAuthenticationChallenge,
                        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
            if let trust = challenge.protectionSpace.serverTrust {
                completionHandler(.useCredential, URLCredential(trust: trust))
            } else {
                completionHandler(.performDefaultHandling, nil)
            }
        }
    }

    private static let session = URLSession(
        configuration: .default, delegate: TrustAllDelegate(), delegateQueue: nil
    )

    static func perform(url urlStr: String, optionsJSON: String, resolveId: String, rejectId: String) {
        guard let url = URL(string: urlStr) else {
            reject(rejectId, "invalid url: \(urlStr)")
            return
        }

        var request = URLRequest(url: url)
        if let data = optionsJSON.data(using: .utf8),
           let options = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            let method = (options["method"] as? String)?.uppercased() ?? "GET"
            request.httpMethod = method
            (options["headers"] as? [String: String])?.forEach {
                request.setValue($1, forHTTPHeaderField: $0)
            }
            if method != "GET", method != "HEAD",
               let body = options["body"] as? String, !body.isEmpty {
                request.httpBody = body.data(using: .utf8)
                if request.value(forHTTPHeaderField: "Content-Type") == nil {
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                }
            }
        }

        session.dataTask(with: request) { data, response, error in
            if let error {
                reject(rejectId, error.localizedDescription)
                return
            }
            guard let http = response as? HTTPURLResponse else {
                reject(rejectId, "no response")
                return
            }
            resolve(resolveId, http, data ?? Data())
        }.resume()
    }

    private static func resolve(_ resolveId: String, _ http: HTTPURLResponse, _ data: Data) {
        let status = http.statusCode
        var responseData: [String: Any] = [
            "ok": (200..<300).contains(status),
            "status": status,
            "statusText": HTTPURLResponse.localizedString(forStatusCode: status),
            "rawBody": String(data: data, encoding: .utf8) ?? "",
        ]
        if let jsonBody = try? JSONSerialization.jsonObject(with: data),
           jsonBody is [String: Any] || jsonBody is [Any] {
            responseData["jsonBody"] = jsonBody
        }
        let json = (try? JSONSerialization.data(withJSONObject: responseData))
            .flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        Task { @MainActor in RuntimeBridge.shared.callJSON(resolveId, json) }
    }

    private static func reject(_ rejectId: String, _ message: String) {
        let literal = (try? JSONSerialization.data(withJSONObject: message, options: [.fragmentsAllowed]))
            .flatMap { String(data: $0, encoding: .utf8) } ?? "\"fetch failed\""
        Task { @MainActor in RuntimeBridge.shared.callJSON(rejectId, literal) }
    }
}
