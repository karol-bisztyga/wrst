export function help(): void {
  process.stdout.write(
    `
wrst - build smartwatch apps with TypeScript + JSX (Wear OS + Apple Watch)

Usage: wrst <command> [options]

Commands:
  init <name>         Scaffold a new wrst project in ./<name>
  init --companion <path>
                      Add a wrst watch app to an existing React Native project
                      (e.g. \`wrst init --companion .\`)
  start               Start the dev server + bundler (hot reload)
  sync                Apply wrst.config.ts (name, bundle id) to apple-watch/ + wear-os/
  run:apple-watch     Debug build + run on a watchOS simulator (dev server)
  run:wear-os         Debug build + install on a Wear OS device/emulator (dev server)
  build:apple-watch   Debug build only, no install (the build half of run:*)
  build:wear-os       Debug build only, no install
  build-release:apple-watch  Release build (JS bundle embedded, runs offline)
  build-release:wear-os      Release build -> APK (JS bundle embedded)
  help                Show this help
`,
  );
}
