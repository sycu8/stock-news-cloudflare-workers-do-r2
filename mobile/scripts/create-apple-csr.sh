#!/usr/bin/env bash
# Generate Apple Certificate Signing Request (CSR) + private key.
# Upload ONLY the .certSigningRequest to Apple Developer portal.
# Keep the .key file private — needed later on Mac for Xcode export/import.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${1:-$ROOT/dist/apple-signing}"
ORG="${APPLE_CSR_ORG:-Cloudspace}"
CN="${APPLE_CSR_CN:-Cloudspace}"
EMAIL="${APPLE_CSR_EMAIL:-support@orangecloud.vn}"
COUNTRY="${APPLE_CSR_COUNTRY:-VN}"

mkdir -p "$OUT_DIR"

KEY="$OUT_DIR/stocknews-ios-private.key"
CSR="$OUT_DIR/stocknews-ios.certSigningRequest"
INFO="$OUT_DIR/README.txt"

if [[ -f "$KEY" ]]; then
  echo "Private key already exists: $KEY"
  echo "Delete it first if you want a new CSR."
  exit 1
fi

openssl genrsa -out "$KEY" 2048
chmod 600 "$KEY"

openssl req -new \
  -key "$KEY" \
  -out "$CSR" \
  -subj "/emailAddress=${EMAIL}/C=${COUNTRY}/O=${ORG}/CN=${CN}"

cat > "$INFO" <<EOF
Stock News iOS — Apple CSR bundle
=================================

Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

UPLOAD TO APPLE (this file only):
  stocknews-ios.certSigningRequest

KEEP PRIVATE (never upload, never commit to git):
  stocknews-ios-private.key

Organization: ${ORG}
Common Name:  ${CN}
Email:        ${EMAIL}
Country:      ${COUNTRY}

Apple Developer steps:
1. https://developer.apple.com/account/resources/certificates/list
2. Click "+" → Apple Distribution (App Store) OR Apple Development (testing)
3. Continue → Upload "stocknews-ios.certSigningRequest"
4. Download the issued .cer certificate

After Apple issues the certificate (.cer), on Mac:
1. Double-click the .cer to add to Keychain
2. Export .p12 from Keychain (includes cert + private key from this bundle)
   OR use Xcode automatic signing (easier): Xcode → Settings → Accounts → Cloudspace team

See mobile/store/APPLE_IOS_CSR.md for full instructions.
EOF

echo ""
echo "Created:"
echo "  CSR (upload to Apple): $CSR"
echo "  Private key (keep safe): $KEY"
echo "  Instructions:            $INFO"
echo ""
echo "Next: upload $CSR at developer.apple.com → Certificates → +"
