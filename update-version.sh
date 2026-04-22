#!/bin/sh

set -e

if [ -z "$1" ]; then
  echo "Usage: ./update-version.sh <version>"
  echo "Example: ./update-version.sh 0.4.0-alpha.7"
  exit 1
fi

VERSION="$1"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT_DIR"

echo "Updating workspace packages to version $VERSION"
yarn lerna version "$VERSION" --ignore-changes --no-git-tag-version --no-push

echo "Preparing packages"
yarn prepare

echo "Checking version consistency"
yarn check-version

echo "Version updated to $VERSION"
