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
| `wrst run-ios`       | Build + install + launch on a watchOS simulator                 |
| `wrst run-android`   | Build + install + launch on a Wear OS device/emulator           |
| `wrst build-ios`     | Release build (bundle embedded, runs offline)                   |
| `wrst build-android` | Release build → APK                                             |
| `wrst sync`          | Apply `wrst.config.ts` (name, bundle id) to the native projects |
| `wrst help`          | List commands                                                   |

`run-*` / `build-*` boot a simulator/emulator automatically if none is running.

See the project's repository README for the full quickstart.
