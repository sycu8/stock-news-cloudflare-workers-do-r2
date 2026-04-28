import type { CrawlRunRecord, NewsSourceRecord } from "../types";

interface AdminPageParams {
  token: string;
  sources: NewsSourceRecord[];
  runs: CrawlRunRecord[];
  message?: string;
}

export function renderAdminSourcesPage({ token, sources, runs, message }: AdminPageParams): string {
  const sourceCards = sources
    .map(
      (source) => `
      <article class="card">
        <div class="row top">
          <div>
            <h3>${escapeHtml(source.name)}</h3>
            <p class="meta">${escapeHtml(source.type)} • ${source.enabled ? "Đang bật" : "Đang tắt"}</p>
          </div>
          <span class="badge ${source.enabled ? "ok" : "off"}">${source.enabled ? "Bật" : "Tắt"}</span>
        </div>
        <div class="stack">
          <p><strong>ID:</strong> ${escapeHtml(source.id)}</p>
          ${source.feedUrl ? `<p><strong>Feed URL:</strong> ${escapeHtml(source.feedUrl)}</p>` : ""}
          ${source.listUrl ? `<p><strong>Trang danh sách (List URL):</strong> ${escapeHtml(source.listUrl)}</p>` : ""}
          ${source.baseUrl ? `<p><strong>Base URL:</strong> ${escapeHtml(source.baseUrl)}</p>` : ""}
          ${
            source.lastRunAt
              ? `<p><strong>Lần chạy gần nhất:</strong> ${escapeHtml(source.lastRunStatus ?? "không rõ")} • ${escapeHtml(source.lastRunAt)}</p>`
              : "<p><strong>Lần chạy gần nhất:</strong> chưa có</p>"
          }
          ${source.lastRunMessage ? `<p class="hint">${escapeHtml(source.lastRunMessage)}</p>` : ""}
        </div>
        <div class="actions">
          <form method="POST" action="/admin/sources/${encodeURIComponent(source.id)}/toggle?token=${encodeURIComponent(token)}">
            <button type="submit">${source.enabled ? "Tắt nguồn" : "Bật nguồn"}</button>
          </form>
          ${
            source.isDefault
              ? '<span class="defaultTag">Nguồn mặc định</span>'
              : `<form method="POST" action="/admin/sources/${encodeURIComponent(source.id)}/delete?token=${encodeURIComponent(
                  token
                )}" onsubmit="return confirm('Xoá nguồn tuỳ chỉnh này?');"><button class="danger" type="submit">Xoá</button></form>`
          }
        </div>
      </article>
    `
    )
    .join("");

  const runItems = runs
    .map(
      (run) => `
      <li>
        <strong>${escapeHtml(run.sourceId)}</strong> • ${escapeHtml(run.status)} • ${escapeHtml(run.createdAt)}
        <div class="hint">${escapeHtml(run.message)} (${run.fetchedCount} mục)</div>
      </li>
    `
    )
    .join("");

  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Quản trị nguồn tin</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; margin: 0; background: #f4f6fb; color: #101828; }
      .container { max-width: 1080px; margin: 0 auto; padding: 16px; }
      .hero, .panel, .card { background: #fff; border-radius: 16px; box-shadow: 0 6px 24px rgba(16,24,40,.06); }
      .hero { padding: 18px; margin-bottom: 16px; }
      .hero h1 { margin: 0 0 8px; font-size: 1.35rem; }
      .hero p, .panel p, .card p { margin: 6px 0; }
      .notice { background: #ecfdf3; color: #027a48; border: 1px solid #abefc6; padding: 10px 12px; border-radius: 12px; margin-top: 10px; }
      .panel { padding: 16px; margin-bottom: 16px; }
      .grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 16px; align-items: start; }
      .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
      .card { padding: 14px; border: 1px solid #eaecf0; }
      .row { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
      .top { align-items: start; }
      .stack { display: grid; gap: 4px; margin-top: 10px; }
      .meta, .hint, .defaultTag { color: #475467; font-size: .9rem; }
      .badge { border-radius: 999px; padding: 6px 10px; font-size: .85rem; font-weight: 600; }
      .badge.ok { background: #ecfdf3; color: #027a48; }
      .badge.off { background: #f2f4f7; color: #344054; }
      form { margin: 0; }
      .formGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      label { display: grid; gap: 6px; font-size: .95rem; }
      input, select, textarea, button { font: inherit; }
      input, select, textarea { border: 1px solid #d0d5dd; border-radius: 12px; padding: 10px 12px; background: #fff; }
      textarea { min-height: 96px; resize: vertical; }
      button { border: 0; border-radius: 12px; padding: 10px 14px; background: #155eef; color: #fff; cursor: pointer; }
      button.danger { background: #d92d20; }
      .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
      .inlineActions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
      ul { padding-left: 18px; margin: 8px 0 0; }
      @media (max-width: 860px) {
        .grid { grid-template-columns: 1fr; }
        .formGrid { grid-template-columns: 1fr; }
      }
      @media (max-width: 640px) {
        .container { padding: 12px; }
        .hero, .panel, .card { border-radius: 14px; }
        button, input, select, textarea { width: 100%; }
        .actions form { flex: 1 1 100%; }
      }
    </style>
  </head>
  <body>
    <main class="container">
      <section class="hero">
        <h1>Admin nguồn tin và crawler</h1>
        <p>Thêm RSS thủ công, bật/tắt nguồn, và theo dõi các lần crawl/fetch gần nhất.</p>
        <div class="inlineActions">
          <a href="/?lang=vi" target="_blank" rel="noopener noreferrer">Mở homepage</a>
          <a href="/rss/today" target="_blank" rel="noopener noreferrer">Mở RSS feed</a>
          <form method="POST" action="/admin/refresh?token=${encodeURIComponent(token)}">
            <button type="submit">Làm mới ngay</button>
          </form>
        </div>
        ${message ? `<div class="notice">${escapeHtml(message)}</div>` : ""}
      </section>
      <section class="grid">
        <div class="panel">
          <h2>Thêm nguồn tin thủ công</h2>
          <form method="POST" action="/admin/sources?token=${encodeURIComponent(token)}">
            <div class="formGrid">
              <label>Tên nguồn
                <input name="name" required placeholder="Ví dụ: SSI Research RSS" />
              </label>
              <label>Loại nguồn
                <select name="type">
                  <option value="rss">RSS</option>
                  <option value="html_list">Danh sách HTML (crawl chọn lọc)</option>
                </select>
              </label>
              <label>Feed URL
                <input name="feedUrl" placeholder="https://example.com/feed.xml" />
              </label>
              <label>List URL
                <input name="listUrl" placeholder="https://example.com/news/" />
              </label>
              <label>Base URL
                <input name="baseUrl" placeholder="https://example.com" />
              </label>
              <label>Extractor key
                <input name="extractorKey" placeholder="generic-market-news" />
              </label>
              <label>Enabled
                <select name="enabled">
                  <option value="true">Có</option>
                  <option value="false">Không</option>
                </select>
              </label>
              <label>Allow crawl
                <select name="allowCrawl">
                  <option value="false">Không</option>
                  <option value="true">Có</option>
                </select>
              </label>
            </div>
            <label style="margin-top:12px;">Ghi chú
              <textarea name="notes" placeholder="Ghi chú, điều khoản, selector hoặc lưu ý robots.txt"></textarea>
            </label>
            <div class="inlineActions">
              <button type="submit">Lưu nguồn</button>
            </div>
          </form>
        </div>
        <div class="panel">
          <h2>Lịch sử crawl gần nhất</h2>
          <ul>${runItems || "<li>Chưa có log crawl.</li>"}</ul>
        </div>
      </section>
      <section class="panel">
        <h2>Danh sách nguồn</h2>
        <div class="cards">${sourceCards || "<p>Chưa có nguồn nào.</p>"}</div>
      </section>
    </main>
  </body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
