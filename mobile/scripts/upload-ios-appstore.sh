#!/usr/bin/env bash
# Upload a signed .ipa to App Store Connect via API (Transporter or App Store Connect API).
#
# Required env:
#   APPSTORE_ISSUER_ID          — Issuer ID (App Store Connect → Users and Access → Integrations → API)
#   APPSTORE_API_KEY_ID         — Key ID (e.g. ABC123DEF4)
#   APPSTORE_API_PRIVATE_KEY    — Contents of AuthKey_<KEY_ID>.p8 (or path via APPSTORE_API_KEY_PATH)
#
# Optional:
#   IPA_PATH                    — default: mobile/dist/StockNews.ipa
#   APPSTORE_INFO_PLIST         — AppStoreInfo.plist (recommended for Linux Transporter)
#   UPLOAD_BACKEND              — transporter | appstore-api (default: appstore-api if gh action unavailable)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
IPA_PATH="${IPA_PATH:-$ROOT/mobile/dist/StockNews.ipa}"
KEY_DIR="${HOME}/.appstoreconnect/private_keys"

if [[ ! -f "$IPA_PATH" ]]; then
  echo "ERROR: IPA not found at $IPA_PATH"
  echo "Build on Mac first (Xcode Archive) or run GitHub workflow mobile-ios-appstore."
  exit 1
fi

if [[ -z "${APPSTORE_ISSUER_ID:-}" || -z "${APPSTORE_API_KEY_ID:-}" ]]; then
  echo "ERROR: Set APPSTORE_ISSUER_ID and APPSTORE_API_KEY_ID"
  exit 1
fi

if [[ -n "${APPSTORE_API_KEY_PATH:-}" && -f "${APPSTORE_API_KEY_PATH}" ]]; then
  mkdir -p "$KEY_DIR"
  cp "${APPSTORE_API_KEY_PATH}" "$KEY_DIR/AuthKey_${APPSTORE_API_KEY_ID}.p8"
  chmod 600 "$KEY_DIR/AuthKey_${APPSTORE_API_KEY_ID}.p8"
elif [[ -n "${APPSTORE_API_PRIVATE_KEY:-}" ]]; then
  mkdir -p "$KEY_DIR"
  printf '%s\n' "$APPSTORE_API_PRIVATE_KEY" > "$KEY_DIR/AuthKey_${APPSTORE_API_KEY_ID}.p8"
  chmod 600 "$KEY_DIR/AuthKey_${APPSTORE_API_KEY_ID}.p8"
elif [[ ! -f "$KEY_DIR/AuthKey_${APPSTORE_API_KEY_ID}.p8" ]]; then
  echo "ERROR: Provide APPSTORE_API_PRIVATE_KEY or place AuthKey_${APPSTORE_API_KEY_ID}.p8 in $KEY_DIR"
  exit 1
fi

TRANSPORTER="${FASTLANE_ITUNES_TRANSPORTER_PATH:-/usr/local/itms}/bin/iTMSTransporter"
if [[ ! -x "$TRANSPORTER" ]]; then
  echo "Transporter not installed at $TRANSPORTER"
  echo "Install: https://help.apple.com/itc/transporteruserguide/"
  echo "Or use GitHub Actions workflow .github/workflows/mobile-ios-appstore.yml (App Store Connect API backend)."
  exit 1
fi

ARGS=(
  -m upload
  -assetFile "$IPA_PATH"
  -apiKey "$APPSTORE_API_KEY_ID"
  -apiIssuer "$APPSTORE_ISSUER_ID"
)

if [[ -n "${APPSTORE_INFO_PLIST:-}" && -f "${APPSTORE_INFO_PLIST}" ]]; then
  ARGS+=(-assetDescription "$APPSTORE_INFO_PLIST")
fi

echo "Uploading $IPA_PATH to App Store Connect..."
"$TRANSPORTER" "${ARGS[@]}"
echo "Done. Check App Store Connect → TestFlight (processing ~15–30 min)."
