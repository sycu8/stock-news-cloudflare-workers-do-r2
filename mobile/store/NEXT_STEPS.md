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
| `mobile/dist/app-release.aab` | **Upload to Google Play Console** |
| `mobile/dist/stocknews-android-signing.zip` | Keystore + passwords (keep safe; future updates) |

Regenerate locally:

```bash
cd mobile
chmod +x scripts/*.sh
./scripts/package-signing-bundle.sh   # signing zip
./scripts/build-release-aab.sh        # rebuild AAB (needs Android Studio SDK)
```

### 2. Google Play — internal test (today)

1. https://play.google.com/console → Create app **Stock News**
2. Download **`mobile/dist/app-release.aab`** from this workspace
3. Play Console → **Release → Internal testing** → upload AAB
4. Add your Gmail as tester → install on phone
5. Store listing: `PLAY_STORE_LISTING.md` · Data safety: `DATA_SAFETY.md`
6. Privacy policy URL: `https://stocknews.orangecloud.vn/privacy`

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
