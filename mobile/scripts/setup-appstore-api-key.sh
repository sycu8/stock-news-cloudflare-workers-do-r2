#!/usr/bin/env bash
# Install AuthKey .p8 for local Transporter / upload-ios-appstore.sh
set -euo pipefail

KEY_ID="${APPSTORE_API_KEY_ID:-XJQWAM2B45}"
SRC="${1:-${APPSTORE_API_KEY_PATH:-}}"
KEY_DIR="${HOME}/.appstoreconnect/private_keys"
DEST="$KEY_DIR/AuthKey_${KEY_ID}.p8"

if [[ -z "$SRC" ]]; then
  for candidate in \
    "$HOME/.cursor/projects/workspace/uploads/AuthKey_${KEY_ID}"*.p8 \
    "./AuthKey_${KEY_ID}.p8"; do
    if [[ -f "$candidate" ]]; then
      SRC="$candidate"
      break
    fi
  done
fi

if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "Usage: $0 [path/to/AuthKey_${KEY_ID}.p8]"
  exit 1
fi

mkdir -p "$KEY_DIR"
cp "$SRC" "$DEST"
chmod 600 "$DEST"
echo "Installed API key → $DEST"
echo "Next: export APPSTORE_ISSUER_ID and run mobile/scripts/upload-ios-appstore.sh"
