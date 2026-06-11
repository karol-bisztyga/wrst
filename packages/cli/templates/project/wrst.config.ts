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
    httpPort: 8081,
    wsPort: 8082,
  },
};
