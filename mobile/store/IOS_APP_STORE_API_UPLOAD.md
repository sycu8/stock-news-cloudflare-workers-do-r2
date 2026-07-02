# Upload iOS build via App Store Connect API

App ID: **`vn.orangecloud.stocknews`** · Version **1.0.1** · Build **3**

## Prerequisites (one-time)

1. **Apple Developer Program** enrolled (Cloudspace)
2. **App Store Connect API key** ([Integrations → API](https://appstoreconnect.apple.com/access/integrations/api))
   - Key ID: **`XJQWAM2B45`** (`.p8` already provided — do not commit to git)
   - Copy **Issuer ID** (UUID at top of the API Keys page)
3. **Team ID** — 10 characters from [Developer → Membership](https://developer.apple.com/account)
4. App created in App Store Connect (see `APP_STORE_CONNECT_WIZARD.md`)

GitHub Actions uses **automatic signing** via the API key (no `.p12` required).

## GitHub Actions (recommended)

Add to repo **Settings → Secrets and variables → Actions**:

| Type | Name | Value |
|------|------|--------|
| Secret | `APPSTORE_API_PRIVATE_KEY` | Full contents of `AuthKey_XJQWAM2B45.p8` |
| Variable | `APPSTORE_ISSUER_ID` | Issuer ID from API Keys page |
| Variable | `APPSTORE_API_KEY_ID` | `XJQWAM2B45` |
| Variable | `APPLE_TEAM_ID` | Team ID (10 chars) |

Repo admin must add these (the cloud agent cannot set GitHub secrets).

Run: **Actions → mobile-ios-appstore → Run workflow**

- Builds IPA on `macos-14`
- Uploads via **App Store Connect API** (`backend: AppStoreAPI`) from Linux runner
- Sets `uses-non-exempt-encryption: false` (matches `ITSAppUsesNonExemptEncryption`)

## Manual upload (existing IPA)

After Xcode **Archive → Export App Store IPA**:

```bash
export APPSTORE_ISSUER_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export APPSTORE_API_KEY_ID="XXXXXXXXXX"
export APPSTORE_API_PRIVATE_KEY="$(cat AuthKey_XXXXXXXXXX.p8)"
export IPA_PATH="path/to/App.ipa"
export APPSTORE_INFO_PLIST="path/to/AppStoreInfo.plist"  # optional on Mac

bash mobile/scripts/upload-ios-appstore.sh
```

On Linux, install [Transporter](https://help.apple.com/itc/transporteruserguide/) and include `AppStoreInfo.plist` from the Xcode export folder.

## After upload

1. App Store Connect → **TestFlight** — wait ~15–30 min for processing
2. **App Store** tab → select build **3** for version **1.0.1**
3. Screenshots: `mobile/dist/stocknews-app-store-upload-kit/`
4. Copy/metadata: `mobile/store/app-store-connect-vi.txt`
5. **Add for Review**

## Cannot upload from this Linux agent without

- Signed `.ipa` file (requires Mac + distribution cert)
- App Store Connect API `.p8` key (not the CSR private key in `apple-signing/`)

The CSR key is for **code signing certificate** creation, not for App Store Connect API upload.
