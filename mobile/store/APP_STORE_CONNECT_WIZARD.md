# App Store Connect — step-by-step (iOS)

Requires **Mac + Xcode 15+** and **Apple Developer Program** ($99/year).

App ID: **`vn.orangecloud.stocknews`**  
Display name: **Stock News**  
Website: **https://stocknews.orangecloud.vn**

Copy text from **`app-store-connect-vi.txt`**.

---

## Phase 0 — Apple Developer (Cloudspace)

If not enrolled yet → **`APPLE_ENROLLMENT_CLOUDSPACE.md`**

1. https://developer.apple.com/programs/enroll/
2. Organization: **Cloudspace**
3. After approval → note **Team ID** (10 chars)
4. Connect Universal Links:
   ```bash
   npx wrangler secret put APPLE_TEAM_ID
   npx wrangler deploy
   ```

---

## Phase 1 — Register Bundle ID

1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles**
2. **Identifiers** → **+** → **App IDs** → **App**
3. Description: `Stock News`
4. Bundle ID: **Explicit** → `vn.orangecloud.stocknews`
5. Capabilities (enable):
   - **Associated Domains** (for Universal Links)
6. **Register**

---

## Phase 2 — Create app in App Store Connect

1. https://appstoreconnect.apple.com → **My Apps** → **+** → **New App**
2. Fill in:

| Field | Value |
|-------|--------|
| Platforms | iOS |
| Name | Stock News |
| Primary language | Vietnamese (or English) |
| Bundle ID | vn.orangecloud.stocknews |
| SKU | stocknews-vn-ios-001 |
| User Access | Full Access |

3. **Create**

---

## Phase 3 — App Information (left sidebar)

| Field | Value |
|-------|--------|
| **Privacy Policy URL** | https://stocknews.orangecloud.vn/privacy |
| **Category — Primary** | News |
| **Category — Secondary** | Finance |
| **Content Rights** | Does not contain third-party content requiring rights (news links to sources) — or declare aggregation if asked |
| **Age Rating** | Edit → answer questionnaire → typically **4+** |

### Age rating questionnaire (typical answers)

- Cartoon/fantasy violence: None
- Realistic violence: None
- Sexual content: None
- Profanity: None
- Drugs: None
- Gambling: None
- Unrestricted web access: **Yes** (WebView loads news site with external links)
- Made for Kids: **No**

---

## Phase 4 — Pricing and Availability

- **Price:** Free
- **Availability:** All countries (or Vietnam + key markets)

---

## Phase 5 — App Privacy (Privacy Nutrition Labels)

**App Privacy** → **Get Started**

| Question | Answer |
|----------|--------|
| Do you collect data? | **Yes** |
| Do you or partners use data for tracking? | **No** |

### Data types to declare

**Product Interaction** (optional)
- Used for analytics (anonymous RUM)
- Not linked to user identity
- Not used for tracking

**Other Data** (optional)
- Watchlist symbols stored with anonymous ID
- App functionality
- Not linked unless user connects Telegram separately

**Do NOT declare:** Location, contacts, photos, financial account info, email (unless collected in-app — we don't).

Privacy policy URL: `https://stocknews.orangecloud.vn/privacy`

Full answers: **`APP_STORE_PRIVACY.md`**

---

## Phase 6 — Prepare version 1.0.1 on Mac

```bash
cd mobile
npm install
npx cap sync ios
cd ios/App && pod install
npx cap open ios
```

### Xcode checklist

1. **Signing & Capabilities** → Team = Cloudspace
2. **Bundle Identifier:** `vn.orangecloud.stocknews`
3. **Associated Domains:** `applinks:stocknews.orangecloud.vn`
4. **Version:** 1.0.1 (Marketing) · **Build:** 2
5. Destination: **Any iOS Device (arm64)**
6. **Product → Archive**
7. **Distribute App → App Store Connect → Upload**

---

## Phase 7 — Version page (App Store tab)

Select **1.0.1** build after processing (~15–30 min).

| Field | Value |
|-------|--------|
| **Screenshots** | iPhone 6.7" (1290×2796) + iPad 12.9" (2048×2732) min 3 each — see **`APP_STORE_SCREENSHOTS.md`** |
| **Promotional Text** | from `app-store-connect-vi.txt` |
| **Description** | from `app-store-connect-vi.txt` |
| **Keywords** | chứng khoán,vietnam,stock,news,VN-Index,watchlist |
| **Support URL** | https://stocknews.orangecloud.vn/privacy |
| **Marketing URL** | https://stocknews.orangecloud.vn |
| **What's New** | from `app-store-connect-vi.txt` |

### Investment / finance disclaimer

Include in description (already in copy file):

> Nội dung chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.

---

## Phase 8 — App Review Information

| Field | Value |
|-------|--------|
| **Sign-in required?** | No |
| **Contact email** | support@orangecloud.vn |
| **Phone** | Your phone |
| **Notes** | See below |

### Notes for Apple reviewer (paste)

```
Stock News is a Capacitor native shell loading https://stocknews.orangecloud.vn (Vietnam stock market news aggregator).

- No login or test account required — all content is public.
- Open app → homepage shows today's news feed.
- Navigate to /desk (Investor Desk) and /portfolio (watchlist) via in-app links.
- Optional Telegram notifications: user must opt in on /notify page (not required for review).
- Investment disclaimer in Terms (https://stocknews.orangecloud.vn/terms) and on stock detail pages.
- App does not execute trades or hold financial accounts.
```

---

## Phase 9 — Export compliance

After upload, when asked:

| Question | Answer |
|----------|--------|
| Uses encryption? | **Yes** |
| Exempt from export documentation? | **Yes** — only standard HTTPS (TLS) |
| `ITSAppUsesNonExemptEncryption` | **false** (already in Info.plist) |

---

## Phase 10 — Submit

1. **Add for Review**
2. Wait 1–3 days (typical)
3. If rejected → read Resolution Center → fix → resubmit

---

## Screenshot sizes (required)

| Device | Size | Min count |
|--------|------|-----------|
| iPhone 6.7" | 1290 × 2796 | 3 |
| iPhone 6.5" | 1284 × 2778 | 3 (if no 6.7") |
| iPad 12.9" | 2048 × 2732 | optional unless iPad supported |

Capture in **Safari on iPhone** or **Xcode Simulator** → save PNG.

Suggested screens: Homepage, `/desk`, `/portfolio`.

Full sizes, script, and upload steps: **`APP_STORE_SCREENSHOTS.md`**

---

## Common rejections & fixes

| Reason | Fix |
|--------|-----|
| Minimum functionality | Emphasize native shell + desk + watchlist in Review Notes |
| Missing privacy policy | URL must return 200 |
| WebView-only | OK if features are clear; add Review Notes |
| Finance without disclaimer | Keep disclaimer in description + Terms |
| Associated Domains fail | Set APPLE_TEAM_ID secret + deploy AASA |

---

## Checklist before Submit

- [ ] Apple Developer enrolled (Cloudspace)
- [ ] Bundle ID registered with Associated Domains
- [ ] Team ID in Worker AASA (`APPLE_TEAM_ID` secret)
- [ ] Archive uploaded to App Store Connect
- [ ] Privacy URL works
- [ ] Screenshots uploaded
- [ ] App Privacy questionnaire complete
- [ ] Review notes filled
