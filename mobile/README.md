# Stock News — Mobile Apps (iOS & Android)

Native shells for **[Stock News by Orange Cloud](https://stocknews.orangecloud.vn)** — Vietnam stock market news, watchlists, and investor desk.

Built with **Capacitor 6** loading the production web app over HTTPS (always up to date, no duplicate business logic).

| Field | Value |
|-------|--------|
| App ID | `vn.orangecloud.stocknews` |
| Display name | Stock News |
| Production URL | https://stocknews.orangecloud.vn |
| Privacy policy | https://stocknews.orangecloud.vn/privacy |
| Terms of use | https://stocknews.orangecloud.vn/terms |

## Prerequisites

- Node.js 20+
- **Android:** Android Studio, JDK 17, Android SDK 34
- **iOS:** macOS, Xcode 15+, Apple Developer account ($99/yr)
- **Signing:** release keystore (Android) + distribution certificate (iOS)

## Quick start

```bash
cd mobile
npm install
npx cap sync
```

### Upload to Google Play (ready now)

See **`dist/stocknews-play-upload-kit.zip`** and **`PLAY_CONSOLE_WIZARD.md`**.

### Upload to App Store (Mac required)

See **`store/APP_STORE_CONNECT_WIZARD.md`** and copy fields from **`store/app-store-connect-vi.txt`**.

### Android (release AAB for Play Store)

```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

Before first release:

1. Create a release keystore and configure `android/keystore.properties` (see `store/ANDROID_SIGNING.md`).
2. Replace `REPLACE_WITH_RELEASE_SHA256_FINGERPRINT` in the Worker's `/.well-known/assetlinks.json` with your release cert SHA-256.
3. Upload the AAB to [Google Play Console](https://play.google.com/console).

### iOS (archive for App Store)

```bash
npx cap open ios
```

In Xcode:

1. Set **Team** and **Signing & Capabilities**.
2. Replace `TEAMID` in Worker `/.well-known/apple-app-site-association` with your Apple Team ID.
3. Enable **Associated Domains**: `applinks:stocknews.orangecloud.vn`
4. Product → Archive → Distribute to App Store Connect.

## Store compliance checklist

See **`store/SUBMISSION_CHECKLIST.md`** for full App Store / Play Store metadata, data safety answers, and finance-category disclaimers.

### Already included in this repo

- Privacy policy & terms on the website (`/privacy`, `/terms`)
- Web app manifest (`/manifest.webmanifest`)
- Android App Links + iOS Universal Links metadata on the server
- HTTPS-only, no cleartext traffic
- Minimal permissions (INTERNET only)
- Investment disclaimer in terms + store copy templates
- `ITSAppUsesNonExemptEncryption = false` (standard TLS only)

### You must configure before submission

| Item | Where |
|------|--------|
| Release signing (Android) | `store/ANDROID_SIGNING.md` |
| Apple Team ID in AASA | Worker `src/ui/mobile-deep-links.ts` → deploy |
| Play Data safety form | `store/DATA_SAFETY.md` |
| App Store privacy nutrition | `store/APP_STORE_PRIVACY.md` |
| Screenshots (phone + tablet) | Capture from `/`, `/desk`, `/portfolio` |
| Support email | `support@orangecloud.vn` (update if different) |

## Project structure

```
mobile/
  capacitor.config.ts   # Remote server URL + splash/status bar
  www/                  # Offline fallback shell
  android/              # Gradle project → Play Store
  ios/                  # Xcode project → App Store
  resources/            # Source icon/splash for @capacitor/assets
  store/                # Submission guides & listing copy
```

## Sync after Worker deploy

Legal URLs and deep-link files are served by the Worker. Deploy the main app first:

```bash
cd .. && npx wrangler deploy
```

Then rebuild native apps if you change `capacitor.config.ts` or native plugins:

```bash
cd mobile && npx cap sync
```
