#!/usr/bin/env bash

set -e

echo "[dev] starting esbuild watch..."

mkdir -p packages/native-android/app/src/main/assets

npx esbuild example/src/entry.ts \
  --bundle \
  --outfile=dist/bundle.js \
  --platform=neutral \
  --format=iife \
  --watch=forever &

ESBUILD_PID=$!

echo "[dev] watching dist/bundle.js..."

while true; do
  if [[ dist/bundle.js -nt packages/native-android/app/src/main/assets/bundle.js ]]; then
    echo "[dev] change detected → copying"
    cp dist/bundle.js packages/native-android/app/src/main/assets/bundle.js
  fi
  sleep 0.2
done

trap "kill $ESBUILD_PID" EXIT