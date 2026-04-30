import { LOGO_URL } from "./brand";
import { themeAppearanceSwitcher, themeFontLinks, themeSemanticVariablesBlock, type Appearance } from "./theme";

export function renderNotifyPage(params: {
  botUsername: string | null;
  configured: boolean;
  subscriberCount: number;
  baseUrl: string;
  appearance: Appearance;
}): string {
  const bot = params.botUsername?.replace(/^@/, "").trim();
  const deepLink =
    bot && params.configured ? `https://t.me/${encodeURIComponent(bot)}?start=notify` : "";
  const sw = themeAppearanceSwitcher(params.appearance, "/notify");

  return `<!DOCTYPE html>
<html lang="vi" data-theme="${params.appearance}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Thông báo — Stock News</title>
  <link rel="icon" type="image/png" href="${LOGO_URL}" />
  ${themeFontLinks()}
  <style>
    ${themeSemanticVariablesBlock()}
    .notifyHead { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    .wrap { max-width: 560px; margin: 0 auto; padding: 22px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; box-shadow: var(--shadow); }
    h1 { margin: 0 0 8px; font-size: 1.35rem; }
    p { line-height: 1.55; color: var(--muted); margin: 12px 0; }
    .btn { display:inline-block; padding: 12px 16px; border-radius: 12px; background: var(--primary); color: #fff !important; text-decoration: none; font-weight: 700; margin-top: 10px; }
    .btn[disabled], .btn.muted { background: #94a3b8; pointer-events: none; cursor: not-allowed; }
    .meta { font-size: .9rem; color: var(--muted); margin-top: 16px; }
    code { font-size: .85rem; background: var(--code-bg); border:1px solid var(--border); padding: 2px 6px; border-radius: 6px; word-break: break-all; }
    ol { padding-left: 18px; margin: 12px 0; }
    li { margin: 8px 0; }
  </style>
</head>
<body class="appBody">
  <main class="wrap">
    <div class="notifyHead"><p style="margin:0"><a href="/">← Trang chủ</a></p>${sw}</div>
    <div class="card">
      <h1>🔔 Nhận thông báo (Telegram)</h1>
      <p>
        Kết nối bot Telegram để nhận ping khi có tin tức / cập nhật quan trọng (broadcast từ admin).
        Không thay thế tư vấn đầu tư.
      </p>
      ${
        params.configured && deepLink
          ? `<p><a class="btn" href="${escapeAttr(deepLink)}" target="_blank" rel="noopener noreferrer">Mở Telegram và bật thông báo</a></p>
             <p class="meta">Đang có <strong>${params.subscriberCount}</strong> người đăng ký.</p>`
          : `<p class="meta">Bot Telegram chưa được cấu hình trên server. Admin cần thêm biến <code>TELEGRAM_BOT_USERNAME</code> và secret <code>TELEGRAM_BOT_TOKEN</code>.</p>`
      }

      <h2 style="margin:20px 0 8px;font-size:1.05rem;">Hướng dẫn cho người dùng</h2>
      <ol>
        <li>Bấm nút <strong>Mở Telegram và bật thông báo</strong> ở trên.</li>
        <li>Trong Telegram, chọn <strong>Start</strong> để đăng ký nhận bản tin.</li>
        <li>Đảm bảo bạn không tắt hoặc chặn bot để tiếp tục nhận thông báo tự động.</li>
        <li>Khi hệ thống có bài mới quan trọng, bot sẽ gửi bản tin gộp vào Telegram của bạn.</li>
        <li>Nếu chưa nhận được thông báo, hãy mở lại bot và gửi <code>/start</code> một lần nữa.</li>
      </ol>
      <p class="meta">Mẹo: bạn có thể ghim bot lên đầu danh sách chat để không bỏ lỡ tín hiệu mới.</p>
    </div>
  </main>
</body>
</html>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
