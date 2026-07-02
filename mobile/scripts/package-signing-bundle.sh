#!/usr/bin/env bash
# Packages Android signing files for download to your build machine (keystore is NOT in git).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/dist"
ZIP="$OUT_DIR/stocknews-android-signing.zip"
mkdir -p "$OUT_DIR"
if [[ ! -f "$ROOT/stocknews-release.keystore" ]]; then
  echo "Missing $ROOT/stocknews-release.keystore — run keytool setup first." >&2
  exit 1
fi
if [[ ! -f "$ROOT/android/keystore.properties" ]]; then
  echo "Missing android/keystore.properties" >&2
  exit 1
fi
rm -f "$ZIP"
(
  cd "$ROOT"
  zip -j "$ZIP" stocknews-release.keystore android/keystore.properties store/CREDENTIALS.local.md 2>/dev/null || \
  zip -j "$ZIP" stocknews-release.keystore android/keystore.properties
)
if [[ -f "$OUT_DIR/app-release.aab" ]]; then
  echo "Release AAB ready: $OUT_DIR/app-release.aab ($(du -h "$OUT_DIR/app-release.aab" | cut -f1))"
fi
echo "Created: $ZIP"
echo "Copy to your PC, unzip into mobile/, then run: cd mobile/android && ./gradlew bundleRelease"
