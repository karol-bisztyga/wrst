# **APP_NAME**

A [wrst](https://github.com/) smartwatch app - write your UI in TypeScript + JSX,
run it on **Wear OS** and **Apple Watch**.

## Getting started

```sh
npm install
npm start          # dev server + bundler with hot reload
```

Then run the app on a watch (loads the bundle from the dev server):

```sh
npm run run:ios       # build + run on a watchOS simulator (macOS + Xcode)
npm run run:android   # build + install on a Wear OS device/emulator
```

## Project layout

- `src/App.tsx` - your root component (edit this).
- `src/entry.ts` - bundle entry; calls `start(App)`.
- `wrst.config.ts` - app name, bundle ids, dev ports.
- `ios/`, `android/` - thin native shells (own your icons, signing, permissions).

The wrst runtime is a dependency - you write TypeScript, it renders natively.
