# Upload iOS lên App Store bằng Xcode (thủ công)

**App:** Stock News · **Bundle ID:** `vn.orangecloud.stocknews` · **Version:** 1.0.1 · **Build:** 3

Website app load: https://stocknews.orangecloud.vn

---

## Yêu cầu

| Cần có | Ghi chú |
|--------|---------|
| Mac | Bắt buộc — không build iOS trên Windows/Linux |
| Xcode 15+ | Tải từ Mac App Store |
| Apple Developer | $99/năm, team **Cloudspace** |
| Tài khoản App Store Connect | Cùng team Apple Developer |

---

## Bước 1 — Giải nén project

Giải nén file **`stocknews-ios-xcode-kit.zip`** vào thư mục bạn muốn, ví dụ:

```
~/Projects/stocknews-ios-xcode-kit/
```

Bên trong có thư mục `mobile/` — đó là project Capacitor + Xcode.

---

## Bước 2 — Cài dependency (Terminal trên Mac)

```bash
cd mobile
npm install
npx cap sync ios
cd ios/App
pod install
```

Nếu chưa có CocoaPods:

```bash
sudo gem install cocoapods
```

---

## Bước 3 — Mở Xcode

```bash
cd mobile
npx cap open ios
```

Hoặc mở trực tiếp file:

```
mobile/ios/App/App.xcworkspace
```

> **Quan trọng:** Mở file `.xcworkspace`, **không** mở `.xcodeproj`.

---

## Bước 4 — Cấu hình Signing

1. Chọn project **App** (cột trái) → target **App**
2. Tab **Signing & Capabilities**
3. **Team:** chọn team Cloudspace (Apple Developer)
4. **Bundle Identifier:** `vn.orangecloud.stocknews`
5. Bật **Automatically manage signing**
6. Kiểm tra **Associated Domains** có:
   ```
   applinks:stocknews.orangecloud.vn
   ```

### Version / Build

Tab **General**:

| Field | Giá trị |
|-------|---------|
| Display Name | Stock News |
| Version | 1.0.1 |
| Build | 3 |

---

## Bước 5 — Archive (tạo bản build)

1. Trên thanh toolbar, chọn destination: **Any iOS Device (arm64)**  
   (Không chọn Simulator)
2. Menu **Product → Archive**
3. Đợi build xong (2–5 phút)

Nếu lỗi signing:

- Vào https://developer.apple.com/account → **Certificates, Identifiers & Profiles**
- Tạo **App ID** `vn.orangecloud.stocknews` nếu chưa có
- Bật capability **Associated Domains**
- Quay lại Xcode → **Signing & Capabilities** → chọn lại Team

---

## Bước 6 — Upload lên App Store Connect

Sau khi Archive xong, cửa sổ **Organizer** mở ra:

1. Chọn archive vừa tạo → **Distribute App**
2. **App Store Connect** → Next
3. **Upload** → Next
4. Giữ mặc định (Include bitcode off, Upload symbols on) → Next
5. Chọn signing certificate tự động → Next
6. **Upload**

### Export compliance (mã hóa)

Khi được hỏi:

| Câu hỏi | Trả lời |
|---------|---------|
| App có dùng mã hóa? | **Yes** |
| Chỉ dùng HTTPS/TLS tiêu chuẩn? | **Yes** — exempt |
| ITSAppUsesNonExemptEncryption | Đã set `false` trong Info.plist |

---

## Bước 7 — App Store Connect (metadata)

1. Mở https://appstoreconnect.apple.com
2. **My Apps → Stock News** (tạo app mới nếu chưa có)
3. Tab **App Store** → version **1.0.1**
4. Đợi build **3** xử lý (~15–30 phút) rồi chọn trong mục **Build**

### Screenshot (đã có sẵn trong zip)

Trong thư mục `screenshots/`:

| Thiết bị | Kích thước | Số lượng tối thiểu |
|----------|------------|-------------------|
| iPhone 6.7" | 1290×2796 | 3 (home, desk, portfolio) |
| iPad 12.9" | 2048×2732 | 3 (tùy chọn) |

Kéo thả PNG vào khung tương ứng trên App Store Connect.

### Copy tiếng Việt

Mở file `mobile/store/app-store-connect-vi.txt` — copy mô tả, từ khóa, ghi chú reviewer.

---

## Bước 8 — Gửi duyệt

1. Điền **App Privacy** (xem `store/APP_STORE_PRIVACY.md`)
2. **App Review Information:**
   - Sign-in required: **No**
   - Email: support@orangecloud.vn
   - Notes: copy từ `app-store-connect-vi.txt`
3. **Add for Review** → Submit

Thời gian duyệt thường **1–3 ngày**.

---

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|-----|------------|
| No signing certificate | Xcode → Settings → Accounts → thêm Apple ID Cloudspace |
| Bundle ID không khớp | Sửa thành `vn.orangecloud.stocknews` |
| Archive bị xám (disabled) | Chọn **Any iOS Device**, không phải Simulator |
| Pod install fail | `cd ios/App && pod repo update && pod install` |
| Build không hiện trên ASC | Đợi 15–30 phút; kiểm tra email lỗi từ Apple |

---

## Cấu trúc thư mục

```
mobile/
  capacitor.config.ts    # URL production
  ios/App/App.xcworkspace  # Mở file này trong Xcode
  store/
    app-store-connect-vi.txt   # Metadata tiếng Việt
    APP_STORE_CONNECT_WIZARD.md
screenshots/             # Ảnh App Store (kéo thả)
apple-signing/           # CSR (nếu cần tạo cert thủ công)
```

---

## Liên hệ hỗ trợ

- Email: support@orangecloud.vn
- Privacy: https://stocknews.orangecloud.vn/privacy
- Terms: https://stocknews.orangecloud.vn/terms
