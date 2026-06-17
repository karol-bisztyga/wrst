// wrst project configuration - read by the CLI for dev + native builds.
export default {
  name: "__APP_NAME__",
  entry: "src/entry.ts",
  ios: {
    // Leading dot is intentional: the watch app is a companion-style target with
    // an empty parent, so the bundle id is "<parent>." + this. That's what the
    // simulator install requires. For App Store distribution, set a real bundle
    // id + signing in Xcode.
    bundleId: ".__APP_ID__",
  },
  android: {
    applicationId: "com.example.__APP_ID__",
  },
  server: {
    httpPort: 8091,
    wsPort: 8092,
  },

  // Permissions. Uncomment the ones your app needs - `wrst sync` (also run by
  // run-*/build-*) adds/removes them to/from Info.plist/AndroidManifest.xml.
  // A bare app declares none, so it prompts for nothing.
  // `reason` is shown in the iOS permission dialog (Apple requires it;
  // Android's wording is system-set).
  // Engine sensors (accelerometer, gyroscope, magnetometer)
  // need no permission and are intentionally not listed.
  permissions: {
    // heartRate:     { reason: "Reads your heart rate." },        // iOS HealthKit (also enable the HealthKit capability in Xcode) · Android BODY_SENSORS
    // activity:      { reason: "Counts your steps and motion." }, // iOS Motion · Android ACTIVITY_RECOGNITION
    // location:      { reason: "Shows your route." },             // iOS Location · Android ACCESS_FINE/COARSE_LOCATION
    // microphone:    { reason: "Records audio." },                // iOS Microphone · Android RECORD_AUDIO
    // bluetooth:     { reason: "Connects to nearby devices." },   // iOS Bluetooth · Android BLUETOOTH_CONNECT/SCAN
    // notifications: { reason: "Sends you alerts." },             // Android POST_NOTIFICATIONS (iOS: runtime only)
  },
};
