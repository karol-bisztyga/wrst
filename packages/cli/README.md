# @wrst/cli

The command-line tool for [wrst](https://www.npmjs.com/package/wrst) - scaffold,
develop, and build smartwatch apps for Wear OS and Apple Watch.

```sh
npx wrst init my-app
```

## Commands

| Command              | What it does                                                    |
| -------------------- | --------------------------------------------------------------- |
| `wrst init <name>`   | Scaffold a new project in `./<name>`                            |
| `wrst start`         | Dev server + bundler with hot reload                            |
| `wrst run:apple-watch`   | Debug build + install + launch on a watchOS simulator (dev server) |
| `wrst run:wear-os`       | Debug build + install + launch on a Wear OS device/emulator (dev server) |
| `wrst build:apple-watch` | Debug build only, no install (the build half of `run:*`)    |
| `wrst build:wear-os`     | Debug build only, no install                                |
| `wrst build-release:apple-watch` | Release build (JS bundle embedded, runs offline)    |
| `wrst build-release:wear-os`     | Release build → APK (JS bundle embedded)            |
| `wrst sync`              | Apply `wrst.config.ts` (name, bundle id) to the native projects |
| `wrst help`              | List commands                                                   |

`run:*` boots a simulator/emulator automatically if none is running. `run:*`/`build:*`
are **debug** (JS pulled live from the dev server); `build-release:*` embeds the JS bundle
for an **offline** release build.

See the project's repository README for the full quickstart.
