# Apple Certificate Signing Request (CSR)

Apple asks for a **Certificate Signing Request** when you create an **Apple Distribution** or **Apple Development** certificate.

You upload the `.certSigningRequest` file. Apple returns a `.cer` certificate. The **private key** stays on your machine and must match the CSR.

---

## Option A — Generate CSR here (Linux / any OS)

Already generated in **`mobile/dist/apple-signing/`** (not in git):

| File | Action |
|------|--------|
| `stocknews-ios.certSigningRequest` | **Upload to Apple** |
| `stocknews-ios-private.key` | **Keep secret** — needed with the certificate on Mac |
| `README.txt` | Quick reference |

Regenerate:

```bash
cd mobile
./scripts/create-apple-csr.sh
```

Optional environment overrides:

```bash
APPLE_CSR_ORG=Cloudspace \
APPLE_CSR_CN="Cloudspace" \
APPLE_CSR_EMAIL=support@orangecloud.vn \
APPLE_CSR_COUNTRY=VN \
./scripts/create-apple-csr.sh
```

---

## Option B — Generate CSR on Mac (Keychain Access)

1. Open **Keychain Access** (Spotlight → "Keychain Access")
2. Menu **Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority…**
3. Fill in:
   - **User Email Address:** `support@orangecloud.vn`
   - **Common Name:** `Cloudspace`
   - **CA Email Address:** leave empty
   - **Request is:** **Saved to disk**
   - Check **Let me specify key pair information** → Continue
   - Key Size: **2048 bits** · Algorithm: **RSA**
4. Save as e.g. `Cloudspace.certSigningRequest`
5. Upload that file to Apple (same steps below)

The private key is stored automatically in your Mac **login** keychain.

---

## Upload CSR to Apple Developer

1. Sign in: https://developer.apple.com/account
2. **Certificates, Identifiers & Profiles** → **Certificates** → **+**
3. Choose certificate type:

| Goal | Certificate type |
|------|------------------|
| Submit to App Store | **Apple Distribution** |
| Test on device / TestFlight prep | **Apple Development** |

4. **Continue** → upload `stocknews-ios.certSigningRequest`
5. **Download** the issued `.cer` file (e.g. `distribution.cer`)

Repeat if you need **both** Development and Distribution certificates (two CSRs, or two uploads — Apple allows reusing the same CSR for one cert type at a time; safest: one CSR per certificate request).

---

## After Apple issues the certificate

### Easiest path — Xcode automatic signing (recommended)

1. On Mac: Xcode → **Settings → Accounts** → add Apple ID for **Cloudspace** team
2. `cd mobile && npx cap open ios`
3. Target **App** → **Signing & Capabilities**
4. **Team:** Cloudspace
5. **Automatically manage signing:** ON

Xcode can create certificates and profiles for you. You may **not** need to manually import the `.cer` if automatic signing works.

### Manual path — import certificate + private key (if not using automatic signing)

If you generated the CSR with our script (private key in `stocknews-ios-private.key`):

1. On Mac, copy `stocknews-ios-private.key` and `distribution.cer`
2. Import the `.cer`: double-click → Keychain Access
3. Import the key: Keychain Access → File → Import Items → select `.key`
4. Ensure certificate and private key appear under the same key pair
5. Export as `.p12` if needed for CI (password-protect the export)

---

## Which certificates do you need?

| Certificate | Required for |
|-------------|--------------|
| **Apple Distribution** | App Store / TestFlight release builds |
| **Apple Development** | Run on physical iPhone during development |

For **Stock News** first App Store upload you need at minimum:

- Apple **Distribution** certificate
- App Store **provisioning profile** for `vn.orangecloud.stocknews` (Xcode can create this)

---

## Provisioning profile (after certificate)

1. **Profiles** → **+** → **App Store Connect** (or **App Store**)
2. App ID: `vn.orangecloud.stocknews`
3. Select your **Distribution** certificate
4. Download profile → double-click to install (or let Xcode manage it)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Invalid CSR" | Regenerate with 2048-bit RSA; ensure CN/email are filled |
| Certificate has no private key in Keychain | Import the `.key` that was created with the CSR |
| Xcode "No signing certificate" | Accounts → Download Manual Profiles; or create Distribution cert |
| Wrong team | Use Cloudspace Team ID after enrollment completes |

---

## Security

- **Never** commit `*.key`, `*.p12`, or passwords to git
- Back up `stocknews-ios-private.key` in a password manager or encrypted vault
- If the key is lost, revoke the certificate on Apple Developer and create a new CSR

See also: **`APPLE_ENROLLMENT_CLOUDSPACE.md`**, **`APP_STORE_CONNECT_WIZARD.md`**
