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
  <meta name="description" content="Nhận thông báo Telegram cho các cập nhật thị trường quan trọng từ Stock News." />
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
    button,a,input,select{min-height:var(--control-h);min-width:var(--control-h)}
  </style>
</head>
<body class="appBody">
  <main class="wrap">
    <div class="notifyHead"><p style="margin:0"><a href="/">← Trang chủ</a></p>${sw}</div>
    <div class="card">
      <h1>🔔 Nhận thông báo (Telegram)</h1>
      <p>
        Kết nối bot Telegram để nhận ping khi có tin mới — có thể lọc theo mã, điểm nổi bật và tin đa nguồn.
        Không thay thế tư vấn đầu tư.
      </p>
      ${
        params.configured && deepLink
          ? `<p><a class="btn" href="${escapeAttr(deepLink)}" target="_blank" rel="noopener noreferrer">Mở Telegram và bật thông báo</a></p>
             <p class="meta">Đang có <strong>${params.subscriberCount}</strong> người đăng ký.</p>`
          : `<p class="meta">Bot Telegram chưa được cấu hình trên server. Admin cần thêm biến <code>TELEGRAM_BOT_USERNAME</code> và secret <code>TELEGRAM_BOT_TOKEN</code>.</p>`
      }

      <h2 style="margin:20px 0 8px;font-size:1.05rem;">Web Push (trình duyệt)</h2>
      <p class="meta">Đăng ký thông báo đẩy khi VAPID đã cấu hình trên server. Cần HTTPS và cho phép thông báo.</p>
      <button type="button" class="btn" id="pushEnableBtn" style="border:0;cursor:pointer;">Bật Web Push</button>
      <p class="meta" id="pushStatus"></p>
      <script>
      (async function(){
        const btn = document.getElementById("pushEnableBtn");
        const st = document.getElementById("pushStatus");
        if (!btn || !st || !("serviceWorker" in navigator) || !("PushManager" in window)) {
          if (st) st.textContent = "Trình duyệt không hỗ trợ Web Push.";
          if (btn) btn.disabled = true;
          return;
        }
        btn.addEventListener("click", async () => {
          try {
            const v = await fetch("/api/push/vapid").then(r => r.json());
            if (!v.configured || !v.publicKey) { st.textContent = "Server chưa cấu hình VAPID."; return; }
            const reg = await navigator.serviceWorker.register("/sw.js");
            const perm = await Notification.requestPermission();
            if (perm !== "granted") { st.textContent = "Đã từ chối quyền thông báo."; return; }
            const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: v.publicKey });
            await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
            st.textContent = "✅ Đã đăng ký Web Push.";
          } catch (e) { st.textContent = "Lỗi: " + (e && e.message ? e.message : String(e)); }
        });
      })();
      </script>

      <h2 style="margin:20px 0 8px;font-size:1.05rem;">Hướng dẫn Telegram</h2>
      <ol>
        <li>Bấm nút <strong>Mở Telegram và bật thông báo</strong> ở trên.</li>
        <li>Trong Telegram, chọn <strong>Start</strong> để đăng ký nhận bản tin.</li>
        <li>Đảm bảo bạn không tắt hoặc chặn bot để tiếp tục nhận thông báo tự động.</li>
        <li>Khi hệ thống có bài mới, bot gửi tin phù hợp <strong>cài đặt cá nhân</strong> của bạn.</li>
        <li>Cá nhân hoá trong Telegram: <code>/symbols VNM,FPT</code>, <code>/impact 40</code>, <code>/breaking on</code>, <code>/settings</code>.</li>
        <li>Gửi <code>/all</code> để nhận mọi tin (bỏ lọc mã). Gửi <code>/stop</code> để huỷ.</li>
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
