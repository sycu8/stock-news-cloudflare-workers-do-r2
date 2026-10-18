# Export compliance — App Encryption (Stock News)

**You do NOT need to upload encryption documentation** for this app.

Stock News only loads `https://stocknews.orangecloud.vn` over **HTTPS (TLS)** using iOS system APIs. That is **exempt** encryption.

---

## 1. Xcode — already configured

`Info.plist`:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

Meaning: **App Uses Non-Exempt Encryption = NO**

Also set in Xcode build settings: `INFOPLIST_KEY_ITSAppUsesNonExemptEncryption = NO`

### Verify on Mac

1. `cd mobile && npx cap open ios`
2. Target **App** → **Info**
3. Confirm **App Uses Non-Exempt Encryption** = **NO**

If missing, click **+** → add it → set to **NO**.

---

## 2. Upload a NEW build (required)

Apple reads this key **from the IPA at upload time**. Old builds without it will keep showing the warning.

1. Xcode → **General** → **Build** = **3** (already bumped in repo)
2. **Product → Archive → Distribute → App Store Connect → Upload**
3. Wait until build **1.0.1 (3)** finishes processing
4. App Store Connect → version **1.0.1** → select build **(3)**

---

## 3. App Store Connect — answer export compliance

When prompted (after selecting build or under **TestFlight → Build → Export Compliance**):

| Question | Answer |
|----------|--------|
| Is your app designed to use cryptography / contain encryption? | **Yes** |
| Does your app qualify for an exemption? | **Yes** |
| Algorithm type | **Standard encryption algorithms** (HTTPS/TLS only) |
| Proprietary or non-standard encryption? | **No** |
| Encryption besides what Apple OS provides? | **No** (only HTTPS via URLSession/WebView) |
| Upload App Encryption Documentation? | **Skip / Not required** |

If you see **“Provide documentation”** — you likely answered **No** to exemption by mistake. Go back and choose **exempt** (HTTPS-only app).

---

## 4. Why Apple shows the documentation page

Apple requires docs **only if**:

- Proprietary / non-standard encryption (IEEE, IETF, ITU) — **Stock News: No**
- Custom crypto **instead of or in addition to** Apple’s OS encryption — **Stock News: No**

Stock News uses **only** TLS through the WebView — **no documentation needed**.

---

## 5. If the warning still appears

1. Delete old build selection → pick build **(3)** only  
2. **TestFlight** tab → select build → **Manage Export Compliance** → set exempt  
3. Ensure latest code on Mac (`git pull`) before Archive  
4. Do **not** upload random PDFs — fix answers + new build instead  

Upload this document to App Store Connect:

1. Download PDF: https://stocknews.orangecloud.vn/assets/releases/stocknews-export-compliance.pdf
2. Sign (name, date, organization: Cloudspace)
3. App Store Connect → My Apps → Stock News → **App Information**
4. **App Encryption Documentation** → Upload signed PDF
5. Re-archive in Xcode with ITSAppUsesNonExemptEncryption = NO → upload build (3+)

See mobile/store/EXPORT_COMPLIANCE.md
