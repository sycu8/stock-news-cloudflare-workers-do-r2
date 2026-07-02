# Apple Developer enrollment — Cloudspace

You do **not** have an Apple Team ID yet. Apple only issues one after enrolling in the [Apple Developer Program](https://developer.apple.com/programs/enroll/) ($99/year).

Use organization details aligned with **Cloudspace** / Orange Cloud:

| Field | Suggested value |
|-------|-----------------|
| Entity type | Organization (or Individual if no D-U-N-S yet) |
| Organization name | **Cloudspace** (or legal entity on your business registration) |
| D-U-N-S | Required for Organization — request free at [Apple D-U-N-S lookup](https://developer.apple.com/enroll/duns-lookup/) |
| Website | https://stocknews.orangecloud.vn |
| Support URL | https://stocknews.orangecloud.vn/privacy |
| Bundle ID | `vn.orangecloud.stocknews` (register under Identifiers) |

## Steps

1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with Apple ID (create one for Cloudspace if needed)
3. Choose **Organization** → complete D-U-N-S verification (can take days)
4. Pay $99/year
5. After approval, open https://developer.apple.com/account → **Membership** → copy **Team ID** (10 characters, e.g. `AB12CD34EF`)

## Connect Team ID to the website (Universal Links)

```bash
cd /path/to/repo
npx wrangler secret put APPLE_TEAM_ID
# paste Team ID when prompted
npx wrangler deploy
```

Verify AASA shows your Team ID:

https://stocknews.orangecloud.vn/.well-known/apple-app-site-association

(`appID` should be `{YOUR_TEAM_ID}.vn.orangecloud.stocknews`, not `TEAMID...`)

## Xcode signing

See **`APPLE_IOS_CSR.md`** to create and upload a Certificate Signing Request (CSR).

1. Generate CSR: `cd mobile && ./scripts/create-apple-csr.sh`
2. Upload `dist/apple-signing/stocknews-ios.certSigningRequest` at developer.apple.com → Certificates → +
3. Add your Apple ID in Xcode → Settings → Accounts → **Cloudspace team**
4. `npx cap open ios` → Signing & Capabilities → Team = Cloudspace
5. Associated Domains: `applinks:stocknews.orangecloud.vn`

## App Store Connect

Create app with Bundle ID `vn.orangecloud.stocknews`, seller name **Cloudspace** (or legal name shown in contracts).

Until enrollment completes, you can still finish **Google Play** upload using the Android keystore already generated.
