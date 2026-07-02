# Next steps — current status (Cloudspace)

Last updated after keystore + App Links setup.

## Completed

- [x] Android release keystore (`mobile/stocknews-release.keystore`)
- [x] Gradle signing config (`android/keystore.properties`)
- [x] App Links SHA-256 deployed → https://stocknews.orangecloud.vn/.well-known/assetlinks.json
- [x] Privacy + terms live
- [x] Capacitor iOS + Android projects with icons/splash

## You do now

### 1. Download release files (Android)

Built in this workspace:

| File | Purpose |
|------|---------|
| `mobile/dist/stocknews-play-upload-kit.zip` | **All-in-one:** AAB + listing text + wizard + screenshots |
| `mobile/dist/app-release.aab` | Upload to Google Play Console |
| `mobile/dist/stocknews-android-signing.zip` | Keystore + passwords (keep safe; future updates) |
| `mobile/dist/screenshots/home.png` | Store screenshot 1 |
| `mobile/dist/screenshots/desk.png` | Store screenshot 2 |

**Play Console walkthrough:** `mobile/store/PLAY_CONSOLE_WIZARD.md` (click-by-click)

Regenerate locally:

```bash
cd mobile
chmod +x scripts/*.sh
./scripts/package-signing-bundle.sh   # signing zip
./scripts/build-release-aab.sh        # rebuild AAB (needs Android Studio SDK)
```

### 2. Google Play — internal test (today)

Follow **`PLAY_CONSOLE_WIZARD.md`** (step-by-step).

1. Download **`mobile/dist/stocknews-play-upload-kit.zip`** (or just `app-release.aab`)
2. https://play.google.com/console → Create app **Stock News**
3. Complete **App content** checklist (privacy, ads, rating, data safety)
4. **Release → Internal testing** → upload AAB
5. Add tester Gmail → install on phone

### 3. Apple — Cloudspace enrollment (parallel)

No Team ID yet — required for iOS signing:

1. https://developer.apple.com/programs/enroll/ → Organization **Cloudspace**
2. When approved, note **Team ID** (10 chars)
3. Connect:
   ```bash
   npx wrangler secret put APPLE_TEAM_ID
   npx wrangler deploy
   ```
4. Mac: `cd mobile && npx cap open ios` → Archive → TestFlight

See `APPLE_ENROLLMENT_CLOUDSPACE.md`.

## Blockers

| Blocker | Platform | Action |
|---------|----------|--------|
| No Apple Team ID | iOS | Enroll Cloudspace in Apple Developer Program |
| Keystore not on your PC | Android | Download signing zip from step 1 |
| No Mac | iOS | Borrow Mac or use Mac cloud CI for Archive |

## After first Play upload

Play Console → **Deep links** → verify `stocknews.orangecloud.vn` (assetlinks already configured).

## Credentials reference

See gitignored `store/CREDENTIALS.local.md` (passwords not in GitHub).
