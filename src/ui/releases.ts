import { LOGO_URL } from "./brand";
import { themeAppearanceSwitcher, themeFontLinks, themeSemanticVariablesBlock, type Appearance } from "./theme";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BASE = "/assets/releases";

type DownloadItem = {
  label: string;
  href: string;
  desc: string;
  primary?: boolean;
};

const APP_STORE_KIT: DownloadItem = {
  label: "App Store screenshot kit (ZIP)",
  href: `${BASE}/stocknews-app-store-upload-kit.zip`,
  desc: "iPhone 6.7\" + iPad 12.9\" — giải nén và kéo thả vào App Store Connect",
  primary: true
};

const IPHONE_SHOTS = [
  { label: "01-home.png", href: `${BASE}/app-store-screenshots/iphone-6.7/01-home.png`, desc: "Trang chủ tin tức" },
  { label: "02-desk.png", href: `${BASE}/app-store-screenshots/iphone-6.7/02-desk.png`, desc: "Investor Desk" },
  { label: "03-portfolio.png", href: `${BASE}/app-store-screenshots/iphone-6.7/03-portfolio.png`, desc: "Watchlist" },
  { label: "04-stock-vnm.png", href: `${BASE}/app-store-screenshots/iphone-6.7/04-stock-vnm.png`, desc: "Chi tiết mã VNM" },
  { label: "05-notify.png", href: `${BASE}/app-store-screenshots/iphone-6.7/05-notify.png`, desc: "Cài đặt thông báo" }
];

const IPAD_SHOTS = [
  { label: "01-home.png", href: `${BASE}/app-store-screenshots/ipad-12.9/01-home.png`, desc: "Trang chủ tin tức" },
  { label: "02-desk.png", href: `${BASE}/app-store-screenshots/ipad-12.9/02-desk.png`, desc: "Investor Desk" },
  { label: "03-portfolio.png", href: `${BASE}/app-store-screenshots/ipad-12.9/03-portfolio.png`, desc: "Watchlist" },
  { label: "04-stock-vnm.png", href: `${BASE}/app-store-screenshots/ipad-12.9/04-stock-vnm.png`, desc: "Chi tiết mã VNM" },
  { label: "05-notify.png", href: `${BASE}/app-store-screenshots/ipad-12.9/05-notify.png`, desc: "Cài đặt thông báo" }
];

const OTHER_DOWNLOADS: DownloadItem[] = [
  {
    label: "Tất cả screenshot App Store (ZIP)",
    href: `${BASE}/stocknews-app-store-screenshots-all.zip`,
    desc: "iPhone + iPad trong một file"
  },
  {
    label: "Screenshot iPhone 6.7\" (ZIP)",
    href: `${BASE}/stocknews-app-store-iphone-screenshots.zip`,
    desc: "1290 × 2796 px"
  },
  {
    label: "Screenshot iPad 12.9\" (ZIP)",
    href: `${BASE}/stocknews-app-store-ipad-screenshots.zip`,
    desc: "2048 × 2732 px"
  },
  {
    label: "Android AAB — Google Play",
    href: `${BASE}/stocknews-app-release-v1.0.1-api35.aab`,
    desc: "vn.orangecloud.stocknews · API 35 · v1.0.1"
  }
];

function downloadCard(item: DownloadItem): string {
  const cls = item.primary ? "card cardPrimary" : "card";
  return `<a class="${cls}" href="${esc(item.href)}" download>
    <strong>${esc(item.label)}</strong>
    <span>${esc(item.desc)}</span>
  </a>`;
}

function shotGrid(items: DownloadItem[]): string {
  return `<div class="shotGrid">${items
    .map(
      (s) => `<a class="shot" href="${esc(s.href)}" download title="${esc(s.desc)}">
        <img src="${esc(s.href)}" alt="${esc(s.desc)}" loading="lazy" width="120" height="260" />
        <span>${esc(s.label)}</span>
      </a>`
    )
    .join("")}</div>`;
}

