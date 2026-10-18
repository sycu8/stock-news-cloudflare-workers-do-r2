import { LOGO_URL } from "./brand";
import { themeAppearanceSwitcher, themeFontLinks, themeSemanticVariablesBlock, type Appearance } from "./theme";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function legalShell(params: {
  title: string;
  subtitle: string;
  bodyHtml: string;
  appearance: Appearance;
}): string {
  const sw = themeAppearanceSwitcher(params.appearance, "/");
  return `<!DOCTYPE html>
<html lang="vi" data-theme="${params.appearance}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(params.title)} • Stock News</title>
  <meta name="description" content="${esc(params.subtitle)}" />
  <link rel="icon" type="image/png" href="${LOGO_URL}" />
  <link rel="apple-touch-icon" href="${LOGO_URL}" />
  ${themeFontLinks()}
  <style>
    ${themeSemanticVariablesBlock()}
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Montserrat, system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
    .wrap { max-width: 760px; margin: 0 auto; padding: 20px 16px 48px; }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .brand img { width: 44px; height: 44px; border-radius: 10px; }
    h1 { font-size: 1.55rem; margin: 0 0 8px; }
    .lead { color: var(--muted); margin: 0 0 24px; }
    h2 { font-size: 1.05rem; margin: 28px 0 10px; }
    p, li { font-size: 0.95rem; }
    ul { padding-left: 20px; }
    .notice { border-left: 4px solid #f59e0b; padding: 12px 14px; background: color-mix(in srgb, #f59e0b 8%, var(--surface)); border-radius: 8px; margin: 20px 0; }
    .nav { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--border); font-size: 0.9rem; }
    .nav a { color: var(--primary2); }
    .meta { font-size: 0.85rem; color: var(--muted); margin-top: 24px; }
    .themeCorner { position: fixed; right: 12px; bottom: 12px; z-index: 20; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand">
      <a href="/"><img src="${LOGO_URL}" alt="Stock News" width="44" height="44" /></a>
      <div><strong>Stock News by Orange Cloud</strong></div>
    </div>
    <h1>${esc(params.title)}</h1>
    <p class="lead">${esc(params.subtitle)}</p>
    ${params.bodyHtml}
    <nav class="nav" aria-label="Legal navigation">
      <a href="/privacy">Chính sách quyền riêng tư</a>
      <a href="/terms">Điều khoản sử dụng</a>
      <a href="/">Trang chủ</a>
      <a href="/notify">Cài đặt thông báo</a>
    </nav>
    <p class="meta">Cập nhật lần cuối: 26 tháng 6, 2026. Liên hệ: <a href="mailto:support@orangecloud.vn">support@orangecloud.vn</a></p>
  </div>
  <div class="themeCorner">${sw}</div>
</body>
</html>`;
}

