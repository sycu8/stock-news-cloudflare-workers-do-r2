import { LOGO_URL } from "./brand";

export function renderNotifyPage(params: {
  botUsername: string | null;
  configured: boolean;
  subscriberCount: number;
  baseUrl: string;
}): string {
  const bot = params.botUsername?.replace(/^@/, "").trim();
  const deepLink =
    bot && params.configured ? `https://t.me/${encodeURIComponent(bot)}?start=notify` : "";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Thông báo — Stock News</title>
  <link rel="icon" type="image/png" href="${LOGO_URL}" />
  <style>
    body { font-family: system-ui,Segoe UI,Arial,sans-serif; margin: 0; background: #f5f7fb; color: #111827; }
    .wrap { max-width: 560px; margin: 0 auto; padding: 22px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; box-shadow: 0 4px 14px rgba(15,23,42,.06); }
    h1 { margin: 0 0 8px; font-size: 1.35rem; }
    p { line-height: 1.55; color: #374151; margin: 12px 0; }
    .btn { display:inline-block; padding: 12px 16px; border-radius: 12px; background: #2563eb; color: #fff !important; text-decoration: none; font-weight: 600; margin-top: 10px; }
    .btn[disabled], .btn.muted { background: #94a3b8; pointer-events: none; cursor: not-allowed; }
    .meta { font-size: .9rem; color: #64748b; margin-top: 16px; }
    code { font-size: .85rem; background: #f1f5f9; padding: 2px 6px; border-radius: 6px; word-break: break-all; }
    ol { padding-left: 18px; margin: 12px 0; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <main class="wrap">
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

      <h2 style="margin:20px 0 8px;font-size:1.05rem;">Cài đặt webhook (admin)</h2>
      <ol>
        <li>Tạo bot với <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a>, lấy token.</li>
        <li>Thêm secret vào Worker: <code>TELEGRAM_BOT_TOKEN</code>, <code>TELEGRAM_WEBHOOK_SECRET</code> (chuỗi ngẫu nhiên).</li>
        <li>Gọi API (một lần):<br />
          <code>https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook?url=${escapeHtml(
            params.baseUrl.replace(/\/$/, "")
          )}/webhooks/telegram&amp;secret_token=&lt;WEBHOOK_SECRET&gt;</code>
        </li>
      </ol>
      <p class="meta">Webhook path: <code>/webhooks/telegram</code></p>
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
