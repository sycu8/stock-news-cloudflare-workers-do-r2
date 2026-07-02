#!/usr/bin/env bash
# Capture App Store screenshots for iPhone 6.7" and iPad 12.9".
# Requires Google Chrome. Output: mobile/dist/app-store-screenshots/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-https://stocknews.orangecloud.vn}"
OUT="$ROOT/dist/app-store-screenshots"

# App Store Connect accepted sizes (portrait)
IPHONE_67_W=1290
IPHONE_67_H=2796
IPHONE_65_W=1284
IPHONE_65_H=2778
IPAD_W=2048
IPAD_H=2732

PAGES=(
  "/|01-home"
  "/desk|02-desk"
  "/portfolio|03-portfolio"
  "/stocks/VNM|04-stock-vnm"
  "/notify|05-notify"
)

capture() {
  local path="$1" name="$2" w="$3" h="$4" subdir="$5"
  local dir="$OUT/$subdir"
  local udir="/tmp/chrome-shot-${subdir}-${name}-$$"
  mkdir -p "$dir" "$udir"
  echo "  $subdir/$name (${w}x${h}) ..."
  timeout 120 google-chrome --headless=new --disable-gpu --no-sandbox \
    --user-data-dir="$udir" \
    --remote-debugging-port=0 \
    --window-size="${w},${h}" \
    --hide-scrollbars \
    --screenshot="$dir/${name}.png" \
    "${BASE}${path}" 2>/dev/null || echo "    (timeout or error — skip $name)"
  rm -rf "$udir"
  if [[ -f "$dir/${name}.png" ]]; then
    echo "    OK $(file -b "$dir/${name}.png" | cut -d, -f1-2)"
  fi
}

mkdir -p "$OUT/iphone-6.7" "$OUT/iphone-6.5" "$OUT/ipad-12.9"

echo "Capturing iPhone 6.7\" (${IPHONE_67_W}x${IPHONE_67_H}) ..."
for entry in "${PAGES[@]}"; do
  IFS='|' read -r path name <<< "$entry"
  capture "$path" "$name" "$IPHONE_67_W" "$IPHONE_67_H" "iphone-6.7"
done

echo "Capturing iPhone 6.5\" (${IPHONE_65_W}x${IPHONE_65_H}) ..."
for entry in "${PAGES[@]}"; do
  IFS='|' read -r path name <<< "$entry"
  capture "$path" "$name" "$IPHONE_65_W" "$IPHONE_65_H" "iphone-6.5"
done

echo "Capturing iPad 12.9\" (${IPAD_W}x${IPAD_H}) ..."
for entry in "${PAGES[@]}"; do
  IFS='|' read -r path name <<< "$entry"
  capture "$path" "$name" "$IPAD_W" "$IPAD_H" "ipad-12.9"
done

echo ""
echo "Done. Screenshots:"
find "$OUT" -name '*.png' -exec ls -lh {} \;

# Zip bundles for download
(
  cd "$OUT"
  zip -r ../stocknews-app-store-iphone-screenshots.zip iphone-6.7/*.png 2>/dev/null || true
  zip -r ../stocknews-app-store-iphone-6.5-screenshots.zip iphone-6.5/*.png 2>/dev/null || true
  zip -r ../stocknews-app-store-ipad-screenshots.zip ipad-12.9/*.png 2>/dev/null || true
  zip -r ../stocknews-app-store-screenshots-all.zip iphone-6.7 iphone-6.5 ipad-12.9 2>/dev/null || true
)

echo ""
echo "Zip bundles:"
ls -lh "$ROOT/dist"/stocknews-app-store-*-screenshots*.zip 2>/dev/null || true
