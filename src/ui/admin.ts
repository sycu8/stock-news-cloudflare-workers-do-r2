import type { CrawlRunRecord, NewsSourceRecord, StoredArticle } from "../types";
import { themeAppearanceSwitcher, themeFontLinks, themeSemanticVariablesBlock, type Appearance } from "./theme";

interface AdminPageParams {
  sources: NewsSourceRecord[];
  runs: CrawlRunRecord[];
  manualArticles: StoredArticle[];
  message?: string;
  appearance: Appearance;
}

interface AdminDashboardParams {
  sourceCount: number;
  enabledSourceCount: number;
  manualArticleCount: number;
  recentRunCount: number;
  subscriberCount: number;
  telegramConfigured: boolean;
  imagesHostedConfigured: boolean;
  imagesVariant: string;
  message?: string;
  appearance: Appearance;
}

export function renderAdminLoginPage({ message, appearance }: { message?: string; appearance: Appearance }): string {
  const sw = themeAppearanceSwitcher(appearance, "/admin/login");
  return `<!doctype html>
<html lang="vi" data-theme="${appearance}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Đăng nhập quản trị</title>
    ${themeFontLinks()}
    <style>
      ${themeSemanticVariablesBlock()}
      .adminLoginTop { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; max-width: 520px; margin-left: auto; margin-right: auto; }
      .card { max-width: 520px; margin: 0 auto 48px; background: var(--surface); border-radius: 16px; padding: 18px; box-shadow: var(--shadow); border:1px solid var(--border); }
      h1 { margin: 0 0 8px; font-size: 1.3rem; }
      p { margin: 0 0 14px; color: var(--muted); }
      input, button { width: 100%; padding: 12px; border-radius: 12px; font: inherit; }
      input { border: 1px solid var(--border); margin: 10px 0 12px; background: var(--surface2); color: var(--text); }
      button { border: 0; background: var(--primary); color: #fff; cursor: pointer; font-weight:700; }
      .notice { background: #ecfdf3; color: #027a48; border: 1px solid #abefc6; padding: 10px 12px; border-radius: 12px; margin-top: 12px; }
    </style>
  </head>
  <body class="appBody">
    <div class="adminLoginTop" style="padding:16px 16px 0"><p style="margin:0"><a href="/">← Trang chủ</a></p>${sw}</div>
    <main class="card">
      <h1>Cần token quản trị</h1>
      <p>Nhập token để truy cập trang quản trị.</p>
      ${message ? `<div class="notice">${escapeHtml(message)}</div>` : ""}
      <form method="POST" action="/admin/login">
        <input name="token" type="password" placeholder="ADMIN_REFRESH_TOKEN" required />
        <button type="submit">Mở admin</button>
      </form>
    </main>
  </body>
</html>`;
}

