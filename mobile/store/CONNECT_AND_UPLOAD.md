# Connect & upload — step-by-step

Follow this order. You need **two developer accounts** (one-time setup):

| Store | Cost | Sign up |
|-------|------|---------|
| **Google Play** | $25 one-time | https://play.google.com/console/signup |
| **Apple Developer** | $99/year | https://developer.apple.com/programs/enroll/ |

App ID everywhere: **`vn.orangecloud.stocknews`**

Legal URLs (already live):

- https://stocknews.orangecloud.vn/privacy
- https://stocknews.orangecloud.vn/terms

---

## Part A — Google Play (Android)

### A1. Create the app in Play Console

1. Open https://play.google.com/console
2. **Create app** → name: **Stock News**, default language: Vietnamese or English
3. App or game: **App** → Free → declare policies (news app, no ads, no UGC)

### A2. Create signing key (on your Mac/PC)

```bash
cd mobile
keytool -genkeypair -v \
  -keystore stocknews-release.keystore \
  -alias stocknews \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Orange Cloud, OU=Mobile, O=Orange Cloud, L=Ho Chi Minh, ST=HCM, C=VN"
```

Save passwords in a password manager. **Back up the `.keystore` file** — losing it blocks updates.

### A3. Connect Gradle to the keystore

```bash
cp mobile/store/keystore.properties.example mobile/android/keystore.properties
# Edit keystore.properties with your passwords
```

### A4. Build the upload file (AAB)

Requires **Android Studio** or JDK 17 + Android SDK:

```bash
cd mobile
npm install
npx cap sync
cd android
./gradlew bundleRelease
```

Output:

`mobile/android/app/build/outputs/bundle/release/app-release.aab`

### A5. Upload to Play Console

1. **Release** → **Production** (or **Internal testing** first)
2. **Create new release** → upload `app-release.aab`
3. Enroll in **Play App Signing** when prompted (recommended)
4. Fill **Store listing** — copy from `PLAY_STORE_LISTING.md`
5. **App content**:
   - Privacy policy URL: `https://stocknews.orangecloud.vn/privacy`
   - Data safety: answers in `DATA_SAFETY.md`
   - Content rating questionnaire (everyone / news)
6. Add screenshots (phone, min 2)
7. **Review and roll out**

### A6. Connect App Links (after first upload)

```bash
keytool -list -v -keystore stocknews-release.keystore -alias stocknews | grep SHA256
```

Copy the SHA-256 (with colons). Edit `src/ui/mobile-deep-links.ts` → replace `REPLACE_WITH_RELEASE_SHA256_FINGERPRINT` → deploy Worker:

```bash
npx wrangler deploy
```

Verify: https://stocknews.orangecloud.vn/.well-known/assetlinks.json

In Play Console → **Deep links** → verify domain `stocknews.orangecloud.vn`.

---

## Part B — App Store (iOS)

Requires **Mac + Xcode 15+**.

### B1. Enroll in Apple Developer Program

1. https://developer.apple.com/account
2. Complete enrollment ($99/year)
3. Note your **Team ID** (10 characters, e.g. `AB12CD34EF`) under Membership

### B2. Create the app in App Store Connect

1. https://appstoreconnect.apple.com
2. **My Apps** → **+** → **New App**
3. Platform: iOS, Name: **Stock News**, Bundle ID: **vn.orangecloud.stocknews**
   - If Bundle ID missing: Developer portal → **Identifiers** → **+** → App IDs → register `vn.orangecloud.stocknews`
4. SKU: e.g. `stocknews-vn-001`

### B3. Open project in Xcode

```bash
cd mobile
npm install
npx cap sync
npx cap open ios
```

First time on Mac:

```bash
cd mobile/ios/App && pod install
```

### B4. Connect signing in Xcode

1. Select project **App** → target **App** → **Signing & Capabilities**
2. **Team**: your Apple Developer team
3. **Bundle Identifier**: `vn.orangecloud.stocknews`
4. **Automatically manage signing**: ON
5. Click **+ Capability** → **Associated Domains** → add:
   ```
   applinks:stocknews.orangecloud.vn
   ```
6. Ensure **App.entitlements** is linked (file exists at `ios/App/App/App.entitlements`)

### B5. Connect Universal Links on the server

Edit `src/ui/mobile-deep-links.ts`:

- Replace both `TEAMID` with your real Team ID (e.g. `AB12CD34EF.vn.orangecloud.stocknews`)

Deploy:

```bash
npx wrangler deploy
```

Verify (must return JSON, no redirect):

https://stocknews.orangecloud.vn/.well-known/apple-app-site-association

### B6. Archive and upload

1. Xcode → device target: **Any iOS Device (arm64)**
2. **Product** → **Archive**
3. **Distribute App** → **App Store Connect** → Upload
4. In App Store Connect → your app → **TestFlight** (optional internal test)
5. **App Store** tab → fill metadata from `APP_STORE_LISTING.md`
6. **App Privacy** → answers in `APP_STORE_PRIVACY.md`
7. Privacy Policy URL: `https://stocknews.orangecloud.vn/privacy`
8. Export compliance: **No** custom encryption (already in Info.plist)
9. Submit for review

---

## Part C — What “connect” means (summary)

| Connection | Where | What you link |
|------------|--------|-------------|
| **App ↔ website** | `mobile/capacitor.config.ts` | `server.url` → `https://stocknews.orangecloud.vn` |
| **Play ↔ signing** | `android/keystore.properties` | Release keystore |
| **Play ↔ domain** | Worker `assetlinks.json` | SHA-256 of release cert |
| **Apple ↔ signing** | Xcode Signing & Capabilities | Developer Team |
| **Apple ↔ domain** | Worker AASA + Associated Domains | Team ID |
| **Stores ↔ legal** | Play / App Store Connect forms | `/privacy` and `/terms` URLs |

---

## Part D — Recommended first upload path

1. **Play Internal testing** — upload AAB, add your Gmail as tester (fastest feedback)
2. **TestFlight** — upload iOS build, invite yourself
3. Fix any issues → **Production** / **App Store review**

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `./gradlew` fails: SDK not found | Install Android Studio, set `ANDROID_HOME` |
| Xcode: No signing certificate | Xcode → Settings → Accounts → Download Manual Profiles |
| App shows blank screen | Confirm https://stocknews.orangecloud.vn loads in Safari/Chrome |
| Apple rejects “minimum functionality” | Mention native shell + desk/watchlist in Review Notes (`APP_STORE_LISTING.md`) |
| Gradle release unsigned | Create `android/keystore.properties` (see A3) |

Support email in listings: **support@orangecloud.vn** (change if needed).
