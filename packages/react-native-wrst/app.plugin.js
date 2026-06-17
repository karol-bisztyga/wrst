// Expo resolves `<package>/app.plugin.js` when "react-native-wrst" is listed in
// the app config `plugins`. Links the WrstRuntime Swift package to the watch
// target @bacons/apple-targets generates (must be listed AFTER it).
module.exports = require("./plugin/withWrstWatch");