export function renderReleasesPage(appearance: Appearance): string {
  const sw = themeAppearanceSwitcher(appearance, "/releases");
  return `<!DOCTYPE html>
<html lang="vi" data-theme="${appearance}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tải xuống • Stock News</title>
  <meta name="description" content="Tải screenshot App Store, Android AAB và bộ upload cho Stock News." />
  <link rel="icon" type="image/png" href="${LOGO_URL}" />
  ${themeFontLinks()}
  <style>
    ${themeSemanticVariablesBlock()}
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Montserrat, system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
    .wrap { max-width: 880px; margin: 0 auto; padding: 20px 16px 48px; }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .brand img { width: 44px; height: 44px; border-radius: 10px; }
    h1 { font-size: 1.55rem; margin: 0 0 8px; }
    .lead { color: var(--muted); margin: 0 0 28px; max-width: 52ch; }
    h2 { font-size: 1.05rem; margin: 32px 0 12px; }
    .cards { display: grid; gap: 12px; }
    .card { display: block; padding: 16px 18px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); text-decoration: none; color: inherit; transition: border-color .15s; }
    .card:hover { border-color: var(--primary2); }
    .card strong { display: block; font-size: 1rem; margin-bottom: 4px; color: var(--primary2); }
    .card span { font-size: 0.88rem; color: var(--muted); }
    .cardPrimary { border-color: color-mix(in srgb, var(--primary2) 45%, var(--border)); background: color-mix(in srgb, var(--primary2) 6%, var(--surface)); }
    .shotGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
    .shot { display: flex; flex-direction: column; align-items: center; gap: 6px; text-decoration: none; color: var(--muted); font-size: 0.75rem; }
    .shot img { width: 100%; max-width: 120px; height: auto; border-radius: 8px; border: 1px solid var(--border); background: #0f172a; }
    .shot:hover img { border-color: var(--primary2); }
    .steps { font-size: 0.92rem; padding-left: 20px; }
    .steps li { margin-bottom: 8px; }
    .nav { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 36px; padding-top: 20px; border-top: 1px solid var(--border); font-size: 0.9rem; }
    .nav a { color: var(--primary2); }
    .themeCorner { position: fixed; right: 12px; bottom: 12px; z-index: 20; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand">
      <a href="/"><img src="${LOGO_URL}" alt="Stock News" width="44" height="44" /></a>
      <div><strong>Stock News by Orange Cloud</strong></div>
    </div>
    <h1>Tải xuống cho App Store &amp; Google Play</h1>
    <p class="lead">Screenshot iPhone/iPad và file Android đã tạo sẵn — bấm để tải, không cần đăng nhập.</p>

    <h2>App Store — khuyến nghị</h2>
    <div class="cards">${downloadCard(APP_STORE_KIT)}</div>
    <ol class="steps">
      <li>Tải <strong>App Store screenshot kit</strong> ở trên</li>
      <li>Giải nén → mở App Store Connect → Stock News → Previews and Screenshots</li>
      <li>Kéo file trong <code>iphone-6.7-upload-here</code> vào iPhone 6.7"</li>
      <li>Kéo file trong <code>ipad-12.9-upload-here</code> vào iPad 12.9"</li>
    </ol>

    <h2>iPhone 6.7" — từng ảnh (1290×2796)</h2>
    ${shotGrid(IPHONE_SHOTS)}

    <h2>iPad 12.9" — từng ảnh (2048×2732)</h2>
    ${shotGrid(IPAD_SHOTS)}

    <h2>Khác</h2>
    <div class="cards">${OTHER_DOWNLOADS.map(downloadCard).join("")}</div>

    <nav class="nav" aria-label="Navigation">
      <a href="/">Trang chủ</a>
      <a href="/privacy">Chính sách quyền riêng tư</a>
      <a href="/terms">Điều khoản</a>
    </nav>
  </div>
  <div class="themeCorner">${sw}</div>
</body>
</html>`;
}