export function renderAdminDashboardPage({
  sourceCount,
  enabledSourceCount,
  manualArticleCount,
  recentRunCount,
  subscriberCount,
  telegramConfigured,
  imagesHostedConfigured,
  imagesVariant,
  message,
  appearance
}: AdminDashboardParams): string {
  const sw = themeAppearanceSwitcher(appearance, "/admin");
  return `<!doctype html>
<html lang="vi" data-theme="${appearance}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bảng điều khiển quản trị</title>
    ${themeFontLinks()}
    <style>
      ${themeSemanticVariablesBlock()}
      .adminDashTop { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
      .container { max-width: 1100px; margin: 0 auto; padding: 16px; }
      .hero, .panel, .card { background: var(--surface); border-radius: 16px; box-shadow: var(--shadow); border:1px solid var(--border); }
      .hero { padding: 20px; margin-bottom: 16px; }
      .hero h1, .panel h2 { margin: 0 0 8px; }
      .panel { padding: 16px; margin-bottom: 16px; }
      .stats, .links { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
      .card { padding: 16px; }
      .meta { color: var(--muted); font-size: .92rem; margin: 6px 0 0; }
      .value { font-size: 1.8rem; font-weight: 700; margin: 6px 0; }
      .notice { background: #ecfdf3; color: #027a48; border: 1px solid #abefc6; padding: 10px 12px; border-radius: 12px; margin-top: 12px; }
      .badge { display: inline-block; border-radius: 999px; padding: 6px 10px; font-size: .85rem; font-weight: 600; }
      .badge.ok { background: #ecfdf3; color: #027a48; }
      .badge.off { background: #f2f4f7; color: #344054; }
      .linkCard { display: block; text-decoration: none; color: inherit; }
      .linkCard h3 { margin: 0 0 6px; }
      .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .inlineActions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
      button, .actionLink { font: inherit; border: 0; border-radius: 12px; padding: 10px 14px; background: var(--primary); color: #fff; text-decoration: none; display: inline-block; font-weight:700; }
      .actionLink.secondary { background: #344054; }
      @media (max-width: 640px) {
        .container { padding: 12px; }
        .hero, .panel, .card { border-radius: 14px; }
      }
    </style>
  </head>
  <body class="appBody">
    <main class="container">
      <div class="adminDashTop"><p style="margin:0"><a href="/">← Trang chủ</a></p>${sw}</div>
      <section class="hero">
        <h1>Bảng điều khiển quản trị</h1>
        <p class="meta">Điểm vào quản trị nhanh cho nguồn tin, bài viết thủ công, thông báo, status và cấu hình ảnh.</p>
        <div class="inlineActions">
          <a class="actionLink" href="/admin/sources">Mở CMS nguồn tin</a>
          <a class="actionLink secondary" href="/?lang=vi" target="_blank" rel="noopener noreferrer">Mở homepage</a>
        </div>
        ${message ? `<div class="notice">${escapeHtml(message)}</div>` : ""}
      </section>

      <section class="panel">
        <h2>Tổng quan nhanh</h2>
        <div class="stats">
          <article class="card">
            <div class="meta">Nguồn tin</div>
            <div class="value">${sourceCount}</div>
            <p class="meta">${enabledSourceCount} nguồn đang bật</p>
          </article>
          <article class="card">
            <div class="meta">Bài viết thủ công</div>
            <div class="value">${manualArticleCount}</div>
            <p class="meta">Có thể sửa/xóa trong CMS</p>
          </article>
          <article class="card">
            <div class="meta">Lịch sử crawl gần đây</div>
            <div class="value">${recentRunCount}</div>
            <p class="meta">Số log đang hiển thị</p>
          </article>
          <article class="card">
            <div class="meta">Telegram subscribers</div>
            <div class="value">${subscriberCount}</div>
            <p class="meta">${telegramConfigured ? "Bot notify đã cấu hình" : "Bot notify chưa cấu hình đủ"}</p>
          </article>
        </div>
      </section>

      <section class="panel">
        <h2>Dịch vụ & cấu hình</h2>
        <div class="stats">
          <article class="card">
            <div class="row">
              <h3 style="margin:0;">Telegram notify</h3>
              <span class="badge ${telegramConfigured ? "ok" : "off"}">${telegramConfigured ? "Sẵn sàng" : "Thiếu config"}</span>
            </div>
            <p class="meta">Theo dõi subscriber và phát broadcast từ trang notify.</p>
          </article>
          <article class="card">
            <div class="row">
              <h3 style="margin:0;">Cloudflare Images Hosted</h3>
              <span class="badge ${imagesHostedConfigured ? "ok" : "off"}">${imagesHostedConfigured ? "Đang bật" : "Đang fallback R2"}</span>
            </div>
            <p class="meta">Variant hiện tại: <code>${escapeHtml(imagesVariant)}</code></p>
            <p class="meta">${
              imagesHostedConfigured
                ? "Thumbnail tối ưu sẽ ưu tiên imagedelivery.net."
                : "Cần set CF_IMAGES_ACCOUNT_HASH để URL ảnh chuyển sang imagedelivery.net."
            }</p>
          </article>
        </div>
      </section>

      <section class="panel">
        <h2>Đi tới từng khu vực</h2>
        <div class="links">
          <a class="card linkCard" href="/admin/sources">
            <h3>CMS nguồn tin & bài viết</h3>
            <p class="meta">Thêm feed URL, nhập bài viết tay, sửa/xóa nội dung và vận hành crawler.</p>
          </a>
          <a class="card linkCard" href="/notify">
            <h3>Notify / Telegram</h3>
            <p class="meta">Kiểm tra bot, deep link và trạng thái subscriber.</p>
          </a>
          <a class="card linkCard" href="/status">
            <h3>Trạng thái</h3>
            <p class="meta">Xem health feed, AI summarizer và nhịp cập nhật hệ thống.</p>
          </a>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

export function renderAdminSourcesPage({ sources, runs, manualArticles, message, appearance }: AdminPageParams): string {
  const sw = themeAppearanceSwitcher(appearance, "/admin/sources");
  const renderSourceCard = (source: NewsSourceRecord) => `
      <article class="card">
        <div class="row top">
          <div>
            <h3>${escapeHtml(source.name)}</h3>
            <p class="meta">${escapeHtml(source.type)} • ${source.enabled ? "Đang bật" : "Đang tắt"}${
              isVietstockSource(source) ? ` • ${escapeHtml(getVietstockTopicLabel(source))}` : ""
            }</p>
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
          <form method="POST" action="/admin/sources/${encodeURIComponent(source.id)}/toggle">
            <button type="submit">${source.enabled ? "Tắt nguồn" : "Bật nguồn"}</button>
          </form>
          ${
            source.isDefault
              ? '<span class="defaultTag">Nguồn mặc định</span>'
              : `<form method="POST" action="/admin/sources/${encodeURIComponent(source.id)}/delete" onsubmit="return confirm('Xoá nguồn tuỳ chỉnh này?');"><button class="danger" type="submit">Xoá</button></form>`
          }
        </div>
      </article>
    `;

  const groupedSourceSections = buildSourceGroups(sources)
    .map(
      (group) => `
        <section class="sourceGroup">
          <div class="row top">
            <div>
              <h3 style="margin:0;">${escapeHtml(group.label)}</h3>
              <p class="meta">${group.sources.length} nguồn</p>
            </div>
          </div>
          <div class="cards">${group.sources.map(renderSourceCard).join("")}</div>
        </section>
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

  const manualArticleCards = manualArticles
    .map(
      (article) => `
      <article class="card">
        <div class="row top">
          <div>
            <h3>${escapeHtml(article.title)}</h3>
            <p class="meta">${escapeHtml(article.sourceName)} • ${escapeHtml(article.publishedAt)}</p>
          </div>
          <span class="badge ok">Manual</span>
        </div>
        <form method="POST" action="/admin/articles/manual/${article.id}" class="stack" style="margin-top:12px;">
          <label>Tiêu đề
            <input name="title" value="${escapeHtml(article.title)}" required />
          </label>
          <label>URL
            <input name="url" value="${escapeHtml(article.url)}" required />
          </label>
          <label>Nguồn hiển thị
            <input name="sourceName" value="${escapeHtml(article.sourceName)}" />
          </label>
          <label>Ảnh đại diện
            <input name="imageUrl" value="${escapeHtml(article.imageUrl ?? "")}" />
          </label>
          <label>Ngày giờ xuất bản (ISO)
            <input name="publishedAt" value="${escapeHtml(article.publishedAt)}" />
          </label>
          <label>Snippet
            <textarea name="snippet">${escapeHtml(article.snippet)}</textarea>
          </label>
          <label>Tóm tắt tiếng Việt
            <textarea name="summaryVi">${escapeHtml(article.summaryVi ?? "")}</textarea>
          </label>
          <div class="actions">
            <button type="submit">Lưu chỉnh sửa</button>
          </div>
        </form>
        <div class="actions">
          <form method="POST" action="/admin/articles/manual/${article.id}/delete" onsubmit="return confirm('Xoá bài viết thủ công này?');">
              <button class="danger" type="submit">Xoá bài</button>
          </form>
        </div>
      </article>
    `
    )
    .join("");

  return `<!doctype html>
<html lang="vi" data-theme="${appearance}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Quản trị nguồn tin</title>
    ${themeFontLinks()}
    <style>
      ${themeSemanticVariablesBlock()}
      .adminSrcTop { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
      .container { max-width: 1080px; margin: 0 auto; padding: 16px; }
      .hero, .panel, .card { background: var(--surface); border-radius: 16px; box-shadow: var(--shadow); border:1px solid var(--border); }
      .hero { padding: 18px; margin-bottom: 16px; }
      .hero h1 { margin: 0 0 8px; font-size: 1.35rem; }
      .hero p, .panel p, .card p { margin: 6px 0; }
      .notice { background: #ecfdf3; color: #027a48; border: 1px solid #abefc6; padding: 10px 12px; border-radius: 12px; margin-top: 10px; }
      .panel { padding: 16px; margin-bottom: 16px; }
      .grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 16px; align-items: start; }
      .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
      .sourceGroup { display:grid; gap: 12px; margin-top: 14px; }
      .sourceGroup:first-child { margin-top: 0; }
      .card { padding: 14px; }
      .row { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
      .top { align-items: start; }
      .stack { display: grid; gap: 4px; margin-top: 10px; }
      .meta, .hint, .defaultTag { color: var(--muted); font-size: .9rem; }
      .badge { border-radius: 999px; padding: 6px 10px; font-size: .85rem; font-weight: 600; }
      .badge.ok { background: #ecfdf3; color: #027a48; }
      .badge.off { background: #f2f4f7; color: #344054; }
      form { margin: 0; }
      .formGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      label { display: grid; gap: 6px; font-size: .95rem; }
      input, select, textarea, button { font: inherit; }
      input, select, textarea { border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px; background: var(--surface2); color: var(--text); }
      textarea { min-height: 96px; resize: vertical; }
      button { border: 0; border-radius: 12px; padding: 10px 14px; background: var(--primary); color: #fff; cursor: pointer; font-weight:700; }
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
  <body class="appBody">
    <main class="container">
      <div class="adminSrcTop"><p style="margin:0"><a href="/admin">← Dashboard</a></p>${sw}</div>
      <section class="hero">
        <h1>CMS nguồn tin và bài viết</h1>
        <p>Thêm <code>feed_url</code>, nhập bài viết thủ công, bật/tắt nguồn và theo dõi các lần crawl gần nhất.</p>
        <div class="inlineActions">
          <a href="/admin">Mở dashboard admin</a>
          <a href="/?lang=vi" target="_blank" rel="noopener noreferrer">Mở homepage</a>
          <a href="/notify" target="_blank" rel="noopener noreferrer">Mở notify</a>
          <a href="/status" target="_blank" rel="noopener noreferrer">Mở status</a>
          <a href="/rss/today" target="_blank" rel="noopener noreferrer">Mở RSS feed</a>
          <form method="POST" action="/admin/refresh">
            <button type="submit">Làm mới ngay</button>
          </form>
        </div>
        ${message ? `<div class="notice">${escapeHtml(message)}</div>` : ""}
      </section>
      <section class="grid">
        <div class="panel">
          <h2>Thêm RSS feed nhanh</h2>
          <p class="hint">Form gọn để nhập nhanh một nguồn RSS mới chỉ với tên nguồn và <code>feed_url</code>.</p>
          <form method="POST" action="/admin/rss">
            <div class="formGrid">
              <label>Tên nguồn
                <input name="name" required placeholder="Ví dụ: SSI Research RSS" />
              </label>
              <label>Feed URL
                <input name="feedUrl" required placeholder="https://example.com/feed.xml" />
              </label>
              <label>Base URL
                <input name="baseUrl" placeholder="https://example.com" />
              </label>
              <label>Enabled
                <select name="enabled">
                  <option value="true">Có</option>
                  <option value="false">Không</option>
                </select>
              </label>
            </div>
            <div class="inlineActions">
              <button type="submit">Thêm RSS feed</button>
            </div>
          </form>
        </div>
        <div class="panel">
          <h2>Thêm bài viết thủ công</h2>
          <p class="hint">Dùng khi cần đẩy nhanh một bài quan trọng lên trang mà chưa chờ crawler hoặc RSS.</p>
          <form method="POST" action="/admin/articles/manual">
            <div class="formGrid">
              <label>Tiêu đề
                <input name="title" required placeholder="Ví dụ: VNINDEX tăng mạnh cuối phiên" />
              </label>
              <label>URL bài viết
                <input name="url" required placeholder="https://example.com/article" />
              </label>
              <label>Nguồn hiển thị
                <input name="sourceName" placeholder="Ví dụ: Ban biên tập StockNews" />
              </label>
              <label>Ngày giờ xuất bản
                <input name="publishedAt" type="datetime-local" />
              </label>
              <label>Ảnh đại diện
                <input name="imageUrl" placeholder="https://example.com/thumb.jpg" />
              </label>
            </div>
            <label style="margin-top:12px;">Mô tả ngắn / snippet
              <textarea name="snippet" placeholder="1-2 câu ngắn để hiển thị ở card bài viết"></textarea>
            </label>
            <label style="margin-top:12px;">Tóm tắt tiếng Việt
              <textarea name="summaryVi" placeholder="Tóm tắt ngắn nếu muốn hiển thị ngay mà không cần AI sinh lại"></textarea>
            </label>
            <div class="inlineActions">
              <button type="submit">Lưu bài viết thủ công</button>
            </div>
          </form>
        </div>
      </section>
      <section class="grid">
        <div class="panel">
          <h2>Form nguồn nâng cao</h2>
          <p class="hint">Dùng khi cần thêm nguồn HTML list, extractor key, allow crawl hoặc ghi chú vận hành.</p>
          <form method="POST" action="/admin/sources">
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
        <h2>Bài viết thủ công gần đây</h2>
        <div class="cards">${manualArticleCards || "<p>Chưa có bài viết thủ công nào.</p>"}</div>
      </section>
      <section class="panel">
        <h2>Danh sách nguồn</h2>
        ${groupedSourceSections || "<p>Chưa có nguồn nào.</p>"}
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

function buildSourceGroups(sources: NewsSourceRecord[]): Array<{ label: string; sources: NewsSourceRecord[] }> {
  const order = [
    "Vietstock • Chứng khoán & nhận định",
    "Vietstock • Kinh tế vĩ mô & đầu tư",
    "Vietstock • Tài chính ngành",
    "Vietstock • Thế giới",
    "Vietstock • Tài sản số",
    "Nguồn khác"
  ];
  const map = new Map<string, NewsSourceRecord[]>();
  for (const source of sources) {
    const label = isVietstockSource(source) ? getVietstockTopicLabel(source) : "Nguồn khác";
    const current = map.get(label) ?? [];
    current.push(source);
    map.set(label, current);
  }
  return order
    .map((label) => ({ label, sources: (map.get(label) ?? []).sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter((group) => group.sources.length > 0);
}

function isVietstockSource(source: NewsSourceRecord): boolean {
  return source.id.startsWith("vietstock") || (source.baseUrl ?? "").includes("vietstock.vn");
}

function getVietstockTopicLabel(source: NewsSourceRecord): string {
  const id = source.id.toLowerCase();
  if (id.includes("tai-san-so")) return "Vietstock • Tài sản số";
  if (id.includes("chung-khoan-the-gioi") || id.includes("tai-chinh-quoc-te") || id.includes("kinh-te-nganh")) {
    return "Vietstock • Thế giới";
  }
  if (id.includes("ngan-hang") || id.includes("bao-hiem") || id.includes("thue-va-ngan-sach")) {
    return "Vietstock • Tài chính ngành";
  }
  if (id.includes("vi-mo") || id.includes("kinh-te-dau-tu")) {
    return "Vietstock • Kinh tế vĩ mô & đầu tư";
  }
  if (id.includes("nhan-dinh") || id === "vietstock") {
    return "Vietstock • Chứng khoán & nhận định";
  }
  return "Vietstock • Chứng khoán & nhận định";
}
