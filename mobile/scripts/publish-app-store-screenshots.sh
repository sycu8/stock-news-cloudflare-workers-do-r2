#!/usr/bin/env bash
# Package App Store screenshots and upload to R2 (public download URLs).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/dist/app-store-screenshots"
OUT="$ROOT/dist"
KIT="$OUT/stocknews-app-store-upload-kit"
BASE_URL="https://stocknews.orangecloud.vn/assets/releases"

if [[ ! -d "$SRC/iphone-6.7" ]] || [[ ! -f "$SRC/iphone-6.7/01-home.png" ]]; then
  echo "Screenshots missing — running capture first..."
  "$ROOT/scripts/capture-app-store-screenshots.sh"
fi

rm -rf "$KIT"
mkdir -p "$KIT/iphone-6.7-upload-here" "$KIT/ipad-12.9-upload-here"
cp "$SRC/iphone-6.7"/*.png "$KIT/iphone-6.7-upload-here/"
cp "$SRC/ipad-12.9"/*.png "$KIT/ipad-12.9-upload-here/"

cat > "$KIT/HUONG-DAN-UPLOAD.txt" <<'EOF'
Stock News — App Store Screenshots (đã tạo sẵn)
================================================

Bạn KHÔNG cần chụp lại. Chỉ cần kéo thả vào App Store Connect.

Bước 1: Mở App Store Connect
  https://appstoreconnect.apple.com
  → My Apps → Stock News → App Store → phiên bản 1.0.1

Bước 2: iPhone 6.7" Display
  Kéo 3–5 file PNG từ thư mục "iphone-6.7-upload-here" vào khung iPhone:
    01-home.png
    02-desk.png
    03-portfolio.png
    (tuỳ chọn: 04-stock-vnm.png, 05-notify.png)

Bước 3: iPad 12.9" Display
  Kéo 3–5 file PNG từ thư mục "ipad-12.9-upload-here" vào khung iPad.

Bước 4: Save → tiếp tục điền metadata (xem app-store-connect-vi.txt)

App Previews (video): BỎ QUA lần đầu — không bắt buộc.
EOF

(
  cd "$OUT"
  rm -f stocknews-app-store-upload-kit.zip
  zip -r stocknews-app-store-upload-kit.zip stocknews-app-store-upload-kit
)

echo "Uploading to R2..."
upload() {
  local local_file="$1" r2_key="$2" ctype="$3"
  npx wrangler r2 object put "vn-market-assets/releases/$r2_key" \
    --file="$local_file" --content-type="$ctype" --remote >/dev/null
  echo "  $BASE_URL/$r2_key"
}

upload "$OUT/stocknews-app-store-upload-kit.zip" "stocknews-app-store-upload-kit.zip" "application/zip"
upload "$OUT/stocknews-app-store-screenshots-all.zip" "stocknews-app-store-screenshots-all.zip" "application/zip" 2>/dev/null || true

for f in "$SRC/iphone-6.7"/*.png; do
  name=$(basename "$f")
  upload "$f" "app-store-screenshots/iphone-6.7/$name" "image/png"
done
for f in "$SRC/ipad-12.9"/*.png; do
  name=$(basename "$f")
  upload "$f" "app-store-screenshots/ipad-12.9/$name" "image/png"
done

echo ""
echo "Done. Download kit:"
echo "  $BASE_URL/stocknews-app-store-upload-kit.zip"
echo ""
echo "Individual iPhone PNGs: $BASE_URL/app-store-screenshots/iphone-6.7/"
echo "Individual iPad PNGs:   $BASE_URL/app-store-screenshots/ipad-12.9/"
