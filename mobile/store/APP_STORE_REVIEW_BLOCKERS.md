# App Store — fix “required to start review” blockers

Two items block **Submit for Review**:

1. **You must choose a build**
2. **App Privacy** must be completed by an **Admin**

---

## Blocker 1 — Choose a build

You need a `.ipa` uploaded from **Xcode on a Mac**. Screenshots alone are not enough.

### A. Upload build (Mac + Xcode)

```bash
cd mobile
npm install
npx cap sync ios
cd ios/App && pod install
npx cap open ios
```

In Xcode:

1. Select target **App** → **Signing & Capabilities** → Team = **Cloudspace**
2. Set **Any iOS Device (arm64)** (not Simulator)
3. **Product → Archive**
4. When Organizer opens → **Distribute App**
5. **App Store Connect** → **Upload** → follow prompts
6. Wait **15–45 minutes** for Apple to process the build

### B. Select build in App Store Connect

1. https://appstoreconnect.apple.com → **My Apps** → **Stock News**
2. **App Store** tab (left) → open version **1.0.1**
3. Scroll to **Build** section
4. Click **+** or **Select a build before you submit your app**
5. Choose build **1.0.1 (2)** when it appears (status must not be “Processing”)
6. **Save**

If no build appears:

- Confirm Bundle ID matches `vn.orangecloud.stocknews`
- Check email for upload errors from Apple
- Xcode → Window → Organizer → verify upload succeeded
- Wait longer (first upload can take up to 1 hour)

---

## Blocker 2 — App Privacy (Admin only)

**Role required:** Account Holder or **Admin** in App Store Connect.  
Developers without Admin cannot publish App Privacy — ask your organization Admin to do this, or upgrade your role under **Users and Access**.

### Steps (click-by-click)

1. App Store Connect → **My Apps** → **Stock News**
2. Left sidebar → **App Privacy** (under **General** / **Trust & Safety**)
3. Click **Get Started** (or **Edit** if partially done)

#### Question 1
**“Do you or your third-party partners collect data from this app?”**  
→ **Yes**

#### Question 2 — Tracking
**“Do you or your third-party partners use data for tracking?”**  
→ **No**

#### Question 3 — Add data types

Click **+** and add these (only these):

---

### Data type 1: **Product Interaction** (under Usage Data)

| Field | Answer |
|-------|--------|
| Is this data collected? | Yes |
| Is this data linked to the user’s identity? | **No** |
| Is this data used for tracking? | **No** |
| Purposes | **Analytics** |

Why: anonymous page/view metrics on the website loaded in the app.

---

### Data type 2: **Other Data** (under Other Data)

| Field | Answer |
|-------|--------|
| Is this data collected? | Yes |
| Is this data linked to the user’s identity? | **No** |
| Is this data used for tracking? | **No** |
| Purposes | **App Functionality** |

Why: watchlist symbols stored with an anonymous browser/device ID (no login).

---

### Optional third type (only if you want to disclose Telegram)

If App Store asks or you prefer full disclosure when users opt into Telegram on `/notify`:

**Other Data** or **User ID** (if offered):

| Field | Answer |
|-------|--------|
| Linked to identity? | **Yes** (only when user connects Telegram themselves) |
| Used for tracking? | **No** |
| Purposes | **App Functionality** |

For **v1.0 minimum submission**, the two types above (Product Interaction + Other Data, both **not linked**) are usually enough.

---

### Do NOT declare

- Location, Contacts, Photos, Financial Info, Payment Info, Email, Phone
- Advertising Data, Browsing History sold to third parties
- Health, Fitness, Sensitive Info

---

### Privacy policy URL

```
https://stocknews.orangecloud.vn/privacy
```

Click **Publish** / **Save** on App Privacy when finished.

---

## After both are done

1. Version **1.0.1** has a **build selected**
2. **App Privacy** shows **Published**
3. Screenshots uploaded (iPhone 6.5" / 6.7", iPad if required)
4. **App Review Information** filled (email: support@orangecloud.vn)
5. Click **Add for Review** → **Submit to App Review**

### Export compliance (encryption)

Stock News **only uses HTTPS (TLS)** via iOS — no custom/proprietary encryption. **No documentation upload required.**

**Info.plist** (already set):

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

**In Xcode:** Target **App** → **Info** → add key **App Uses Non-Exempt Encryption** = **NO**  
(or rebuild after pulling latest — `INFOPLIST_KEY_ITSAppUsesNonExemptEncryption = NO` in project)

**App Store Connect** (when selecting build):

| Question | Answer |
|----------|--------|
| Does your app use encryption? | **Yes** |
| Is it exempt (HTTPS only, standard TLS)? | **Yes** |
| Upload documentation? | **No** — not required |

You must **re-archive and upload a new build** if the warning appeared on an older upload without this key.

---

## Quick checklist

- [ ] Build uploaded from Xcode (Archive → Upload)
- [ ] Build selected on version 1.0.1 page
- [ ] App Privacy completed by **Admin**
- [ ] Privacy Policy URL: https://stocknews.orangecloud.vn/privacy
- [ ] Screenshots in all required device slots
- [ ] Submit for Review

See also: **APP_STORE_CONNECT_WIZARD.md**, **APP_STORE_PRIVACY.md**