export function renderPrivacyPolicyPage(appearance: Appearance): string {
  return legalShell({
    title: "Chính sách quyền riêng tư",
    subtitle: "Cách Stock News thu thập, sử dụng và bảo vệ dữ liệu của bạn.",
    appearance,
    bodyHtml: `
    <div class="notice"><strong>Không phải khuyến nghị đầu tư.</strong> Ứng dụng và website chỉ cung cấp tin tức tham khảo, không phải tư vấn tài chính hay môi giới.</div>
    <h2>1. Phạm vi</h2>
    <p>Chính sách này áp dụng cho website <strong>stocknews.orangecloud.vn</strong>, ứng dụng di động Stock News (iOS/Android), và các dịch vụ liên quan do Orange Cloud vận hành.</p>
    <h2>2. Dữ liệu chúng tôi xử lý</h2>
    <ul>
      <li><strong>Nội dung công khai:</strong> tiêu đề, tóm tắt, liên kết bài báo từ nguồn RSS/HTML được phép.</li>
      <li><strong>Watchlist / danh mục theo dõi:</strong> mã cổ phiếu bạn chọn, lưu bằng cookie hoặc ID ẩn danh trên máy chủ (KV) — không yêu cầu tài khoản đăng nhập.</li>
      <li><strong>Thông báo Telegram (tùy chọn):</strong> nếu bạn kết nối bot, chúng tôi lưu chat ID Telegram và tùy chọn lọc tin (mã, mức tác động, tin nóng).</li>
      <li><strong>Web Push / thông báo đẩy (tùy chọn):</strong> endpoint đăng ký trình duyệt hoặc thiết bị (nếu bạn bật).</li>
      <li><strong>Cookie &amp; lưu trữ cục bộ:</strong> giao diện sáng/tối (<code>sn_theme</code>), đồng ý marketing (<code>sn_consent_mkt</code>), watchlist (<code>vnwatch</code>, <code>sn_watch_id</code>).</li>
      <li><strong>Phân tích hiệu năng (RUM):</strong> thời gian tải trang, loại thiết bị, mẫu đường dẫn — không cố ý thu thập nội dung form cá nhân.</li>
      <li><strong>Lượt xem bài:</strong> bộ đếm ẩn danh theo URL bài trong ngày.</li>
      <li><strong>Nhật ký kỹ thuật:</strong> IP, user-agent, thời gian truy cập qua Cloudflare Workers (bảo mật &amp; vận hành).</li>
    </ul>
    <h2>3. Mục đích sử dụng</h2>
    <ul>
      <li>Hiển thị tin tức, biểu đồ tham khảo và bảng thị trường.</li>
      <li>Cá nhân hóa watchlist và bản tin theo mã bạn chọn.</li>
      <li>Gửi cảnh báo khi bạn đăng ký (Telegram hoặc push).</li>
      <li>Cải thiện hiệu năng, độ tin cậy và trải nghiệm người dùng.</li>
      <li>Tuân thủ pháp luật và bảo vệ dịch vụ khỏi lạm dụng.</li>
    </ul>
    <h2>4. Bên thứ ba</h2>
    <p>Dữ liệu có thể được xử lý bởi: Cloudflare (hosting, KV, D1, R2, AI), Telegram (nếu bạn dùng bot), nhà cung cấp AI (Workers AI / OpenAI cho tóm tắt &amp; giải thích), và các nguồn tin công khai (Vietstock, CafeF, HSX API, v.v.). Chúng tôi không bán dữ liệu cá nhân của bạn.</p>
    <h2>5. Lưu trữ &amp; bảo mật</h2>
    <p>Dữ liệu được lưu trên hạ tầng Cloudflare tại các vùng edge. Cookie watchlist có thời hạn giới hạn. Bạn có thể xóa cookie trình duyệt hoặc gỡ watchlist trong ứng dụng. Telegram: gửi <code>/stop</code> cho bot để hủy đăng ký.</p>
    <h2>6. Quyền của bạn</h2>
    <ul>
      <li>Từ chối cookie marketing qua banner hoặc xóa cookie.</li>
      <li>Hủy thông báo Telegram hoặc push bất cứ lúc nào.</li>
      <li>Yêu cầu truy cập / xóa dữ liệu liên quan watchlist hoặc Telegram qua <a href="mailto:support@orangecloud.vn">support@orangecloud.vn</a>.</li>
    </ul>
    <h2>7. Trẻ em</h2>
    <p>Dịch vụ không hướng tới trẻ em dưới 13 tuổi. Chúng tôi không cố ý thu thập dữ liệu trẻ em.</p>
    <h2>8. Thay đổi</h2>
    <p>Chúng tôi có thể cập nhật chính sách này; phiên bản mới sẽ được đăng tại URL này với ngày hiệu lực.</p>
    `
  });
}

