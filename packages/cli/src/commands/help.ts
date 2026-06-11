export function help(): void {
  process.stdout.write(
    `
wrst - build smartwatch apps with TypeScript + JSX (Wear OS + Apple Watch)

Usage: wrst <command> [options]

Commands:
  init <name>         Scaffold a new wrst project in ./<name>
  start               Start the dev server + bundler (hot reload)
  sync                Apply wrst.config.ts (name, bundle id) to ios/ + android/
  run-ios             Build + run on a watchOS simulator
  run-android         Build + install on a Wear OS device/emulator
  build-ios           Release build for Apple Watch
  build-android       Release build for Wear OS
  help                Show this help
`,
  );
}
