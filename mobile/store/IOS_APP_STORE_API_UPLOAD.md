# Upload iOS build via App Store Connect API

App ID: **`vn.orangecloud.stocknews`** · Version **1.0.1** · Build **3**

## Prerequisites (one-time)

1. **Apple Developer Program** enrolled (Cloudspace)
2. **App Store Connect API key** ([Integrations → API](https://appstoreconnect.apple.com/access/integrations/api))
   - Role: **App Manager** or **Admin**
   - Download `AuthKey_XXXXXX.p8` (only once)
   - Note **Issuer ID** and **Key ID**
3. **Apple Distribution certificate** (.p12) for `vn.orangecloud.stocknews`
   - CSR: `mobile/dist/apple-signing/stocknews-ios.certSigningRequest`
   - Create cert in [Developer portal](https://developer.apple.com/account/resources/certificates/list)
4. App created in App Store Connect (see `APP_STORE_CONNECT_WIZARD.md`)

## GitHub Actions (recommended)

Add to repo **Settings → Secrets and variables → Actions**:

| Type | Name | Value |
|------|------|--------|
| Secret | `APPSTORE_API_PRIVATE_KEY` | Full contents of `.p8` file |
| Secret | `IOS_DISTRIBUTION_CERT_BASE64` | `base64 -i Certificates.p12` |
| Secret | `IOS_DISTRIBUTION_CERT_PASSWORD` | P12 export password |
| Variable | `APPSTORE_ISSUER_ID` | From API Keys page |
| Variable | `APPSTORE_API_KEY_ID` | Key ID (10 chars) |
| Variable | `APPLE_TEAM_ID` | Team ID (10 chars) |

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
