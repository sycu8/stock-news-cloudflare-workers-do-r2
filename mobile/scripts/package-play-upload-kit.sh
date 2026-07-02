#!/usr/bin/env bash
# Zip everything needed for Play Store internal testing upload.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist"
ZIP="$OUT/stocknews-play-upload-kit.zip"
mkdir -p "$OUT"
[[ -f "$OUT/app-release.aab" ]] || { echo "Missing app-release.aab — run build-release-aab.sh first" >&2; exit 1; }
rm -f "$ZIP"
(
  cd "$OUT"
  zip -r "$ZIP" app-release.aab stocknews-android-signing.zip 2>/dev/null || zip "$ZIP" app-release.aab
  [[ -d screenshots ]] && zip -r "$ZIP" screenshots/*.png 2>/dev/null || true
)
(
  cd "$ROOT/store"
  zip "$ZIP" play-listing-vi.txt PLAY_CONSOLE_WIZARD.md DATA_SAFETY.md PLAY_STORE_LISTING.md
)
echo "Created: $ZIP ($(du -h "$ZIP" | cut -f1))"
echo "Download this zip → upload app-release.aab in Play Console"
echo "Follow PLAY_CONSOLE_WIZARD.md inside the zip (store/ files included)"
