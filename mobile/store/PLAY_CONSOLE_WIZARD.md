# Google Play Console — click-by-click (Internal testing)

Use this while uploading **`mobile/dist/app-release.aab`**.

Copy text from **`play-listing-vi.txt`** when a field asks for description.

---

## Phase 1 — Create app (once)

1. https://play.google.com/console
2. **Create app**
3. App name: `Stock News`
4. Default language: **Vietnamese** (or English – United States)
5. App or game: **App** · Free
6. Declarations: confirm policy compliance → **Create app**

---

## Phase 2 — Dashboard tasks (left sidebar “Set up your app”)

Complete each item before Internal testing goes live.

### Privacy policy
- **App content → Privacy policy**
- URL: `https://stocknews.orangecloud.vn/privacy`

### App access
- **App content → App access**
- Select: **All functionality is available without special access**

### Ads
- **App content → Ads**
- **No, my app does not contain ads**

### Content rating
- **App content → Content rating** → Start questionnaire
- Category: **News** (or Reference)
- Violence, sexuality, etc.: **No** for all
- User-generated content: **No** (news is curated from sources)
- Submit → apply rating

### Target audience
- **App content → Target audience**
- Age: **18 and over** (finance/news)
- Not designed for children

### News apps (if shown)
- Declare as news aggregator / financial news reference
- Not investment advice (matches terms page)

### Data safety
- **App content → Data safety** → Start
- **Does your app collect or share data?** → **Yes**
- Collect:
  - **App activity** (optional, anonymous analytics) → Purpose: Analytics
  - **Device or other IDs** (watchlist cookie) → Purpose: App functionality, Optional
- **Is data encrypted in transit?** → Yes
- **Can users request deletion?** → Yes → support@orangecloud.vn
- **Do you provide a way to request deletion in-app?** → No (email support)
- Privacy policy URL: same as above
- Save

### Store listing (minimum for testing)
- **Grow → Store presence → Main store listing**
- App name: `Stock News — Tin CK VN`
- Short description: from `play-listing-vi.txt`
- Full description: from `play-listing-vi.txt`
- App icon: use `mobile/resources/icon.png` (512×512)
- Feature graphic: optional for internal test; required for production (1024×500)
- Phone screenshots: upload at least **2** from `mobile/dist/screenshots/` (or capture on phone)
- Category: **News & Magazines**
- Email: `support@orangecloud.vn`
- Save

---

## Phase 3 — Upload AAB

1. **Release → Testing → Internal testing**
2. **Create new release**
3. **Upload** → select `app-release.aab`
4. Release name: `1.0.0 (1)`
5. Release notes (Vietnamese):
   ```
   Phiên bản đầu tiên: tin chứng khoán VN, watchlist, Investor Desk.
   Nội dung tham khảo, không phải khuyến nghị đầu tư.
   ```
6. **Save** → **Review release** → **Start rollout to Internal testing**

When prompted: enroll in **Play App Signing** (recommended).

---

## Phase 4 — Install on your phone

1. **Release → Testing → Internal testing → Testers**
2. **Create email list** → add your Gmail
3. Save → copy **opt-in URL**
4. Open URL on Android phone → Accept → Install from Play Store

---

## Phase 5 — Deep links (after install)

1. **Grow → Deep links**
2. Add domain: `stocknews.orangecloud.vn`
3. Verify — assetlinks already live:
   https://stocknews.orangecloud.vn/.well-known/assetlinks.json

---

## Common blockers

| Message | Fix |
|---------|-----|
| “You need to complete app content” | Finish Phase 2 checklist |
| “Add store listing” | At least 2 screenshots + short description |
| “Upload a valid app bundle” | Use `app-release.aab` from `mobile/dist/` |
| “Package name already exists” | Another account owns `vn.orangecloud.stocknews` — use that account or change applicationId |

---

## After internal test passes

1. **Production** → same AAB + full store assets
2. Start Apple Cloudspace enrollment (`APPLE_ENROLLMENT_CLOUDSPACE.md`)
3. `wrangler secret put APPLE_TEAM_ID` when Team ID arrives
