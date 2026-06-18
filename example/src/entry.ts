import { start } from "@wrst/core";
import App from "./examples/App.tsx";

// Entry point - this is all a consumer app needs: import the
// framework, import its root component, and start. A scaffolded project
// (npx @wrst/core new) would generate exactly this file.
start(App);
