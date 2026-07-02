# Store submission checklist

Use this before uploading to **App Store Connect** and **Google Play Console**.

## Legal & policy URLs (required)

| URL | Purpose |
|-----|---------|
| https://stocknews.orangecloud.vn/privacy | Privacy policy |
| https://stocknews.orangecloud.vn/terms | Terms of use (includes investment disclaimer) |

Deploy the Worker so these URLs return 200 before store review.

## App category

- **Apple:** News or Finance → News (recommended: **News** with finance disclaimer in description)
- **Google Play:** News & Magazines (or Finance → subcategory News)

## Investment disclaimer (required for finance/news)

Include in **both** store descriptions:

> Nội dung chỉ mang tính tham khảo, không phải khuyến nghị mua/bán/giữ chứng khoán. Dữ liệu thị trường có thể trễ hoặc sai lệch.

English:

> Content is for informational purposes only, not investment advice. Market data may be delayed or inaccurate.

## Permissions declared

| Platform | Permissions |
|----------|-------------|
| Android | `INTERNET` only |
| iOS | None beyond network (no camera, location, contacts, tracking) |

Do **not** add push notification permissions until FCM/APNs is implemented and disclosed in privacy policy.

## Deep links (optional but recommended)

1. **Android:** Update `/.well-known/assetlinks.json` with release keystore SHA-256.
2. **iOS:** Set Apple Team ID in `/.well-known/apple-app-site-association` and enable Associated Domains in Xcode.

## Screenshots (minimum)

Capture on phone (1080×1920 or device-native):

1. Homepage with news feed
2. Investor desk `/desk`
3. Portfolio / watchlist `/portfolio`
4. Stock detail `/stocks/VNM`
5. Notification settings `/notify`

## Versioning

- Android: `versionCode` / `versionName` in `android/app/build.gradle`
- iOS: `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in Xcode

## Pre-submission tests

- [ ] Cold launch loads https://stocknews.orangecloud.vn
- [ ] Dark/light theme works
- [ ] External article links open (in-app browser or system browser)
- [ ] `/privacy` and `/terms` reachable from footer
- [ ] No crashes on airplane mode → shows offline/error gracefully
- [ ] Release build signed with production certificates

## Store listing files

- `PLAY_STORE_LISTING.md` — Google Play title, description, tags
- `APP_STORE_LISTING.md` — Apple metadata
- `DATA_SAFETY.md` — Google Play Data safety form answers
- `APP_STORE_PRIVACY.md` — Apple App Privacy questionnaire
- `ANDROID_SIGNING.md` — Keystore setup