export function renderTermsPage(appearance: Appearance): string {
  return legalShell({
    title: "Điều khoản sử dụng",
    subtitle: "Quy tắc sử dụng Stock News — tin thị trường chứng khoán Việt Nam.",
    appearance,
    bodyHtml: `
    <div class="notice"><strong>Cảnh báo đầu tư:</strong> Mọi nội dung (tin tức, biểu đồ cảm xúc, Fear/Greed, giải thích AI) chỉ mang tính tham khảo. Không phải khuyến nghị mua/bán/giữ chứng khoán. Quyết định đầu tư là trách nhiệm của bạn.</div>
    <h2>1. Chấp nhận điều khoản</h2>
    <p>Bằng việc truy cập website hoặc cài đặt ứng dụng Stock News, bạn đồng ý với các điều khoản này và <a href="/privacy">Chính sách quyền riêng tư</a>.</p>
    <h2>2. Dịch vụ</h2>
    <p>Stock News tổng hợp tin tức chứng khoán Việt Nam từ nguồn công khai, kèm công cụ watchlist, bản tin và dữ liệu thị trường tham khảo (CafeF, HSX, tỷ giá, vàng). Dịch vụ có thể thay đổi, tạm ngưng hoặc cập nhật mà không báo trước.</p>
    <h2>3. Dữ liệu thị trường</h2>
    <p>Dữ liệu giá, khối lượng, biểu đồ và chỉ số có thể trễ, sai lệch hoặc thiếu. Một số chỉ số được suy luận từ tin tức (không phải feed giá cấp sàn). Không sử dụng làm cơ sở duy nhất cho giao dịch.</p>
    <h2>4. Nội dung bên thứ ba</h2>
    <p>Bài viết thuộc bản quyền nguồn gốc. Liên kết dẫn tới trang gốc. Chúng tôi không chịu trách nhiệm nội dung bên ngoài.</p>
    <h2>5. Sử dụng chấp nhận được</h2>
    <ul>
      <li>Không scrape quá mức, tấn công, reverse engineer dịch vụ.</li>
      <li>Không dùng dịch vụ cho mục đích bất hợp pháp.</li>
      <li>Không mạo danh Orange Cloud hoặc nguồn tin.</li>
    </ul>
    <h2>6. Tài khoản &amp; thông báo</h2>
    <p>Thông báo Telegram/push là tùy chọn. Bạn chịu trách nhiệm bảo mật thiết bị và tài khoản Telegram của mình.</p>
    <h2>7. Miễn trừ trách nhiệm</h2>
    <p>Dịch vụ được cung cấp &quot;nguyên trạng&quot;. Orange Cloud không bảo đảm lợi nhuận, độ chính xác hay tính liên tục. Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm thiệt hại gián tiếp từ việc sử dụng dịch vụ.</p>
    <h2>8. Luật áp dụng</h2>
    <p>Điều khoản này được giải thích theo pháp luật Việt Nam, trừ khi luật bắt buộc khác tại quốc gia bạn cư trú (App Store / Play Store).</p>
    `
  });
}

export interface WebManifestInput {
  origin: string;
}

export function buildWebManifest(input: WebManifestInput): Record<string, unknown> {
  const { origin } = input;
  return {
    name: "Stock News — Tin chứng khoán Việt Nam",
    short_name: "Stock News",
    description: "Tin thị trường chứng khoán Việt Nam, watchlist và bản tin cá nhân hóa.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    lang: "vi",
    categories: ["finance", "news"],
    icons: [
      { src: `${origin}/assets/brand/logo.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${origin}/assets/brand/logo.png`, sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ],
    related_applications: [
      {
        platform: "play",
        url: "https://play.google.com/store/apps/details?id=vn.orangecloud.stocknews",
        id: "vn.orangecloud.stocknews"
      },
      {
        platform: "itunes",
        url: "https://apps.apple.com/app/stock-news-vn/id0000000000"
      }
    ],
    prefer_related_applications: false
  };
}

export function mobileWebAppMetaBlock(): string {
  return `
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#0f172a" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Stock News" />
  `.trim();
}
