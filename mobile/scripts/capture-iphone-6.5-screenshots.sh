#!/usr/bin/env bash
# Capture iPhone 6.5" App Store screenshots only (1284×2778).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-https://stocknews.orangecloud.vn}"
OUT="$ROOT/dist/app-store-screenshots"
W=1284
H=2778
PAGES=("/|01-home" "/desk|02-desk" "/portfolio|03-portfolio" "/stocks/VNM|04-stock-vnm" "/notify|05-notify")

mkdir -p "$OUT/iphone-6.5"
for entry in "${PAGES[@]}"; do
  IFS='|' read -r path name <<< "$entry"
  udir="/tmp/chrome-65-${name}-$$"
  mkdir -p "$udir"
  echo "Capturing iphone-6.5/$name (${W}x${H}) ..."
  timeout 120 google-chrome --headless=new --disable-gpu --no-sandbox \
    --user-data-dir="$udir" --remote-debugging-port=0 \
    --window-size="${W},${H}" --hide-scrollbars \
    --screenshot="$OUT/iphone-6.5/${name}.png" "${BASE}${path}" 2>/dev/null || true
  rm -rf "$udir"
  [[ -f "$OUT/iphone-6.5/${name}.png" ]] && file -b "$OUT/iphone-6.5/${name}.png" | cut -d, -f1-2
done
(cd "$OUT" && zip -r ../stocknews-app-store-iphone-6.5-screenshots.zip iphone-6.5/*.png)
echo "Done: $OUT/iphone-6.5/"
