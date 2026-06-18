import Foundation
import WatchConnectivity
import React

// Phone-side companion bridge over WatchConnectivity (WCSession). The counterpart
// of the watch's CompanionManager (WrstRuntime). Exposes availability + message
// send/receive to RN JS via the `@wrst/react-native` package. The OS owns pairing;
// we only read reachability/install state and exchange messages. See CONTRACT.md.
@objc(WrstCompanion)
final class WrstCompanion: RCTEventEmitter {
  // Dictionary key both sides agree on for the JSON-string payload (matches the
  // watch hosts).
  private static let messageKey = "wrst"

  private var hasListeners = false

  override init() {
    super.init()
    if WCSession.isSupported() {
      let session = WCSession.default
      session.delegate = self
      session.activate()
    }
  }

  @objc override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! {
    ["wrstCompanionStatus", "wrstCompanionMessage"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  // The single behavior branch (`available`) + an optional reason for UI text.
  private func currentStatus() -> [String: Any] {
    guard WCSession.isSupported() else {
      return ["available": false, "reason": "no-device"]
    }
    let s = WCSession.default
    var available = false
    var reason: String? = "no-device"
    if s.activationState != .activated || !s.isPaired {
      reason = "no-device"
    } else if !s.isWatchAppInstalled {
      reason = "app-not-installed"
    } else if !s.isReachable {
      reason = "unreachable"
    } else {
      available = true
      reason = nil
    }
    return ["available": available, "reason": reason as Any]
  }

  @objc(getStatus:rejecter:)
  func getStatus(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve(currentStatus())
  }

  @objc(sendMessage:resolver:rejecter:)
  func sendMessage(_ json: String,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard WCSession.isSupported() else {
      reject("unavailable", "WCSession is not supported on this device", nil)
      return
    }
    let s = WCSession.default
    if s.isReachable {
      s.sendMessage([Self.messageKey: json], replyHandler: nil) { error in
        reject("send_failed", error.localizedDescription, error)
      }
    } else {
      // Not reachable now → queue for background delivery to the watch.
      s.transferUserInfo([Self.messageKey: json])
    }
    resolve(nil)
  }

  private func emitStatus() {
    guard hasListeners else { return }
    sendEvent(withName: "wrstCompanionStatus", body: currentStatus())
  }
}

extension WrstCompanion: WCSessionDelegate {
  func session(_ session: WCSession,
               activationDidCompleteWith activationState: WCSessionActivationState,
               error: Error?) {
    emitStatus()
  }

  // iOS-only required delegate methods (a phone can re-pair to another watch).
  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) {
    WCSession.default.activate()
  }

  func sessionWatchStateDidChange(_ session: WCSession) { emitStatus() }
  func sessionReachabilityDidChange(_ session: WCSession) { emitStatus() }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    guard hasListeners, let json = message[Self.messageKey] as? String else { return }
    sendEvent(withName: "wrstCompanionMessage", body: json)
  }

  func session(_ session: WCSession,
               didReceiveUserInfo userInfo: [String: Any] = [:]) {
    guard hasListeners, let json = userInfo[Self.messageKey] as? String else { return }
    sendEvent(withName: "wrstCompanionMessage", body: json)
  }
}
