#!/usr/bin/env bash
# Package iOS Xcode project + screenshots + Vietnamese upload guide for Mac.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/dist"
KIT_DIR="$OUT_DIR/stocknews-ios-xcode-kit"
ZIP="$OUT_DIR/stocknews-ios-xcode-kit.zip"

rm -rf "$KIT_DIR"
mkdir -p "$KIT_DIR/mobile"

copy_tree() {
  local src="$1" dst="$2"
  mkdir -p "$dst"
  tar -C "$src" \
    --exclude=node_modules \
    --exclude=android \
    --exclude=dist \
    --exclude='.DS_Store' \
    --exclude='ios/App/Pods' \
    --exclude='ios/App/App/public' \
    --exclude='ios/DerivedData' \
    --exclude='.capacitor' \
    -cf - . | tar -C "$dst" -xf -
}

copy_tree "$ROOT" "$KIT_DIR/mobile"

mkdir -p "$KIT_DIR/screenshots" "$KIT_DIR/apple-signing"

if [[ -d "$OUT_DIR/stocknews-app-store-upload-kit" ]]; then
  cp -R "$OUT_DIR/stocknews-app-store-upload-kit/." "$KIT_DIR/screenshots/" 2>/dev/null || true
fi
for z in \
  "$OUT_DIR/stocknews-app-store-screenshots-all.zip" \
  "$OUT_DIR/stocknews-app-store-iphone-screenshots.zip"; do
  if [[ -f "$z" ]]; then
    unzip -qo "$z" -d "$KIT_DIR/screenshots" 2>/dev/null || true
  fi
done

if [[ -d "$OUT_DIR/apple-signing" ]]; then
  cp "$OUT_DIR/apple-signing/README.txt" "$KIT_DIR/apple-signing/" 2>/dev/null || true
  cp "$OUT_DIR/apple-signing/stocknews-ios.certSigningRequest" "$KIT_DIR/apple-signing/" 2>/dev/null || true
fi

cat > "$KIT_DIR/HUONG-DAN-XCODE-UPLOAD.txt" <<'TXT'
Stock News — Build iOS và Upload bằng Xcode
===========================================

YÊU CẦU: Mac + Xcode 15+ + Apple Developer ($99/năm)

BƯỚC 1 — Terminal:
  cd mobile
  npm install
  npx cap sync ios
  cd ios/App && pod install

BƯỚC 2 — Mở Xcode:
  open ios/App/App.xcworkspace

BƯỚC 3 — Signing & Capabilities:
  Team: Cloudspace
  Bundle ID: vn.orangecloud.stocknews
  Associated Domains: applinks:stocknews.orangecloud.vn
  Version: 1.0.1 · Build: 3

BƯỚC 4 — Archive:
  Chọn "Any iOS Device (arm64)"
  Product → Archive

BƯỚC 5 — Upload:
  Organizer → Distribute App → App Store Connect → Upload

BƯỚC 6 — App Store Connect:
  https://appstoreconnect.apple.com
  Chọn build 3, kéo screenshot từ thư mục screenshots/
  Copy metadata từ mobile/store/app-store-connect-vi.txt
  Add for Review

Chi tiết đầy đủ: mobile/store/XCODE_UPLOAD_VI.md
TXT

rm -f "$ZIP"
(
  cd "$OUT_DIR"
  zip -rq "$(basename "$ZIP")" "$(basename "$KIT_DIR")"
)

echo "Created: $ZIP ($(du -h "$ZIP" | cut -f1))"
