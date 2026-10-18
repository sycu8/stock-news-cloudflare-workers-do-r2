# App Store — Previews & Screenshots (iPhone & iPad)

Stock News supports **iPhone and iPad**. App Store Connect requires screenshots for each device family you support.

Generated assets (after running the capture script):

```
mobile/dist/app-store-screenshots/
  iphone-6.7/     → upload to iPhone 6.7" slot
  ipad-12.9/      → upload to iPad 12.9" slot
```

---

## Required sizes (2026)

| Device slot in App Store Connect | Portrait size | Min count | Required? |
|----------------------------------|---------------|-----------|-----------|
| **iPhone 6.7"** (14 Pro Max, 15 Plus, etc.) | **1290 × 2796** | **3** | Yes (primary iPhone) |
| iPhone 6.5" | 1284 × 2778 | 3 | Only if you skip 6.7" |
| **iPad 12.9"** (Pro) | **2048 × 2732** | **3** | **Yes** (app runs on iPad) |

Format: **PNG** or **JPEG**, no alpha channel issues, RGB, no rounded corners (Apple adds the device frame in some views).

---

## Screenshots included (5 each)

| File | Page | Shows |
|------|------|--------|
| `01-home.png` | `/` | News feed homepage |
| `02-desk.png` | `/desk` | Investor Desk |
| `03-portfolio.png` | `/portfolio` | Watchlist |
| `04-stock-vnm.png` | `/stocks/VNM` | Stock detail + disclaimer |
| `05-notify.png` | `/notify` | Optional Telegram alerts |

Upload **at least 3** (recommend all 5).

---

## Generate screenshots

### Option A — Script (Linux / Mac / CI)

```bash
cd mobile
chmod +x scripts/capture-app-store-screenshots.sh
./scripts/capture-app-store-screenshots.sh
```

Uses headless Chrome at exact App Store dimensions.

Zip outputs:

- `dist/stocknews-app-store-iphone-screenshots.zip`
- `dist/stocknews-app-store-ipad-screenshots.zip`
- `dist/stocknews-app-store-screenshots-all.zip`

### Option B — Xcode Simulator (best for “native app” look)

1. Mac: `cd mobile && npx cap open ios`
2. Simulator → **iPhone 15 Pro Max** (6.7") or **iPad Pro 12.9"**
3. Run app (loads production site)
4. **File → New Screen Shot** (⌘S) — saves to Desktop at correct resolution
5. Capture: Home, Desk, Portfolio (and optional stock / notify)

### Option C — Physical device

Settings → General → About → Screenshot, or Side button + Volume up.  
Resize/crop to exact pixels if needed (Preview app on Mac).

---

## Upload in App Store Connect

1. **My Apps** → **Stock News** → **App Store** tab → version **1.0.1**
2. Scroll to **Previews and Screenshots**
3. **iPhone 6.7" Display** → drag files from `iphone-6.7/` (order: home → desk → portfolio → …)
4. **iPad 12.9" Display** → drag files from `ipad-12.9/`
5. **Save**

Apple may reuse 6.7" shots for smaller iPhones automatically.

---

## App Previews (optional video)

Not required for submission. Max **3 videos** per device size.

| Spec | Value |
|------|--------|
| Length | 15–30 seconds |
| Format | H.264, .mov or .mp4 |
| Resolution | Match screenshot size (e.g. 1290×2796 iPhone) |
| Content | Show scrolling news feed, opening Desk, adding watchlist |

### Record in Simulator

1. Open **QuickTime Player** → File → **New Movie Recording**
2. Click ▾ next to record → **Camera: iPhone Simulator** (or screen record via Xcode)
3. Interact with app 15–30s → stop → export
4. Upload under **App Previews** for the same device size

Or skip previews for v1.0 — screenshots alone are enough.

---

## Checklist

- [ ] iPhone 6.7": minimum **3** PNGs at 1290×2796
- [ ] iPad 12.9": minimum **3** PNGs at 2048×2732
- [ ] Screens show real app content (not blank/error)
- [ ] Investment disclaimer visible on stock page if you include `04-stock-vnm.png`
- [ ] (Optional) 1–3 app preview videos per size

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Wrong dimensions | Re-run script; do not upscale small images |
| Blank screenshot | Wait for site to load; retry with `BASE=https://stocknews.orangecloud.vn` |
| iPad slot missing | App supports iPad — enable iPad in Xcode target if needed |
| Chrome fails | Use Simulator method on Mac |

See also: **`APP_STORE_CONNECT_WIZARD.md`**, **`app-store-connect-vi.txt`**
