#!/usr/bin/env bash
# Capture Play Store phone screenshots (1080×1920). Requires Google Chrome.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist/screenshots"
BASE="${1:-https://stocknews.orangecloud.vn}"
mkdir -p "$OUT"
capture() {
  local path="$1" name="$2"
  local udir="/tmp/chrome-shot-${name}-$$"
  mkdir -p "$udir"
  echo "Capturing $name ..."
  google-chrome --headless --disable-gpu --no-sandbox \
    --user-data-dir="$udir" \
    --window-size=1080,1920 \
    --screenshot="$OUT/${name}.png" \
    "${BASE}${path}" 2>/dev/null || true
  rm -rf "$udir"
}
capture "/" home
capture "/desk" desk
capture "/portfolio" portfolio
capture "/stocks/VNM" stock-vnm
capture "/notify" notify
echo "Screenshots in $OUT:"
ls -lh "$OUT"/*.png 2>/dev/null || echo "No PNGs — install Chrome or capture on device emulator"
