#!/usr/bin/env bash
# Release the wrst packages to npm and tag the repo.
#
# Usage: bash scripts/release.sh <version>      e.g. bash scripts/release.sh 0.1.0
#
# Pass a bare version (no 'v' prefix) - the script adds the 'v' for the git tag.
# Publishes in dependency order (@wrst/cli -> @wrst/core -> @wrst/react-native),
# since `@wrst/core` depends on `@wrst/cli`. Validates the version, checks every package.json
# already matches it, runs typecheck + the native build (what `prepack` runs
# anyway), shows the plan, and asks before publishing.
set -euo pipefail

cd "$(dirname "$0")/.."

# --- argument: the release version -------------------------------------------
VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "release: missing version argument." >&2
  echo "         usage: bash scripts/release.sh <version>   (e.g. 0.1.0)" >&2
  exit 1
fi

# Accept a bare version; tolerate (and strip) an accidental leading 'v'.
VERSION="${VERSION#v}"

# Require MAJOR.MINOR.PATCH[-prerelease] (e.g. 0.1.0, 1.2.3-rc.0).
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  echo "release: \"$VERSION\" is not a valid version." >&2
  echo "         expected MAJOR.MINOR.PATCH, e.g. 0.1.0 or 1.2.3-rc.0 (no 'v' prefix)" >&2
  exit 1
fi

TAG="v$VERSION"  # the git tag carries the 'v' prefix

# Refuse to clobber an existing tag.
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "release: git tag \"$TAG\" already exists." >&2
  echo "         pick a new version, or delete it with: git tag -d $TAG" >&2
  exit 1
fi

# --- version consistency check -----------------------------------------------
# Every package we publish must already be set to $VERSION; bump them before
# releasing rather than letting the tag drift from what's on npm.
echo "release: checking package versions match $VERSION..."
for PKG in packages/cli packages/wrst packages/react-native-wrst; do
  PKG_VERSION="$(node -p "require('./$PKG/package.json').version")"
  PKG_NAME="$(node -p "require('./$PKG/package.json').name")"
  if [ "$PKG_VERSION" != "$VERSION" ]; then
    echo "release: $PKG_NAME is at $PKG_VERSION, but you asked to release $VERSION." >&2
    echo "         bump it (e.g. npm version $VERSION -w $PKG_NAME --no-git-tag-version) and retry." >&2
    exit 1
  fi
done

# --- pre-publish checks ------------------------------------------------------
echo "release: confirming npm authentication..."
if ! NPM_USER="$(npm whoami 2>/dev/null)"; then
  echo "release: not logged in to npm. Run \`npm login\` first." >&2
  exit 1
fi

echo "release: typechecking..."
npm run typecheck

echo "release: building native runtimes (Android AAR + Apple Watch package)..."
npm run build:native -w @wrst/core

# --- plan + confirmation -----------------------------------------------------
cat <<EOF

============================ release plan ============================
  tag:          $TAG  (version $VERSION)
  npm user:     $NPM_USER
  git branch:   $(git rev-parse --abbrev-ref HEAD)
  git commit:   $(git rev-parse --short HEAD)

  will publish, in order:
    1. @wrst/cli
    2. @wrst/core
    3. @wrst/react-native

  then: git tag $TAG && git push --tags
=====================================================================

EOF

read -r -p "Do you want to continue? (y/N) " REPLY
case "$REPLY" in
  y|Y) ;;
  *) echo "release: aborted."; exit 1 ;;
esac

# --- publish (dependency order) ----------------------------------------------
echo "release: publishing @wrst/cli..."
npm publish -w @wrst/cli

echo "release: publishing @wrst/core..."
npm publish -w @wrst/core

echo "release: publishing @wrst/react-native..."
npm publish -w @wrst/react-native

# --- tag ---------------------------------------------------------------------
echo "release: tagging $TAG..."
git tag "$TAG"
git push --tags

echo "release: done - published $TAG and pushed the git tag."
