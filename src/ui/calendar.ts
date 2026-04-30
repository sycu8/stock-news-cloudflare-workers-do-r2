import type { CalendarEventType, MarketCalendarEvent } from "../services/market-calendar";
import { formatVietnamDateDisplay } from "../utils/date";
import { themeAppearanceSwitcher, themeFontLinks, themeSemanticVariablesBlock, type Appearance } from "./theme";

const TYPE_LABEL: Record<CalendarEventType, string> = {
  dividend: "Chia cổ tức",
  agm: "Họp ĐHCĐ",
  earnings: "Ngày công bố KQKD",
  etf_review: "Rà soát danh mục ETF",
  derivatives_expiry: "Đáo hạn phái sinh"
};

export function renderCalendarPage(events: MarketCalendarEvent[], reportDate: string, appearance: Appearance = "light"): string {
  const items = events
    .map((ev) => {
      const badge = TYPE_LABEL[ev.type] ?? ev.type;
      const source = ev.sourceUrl
        ? `<a href="${escapeAttr(ev.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ev.sourceName ?? "Nguồn tin")}</a>`
        : '<span class="muted">Hệ thống</span>';
      return `<article class="eventCard">
        <div class="eventTop">
          <span class="typeBadge">${escapeHtml(badge)}</span>
          <span class="conf ${ev.confidence}">${ev.confidence === "high" ? "Cao" : "Trung bình"}</span>
        </div>
        <h3>${escapeHtml(ev.title)}</h3>
        <p class="meta">${escapeHtml(formatVietnamDateDisplay(`${ev.date}T00:00:00.000Z`))}</p>
        <p class="meta">Nguồn: ${source}</p>
      </article>`;
    })
    .join("");
  const calNext = `/calendar?date=${encodeURIComponent(reportDate)}`;
  const sw = themeAppearanceSwitcher(appearance, calNext);

  return `<!doctype html><html lang="vi" data-theme="${appearance}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Lịch thị trường</title>
  <meta name="description" content="Lịch sự kiện thị trường chứng khoán: cổ tức, ĐHCĐ, KQKD, ETF review và đáo hạn phái sinh." />
  ${themeFontLinks()}
  <style>
    ${themeSemanticVariablesBlock()}
    .calTop{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:10px}
    .wrap{max-width:980px;margin:0 auto;padding:16px}
    .card,.eventCard{background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow)}
    .card{padding:14px;margin-bottom:12px}
    .list{display:grid;gap:10px}
    .eventCard{padding:12px}
    .eventTop{display:flex;justify-content:space-between;align-items:center;gap:8px}
    .typeBadge{display:inline-flex;padding:4px 9px;border-radius:999px;background:rgba(21,94,239,.1);border:1px solid rgba(21,94,239,.25);font-size:.8rem;font-weight:700}
    .conf{font-size:.76rem;padding:3px 8px;border-radius:999px;border:1px solid var(--border);color:var(--muted)}
    .conf.high{background:#ecfdf3;color:#027a48;border-color:#abefc6}
    .meta{color:var(--muted);font-size:.9rem}
    a{color:var(--primary);text-decoration:none}
    a:hover{text-decoration:underline}
    button,a,input,select{min-height:var(--control-h);min-width:var(--control-h)}
    h3{margin:8px 0}
  </style></head><body class="appBody"><main class="wrap">
    <section class="card">
      <div class="calTop"><p style="margin:0"><a href="/">← Trang chủ</a></p>${sw}</div>
      <h1>Lịch sự kiện thị trường</h1>
      <p class="meta">Sắp xếp theo thời gian diễn biến. Mốc tham chiếu ngày dữ liệu: ${escapeHtml(reportDate)}.</p>
      <p class="meta">Bao gồm: Chia cổ tức, Họp ĐHCĐ, Ngày công bố KQKD, Rà soát danh mục ETF, Đáo hạn phái sinh.</p>
    </section>
    <section class="list">${items || '<div class="card"><p class="meta">Chưa có sự kiện phù hợp trong khung thời gian này.</p></div>'}</section>
  </main></body></html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(input: string): string {
  return escapeHtml(input);
}
