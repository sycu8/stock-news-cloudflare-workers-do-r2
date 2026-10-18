#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ ! -f android/keystore.properties ]]; then
  echo "Copy keystore bundle first. See store/CONNECT_AND_UPLOAD.md" >&2
  exit 1
fi
npm install
npx cap sync android
cd android
./gradlew bundleRelease
AAB="app/build/outputs/bundle/release/app-release.aab"
if [[ -f "$AAB" ]]; then
  echo ""
  echo "Upload this file to Google Play Console:"
  echo "  $ROOT/android/$AAB"
  ls -lh "$AAB"
else
  echo "Build finished but AAB not found at $AAB" >&2
  exit 1
fi
