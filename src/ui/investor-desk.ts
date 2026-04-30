import type { DailyReport, StoredArticle } from "../types";
import type { InvestorDailySnapshot } from "../services/investor-intel";
import { formatVietnamDateDisplay, formatVietnamDateTimeDisplay } from "../utils/date";
import { LOGO_URL } from "./brand";
import { themeAppearanceSwitcher, themeFontLinks, themeSemanticVariablesBlock, type Appearance } from "./theme";
import { LIVE_FEED_BAR_STYLES, renderLiveFeedBarHtml, renderLivePollScript, computeLivePollAnchor } from "./live-strip";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(s: string): string {
  return esc(s).replace(/'/g, "&#039;");
}

/** Query cho /portfolio — giữ ngày báo cáo + prefill ô mã */
export function portfolioDeskHref(reportDate: string, extras?: Record<string, string>): string {
  const p = new URLSearchParams();
  if (reportDate) p.set("date", reportDate);
  if (extras) {
    for (const [k, v] of Object.entries(extras)) {
      if (v) p.set(k, v);
    }
  }
  const qs = p.toString();
  return qs ? `/portfolio?${qs}` : "/portfolio";
}

type DeskNav = "hub" | "briefing" | "markets" | "portfolio" | "intel";

function deskShell(params: {
  title: string;
  nav: DeskNav;
  inner: string;
  subtitle?: string;
  appearance: Appearance;
  returnPath: string;
}): string {
  const { title, nav, inner, subtitle, appearance, returnPath } = params;
  const nextPath = returnPath.startsWith("/") && !returnPath.startsWith("//") ? returnPath : "/desk";
  const sw = themeAppearanceSwitcher(appearance, nextPath);
  const link = (id: DeskNav, href: string, label: string) =>
    `<a class="deskNavItem ${nav === id ? "active" : ""}" href="${href}">${esc(label)}</a>`;
  return `<!DOCTYPE html>
<html lang="vi" data-theme="${appearance}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} • Desk</title>
  <link rel="icon" type="image/png" href="${LOGO_URL}" />
  ${themeFontLinks()}
  <style>
    ${themeSemanticVariablesBlock()}
    * { box-sizing: border-box; }
    body.appBody.deskBody {
      min-height: 100vh;
      background: var(--desk-hero-grad);
      -webkit-font-smoothing: antialiased;
    }
    .deskTop {
      position: sticky; top: 0; z-index: 50;
      backdrop-filter: blur(16px);
      background: color-mix(in srgb, var(--bg) 78%, transparent);
      border-bottom: 1px solid var(--border);
    }
    .deskTopInner {
      max-width: 1200px; margin: 0 auto; padding: 14px 20px;
      display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    }
    .deskBrand {
      display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--text);
    }
    .deskBrand img { width: 40px; height: 40px; border-radius: 10px; }
    .deskBrand h1 {
      font-family: Montserrat, Inter, system-ui, sans-serif; font-weight: 700; font-size: 1.35rem; margin: 0; letter-spacing: -0.02em;
    }
    .deskBrand span { font-size: .78rem; color: var(--muted); display: block; margin-top: 2px; }
    .deskNav { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .deskNavItem {
      padding: 8px 14px; border-radius: 999px; font-size: .82rem; font-weight: 600;
      color: var(--muted); text-decoration: none; border: 1px solid transparent;
    }
    .deskNavItem:hover { color: var(--text); border-color: var(--border); }
    html[data-theme="dark"] .deskNavItem.active {
      color: #0a0a0a; background: linear-gradient(135deg, #fff, #e2e8f0); border-color: rgba(255,255,255,.35);
    }
    html[data-theme="light"] .deskNavItem.active {
      color: #0f172a; background: linear-gradient(135deg, #fff, #e2e8f0); border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
    }
    .deskMain { max-width: 1200px; margin: 0 auto; padding: 22px 20px 48px; }
    .deskHero {
      margin-bottom: 22px;
    }
    .deskHero h2 {
      font-family: Montserrat, Inter, system-ui, sans-serif; font-weight: 700; font-size: clamp(1.5rem, 4vw, 2.1rem);
      margin: 0 0 8px; letter-spacing: -0.03em;
    }
    .deskHero p { margin: 0; color: var(--muted); max-width: 62ch; line-height: 1.55; font-size: .95rem; }
    .deskGrid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;
    }
    .deskCard {
      background: color-mix(in srgb, var(--surface2) 92%, transparent); border: 1px solid var(--border); border-radius: 16px;
      padding: 16px 18px; box-shadow: var(--shadow);
    }
    .deskCard h3 { margin: 0 0 10px; font-size: .72rem; text-transform: uppercase; letter-spacing: .14em; color: var(--muted); font-weight: 600; }
    .deskCard .big { font-size: 2rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .deskCard .accent { color: var(--accent); }
    .deskCard .cyan { color: var(--cyan); }
    .deskList { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .deskList li { font-size: .88rem; color: color-mix(in srgb, var(--text) 82%, var(--muted)); line-height: 1.4; }
    .deskList a { color: var(--cyan); text-decoration: none; }
    .deskList a:hover { text-decoration: underline; }
    .meter {
      height: 10px; border-radius: 999px; background: color-mix(in srgb, var(--muted) 22%, transparent); overflow: hidden; margin-top: 10px;
    }
    .meter > span {
      display: block; height: 100%;
      background: linear-gradient(90deg, var(--neg), var(--warning), var(--pos));
      border-radius: 999px;
    }
    .sectorRow { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: .86rem; }
    .sectorBar { flex: 1; height: 6px; border-radius: 99px; background: color-mix(in srgb, var(--muted) 18%, transparent); overflow: hidden; }
    .sectorBar > i { display: block; height: 100%; background: linear-gradient(90deg, var(--cyan), var(--accent)); border-radius: 99px; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; padding: 10px 18px;
      border-radius: 12px; font-weight: 600; font-size: .88rem; border: 0; cursor: pointer;
      background: linear-gradient(135deg, #fff, #e2e8f0); color: #0f172a; text-decoration: none;
    }
    .btn.secondary { background: transparent; color: var(--text); border: 1px solid var(--border); }
    form.deskForm { display: grid; gap: 10px; margin-top: 12px; }
    form.deskForm input {
      width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border);
      background: color-mix(in srgb, var(--surface2) 88%, var(--bg)); color: var(--text); font: inherit;
    }
    .pill { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: .72rem; font-weight: 700; background: rgba(34,211,238,.15); color: var(--cyan); }
    .prose { color: color-mix(in srgb, var(--text) 88%, var(--muted)); line-height: 1.65; font-size: .92rem; }
    .prose p { margin: 0 0 12px; }
    ${LIVE_FEED_BAR_STYLES}
    .portfolioOnboarding {
      border: 1px solid color-mix(in srgb, var(--cyan) 40%, var(--border));
      background: color-mix(in srgb, var(--cyan) 10%, var(--surface2));
      margin-bottom: 16px;
    }
    .portfolioOnboarding > h3 {
      text-transform: none; letter-spacing: 0; font-size: 1.08rem; color: var(--text);
      margin: 0 0 12px;
    }
    .onboardingLead { margin: 0 0 12px; color: var(--muted); font-size: .9rem; line-height: 1.5; }
    .onboardingSteps { margin: 0; padding-left: 22px; color: color-mix(in srgb, var(--text) 92%, var(--muted)); line-height: 1.6; font-size: .9rem; }
    .onboardingSteps li { margin: 10px 0; }
    .onboardingSteps strong { color: var(--text); }
    .onboardingQuick { margin-top: 14px; font-size: .84rem; color: var(--muted); display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
    .onboardingQuick span { font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-size: .72rem; color: var(--muted); width: 100%; }
    .onboardingChip {
      display: inline-flex; align-items: center; padding: 7px 12px; border-radius: 999px;
      border: 1px solid var(--border); background: color-mix(in srgb, var(--surface2) 94%, var(--bg));
      color: var(--cyan); font-weight: 600; font-size: .82rem; text-decoration: none;
    }
    .onboardingChip:hover { border-color: color-mix(in srgb, var(--cyan) 45%, var(--border)); color: var(--text); text-decoration: none; }
    .onboardingActions { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .portfolioFormAccent { outline: 2px solid color-mix(in srgb, var(--cyan) 35%, transparent); outline-offset: 2px; }
  </style>
</head>
<body class="appBody deskBody">
  <header class="deskTop">
    <div class="deskTopInner">
      <a class="deskBrand" href="/desk">
        <img src="${LOGO_URL}" alt="" width="40" height="40" />
        <div><h1>StockNews Desk</h1><span>${esc(subtitle ?? "Nhịp quyết định cho nhà đầu tư")}</span></div>
      </a>
      <nav class="deskNav" aria-label="Desk">
        ${link("hub", "/desk", "Tổng quan")}
        ${link("briefing", "/briefing", "Morning Brief")}
        ${link("markets", "/markets", "Thị trường")}
        ${link("portfolio", "/portfolio", "Portfolio")}
        <a class="deskNavItem" href="/">Bản tin</a>
        ${sw}
      </nav>
    </div>
  </header>
  <main class="deskMain">${inner}</main>
</body>
</html>`;
}

export function renderInvestorHub(params: {
  reportDate: string;
  snap: InvestorDailySnapshot;
  report: DailyReport;
  appearance: Appearance;
}): string {
  const { reportDate, snap, report, appearance } = params;
  const fg = snap.fearGreed;
  const inner = `
    <div class="deskHero">
      <h2>Xin chào, nhà đầu tư.</h2>
      <p>Một nơi để mở nhanh brief sáng, tâm lý thị trường, luân chuyển ngành và dòng tiền proxy — trước khi bạn đọc chi tiết từng tin.</p>
    </div>
    <div class="deskGrid">
      <div class="deskCard">
        <h3>Fear &amp; Greed (VN)</h3>
        <div class="big accent">${fg.value}</div>
        <div style="color:var(--muted);font-size:.88rem;">${esc(fg.labelVi)}</div>
        <div class="meter" aria-hidden="true"><span style="width:${fg.value}%"></span></div>
        <p style="margin:12px 0 0;font-size:.8rem;color:var(--muted);">${esc(fg.detailVi)}</p>
        <a class="btn secondary" href="/markets" style="margin-top:14px;display:inline-flex;">Mở bảng thị trường</a>
      </div>
      <div class="deskCard">
        <h3>Tin hôm nay</h3>
        <div class="big cyan">${snap.articleCount}</div>
        <p style="color:var(--muted);font-size:.88rem;margin:8px 0 0;">${esc(formatVietnamDateDisplay(`${reportDate}T12:00:00+07:00`))}</p>
        <ul class="deskList" style="margin-top:14px;">
          ${snap.topHeadlines
            .slice(0, 4)
            .map(
              (h) =>
                `<li><span class="pill">${h.impact}</span> <a href="${escAttr(h.url)}" target="_blank" rel="noopener noreferrer">${esc(h.title)}</a></li>`
            )
            .join("")}
        </ul>
      </div>
      <div class="deskCard">
        <h3>Luân chuyển ngành</h3>
        <p style="color:var(--muted);font-size:.82rem;margin:0 0 10px;">Tổng hợp từ tiêu đề/tin (heuristic).</p>
        ${snap.sectors
          .slice(0, 5)
          .map(
            (s) => `<div class="sectorRow"><span style="min-width:108px;">${esc(s.labelVi)}</span><div class="sectorBar"><i style="width:${Math.min(
              100,
              s.sharePct * 3
            )}%"></i></div><span style="width:42px;text-align:right;color:var(--muted);">${s.sharePct}%</span></div>`
          )
          .join("")}
        <a class="btn secondary" href="/markets#sectors" style="margin-top:14px;display:inline-flex;">Chi tiết sector</a>
      </div>
      <div class="deskCard">
        <h3>Smart money (proxy)</h3>
        <p style="color:var(--muted);font-size:.82rem;margin:0 0 10px;">Top khối lượng HSX — không phải dữ liệu tick-by-tick.</p>
        <ul class="deskList">
          ${snap.smartMoney
            .slice(0, 6)
            .map((m) => `<li><strong>${esc(m.symbol)}</strong> · KL ${esc(m.volume)} · ${esc(m.ratioPct)}</li>`)
            .join("")}
        </ul>
        <a class="btn secondary" href="/markets#flow" style="margin-top:14px;display:inline-flex;">Mở tracker</a>
      </div>
    </div>
    <div style="margin-top:22px;display:flex;flex-wrap:wrap;gap:10px;">
      <a class="btn" href="/briefing">Morning Brief đầy đủ</a>
      <a class="btn secondary" href="${escAttr(portfolioDeskHref(reportDate, { prefill: "VNM,FPT,HPG" }))}">Cá nhân hóa Portfolio</a>
    </div>
    <div class="deskCard" style="margin-top:22px;">
      <h3>Tổng quan AI (trích)</h3>
      <div class="prose">${esc(report.overviewVi).slice(0, 520)}${report.overviewVi.length > 520 ? "…" : ""}</div>
    </div>
  `;
  return deskShell({ title: "Desk", nav: "hub", inner, subtitle: formatVietnamDateDisplay(`${reportDate}T12:00:00+07:00`), appearance, returnPath: "/desk" });
}

export function renderMorningBriefing(params: {
  reportDate: string;
  report: DailyReport;
  snap: InvestorDailySnapshot;
  appearance: Appearance;
}): string {
  const { reportDate, report, snap, appearance } = params;
  const inner = `
    <div class="deskHero">
      <h2>Morning Briefing</h2>
      <p>Tóm tắt phiên &amp; luồng tin trong ngày ${esc(formatVietnamDateDisplay(`${reportDate}T12:00:00+07:00`))}. Cập nhật theo cron; không phải khuyến nghị mua/bán.</p>
    </div>
    <div class="deskGrid">
      <div class="deskCard" style="grid-column:1/-1;">
        <h3>Executive summary</h3>
        <div class="prose">
          <p><strong>Tổng quan.</strong> ${esc(report.overviewVi)}</p>
          <p><strong>Outlook.</strong> ${esc(report.outlookVi)}</p>
          <p><strong>Giả định.</strong> ${esc(report.assumptionsVi || "—")}</p>
        </div>
      </div>
      <div class="deskCard">
        <h3>Chỉ số tâm lý</h3>
        <div class="big accent">${snap.fearGreed.value}</div>
        <p style="color:var(--muted);">${esc(snap.fearGreed.labelVi)}</p>
        <div class="meter" aria-hidden="true"><span style="width:${snap.fearGreed.value}%"></span></div>
      </div>
      <div class="deskCard">
        <h3>Tin ưu tiên đọc</h3>
        <ul class="deskList">
          ${snap.topHeadlines
            .map(
              (h) =>
                `<li><span class="pill">${h.impact}</span> <a href="${escAttr(h.url)}" target="_blank" rel="noopener noreferrer">${esc(h.title)}</a></li>`
            )
            .join("")}
        </ul>
      </div>
    </div>
    <p style="margin-top:20px;color:var(--muted);font-size:.8rem;">This is not financial advice.</p>
  `;
  return deskShell({ title: "Morning Briefing", nav: "briefing", inner, appearance, returnPath: "/briefing" });
}

export function renderMarketsDesk(params: { reportDate: string; snap: InvestorDailySnapshot; appearance: Appearance }): string {
  const { snap, appearance } = params;
  const inner = `
    <div class="deskHero" id="fg">
      <h2>Thị trường &amp; dòng tiền</h2>
      <p>Fear &amp; Greed heuristic, luân chuyển ngành và top khối lượng (proxy smart money).</p>
    </div>
    <div class="deskGrid">
      <div class="deskCard" style="grid-column:1/-1;">
        <h3>Fear &amp; Greed • VN</h3>
        <div style="display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;">
          <div class="big accent">${snap.fearGreed.value}</div>
          <div><div style="font-weight:700;">${esc(snap.fearGreed.labelVi)}</div><div style="color:var(--muted);font-size:.86rem;max-width:52ch;">${esc(
            snap.fearGreed.detailVi
          )}</div></div>
        </div>
        <div class="meter" style="max-width:520px" aria-hidden="true"><span style="width:${snap.fearGreed.value}%"></span></div>
      </div>
      <div class="deskCard" id="sectors" style="grid-column:1/-1;">
        <h3>Sector rotation</h3>
        ${snap.sectors
          .map(
            (s) => `<div class="sectorRow"><span style="min-width:140px;">${esc(s.labelVi)}</span><div class="sectorBar"><i style="width:${Math.min(
              100,
              Math.max(6, s.sharePct * 2.5)
            )}%"></i></div><span style="width:120px;text-align:right;color:var(--muted);">${s.count} tin · ${s.sharePct}%</span></div>`
          )
          .join("")}
      </div>
      <div class="deskCard" id="flow" style="grid-column:1/-1;">
        <h3>Smart money tracker (proxy)</h3>
        <p style="color:var(--muted);font-size:.86rem;">Dữ liệu HSX public API — thể hiện mã được giao dịch mạnh, không phải lệnh khối ngoại chi tiết.</p>
        <ul class="deskList">
          ${snap.smartMoney
            .map((m) => `<li><strong>${esc(m.symbol)}</strong> — ${esc(m.volume)} — ${esc(m.ratioPct)}</li>`)
            .join("")}
        </ul>
      </div>
    </div>
  `;
  return deskShell({ title: "Thị trường", nav: "markets", inner, appearance, returnPath: "/markets" });
}

export function renderPortfolioDesk(params: {
  reportDate: string;
  symbols: string[];
  articles: StoredArticle[];
  impactFn: (a: StoredArticle) => number;
  flash?: string;
  appearance: Appearance;
  showOnboarding?: boolean;
  /** Giá trị hiển thị trong ô nhập (đã có mã trong cookie hoặc prefill từ URL) */
  formInputValue: string;
}): string {
  const { reportDate, symbols, articles, impactFn, flash, appearance, showOnboarding = false, formInputValue } = params;
  const rows = articles
    .slice(0, 40)
    .map((a) => {
      const impact = impactFn(a);
      return `<tr><td><span class="pill">${impact}</span></td><td><a href="${escAttr(a.url)}" target="_blank" rel="noopener noreferrer" style="color:var(--cyan);text-decoration:none;">${esc(
        a.title
      )}</a></td><td style="color:var(--muted);font-size:.82rem;">${esc(a.sourceName)}</td></tr>`;
    })
    .join("");
  const dismissOnboardingHref = portfolioDeskHref(reportDate, { dismiss_onboarding: "1" });
  const prefillVN = portfolioDeskHref(reportDate, { prefill: "VNM,FPT,HPG" });
  const prefillBank = portfolioDeskHref(reportDate, { prefill: "VCB,CTG,BID" });
  const prefillDnse = portfolioDeskHref(reportDate, { prefill: "SSI,VND,HCM" });

  const onboardingBlock = showOnboarding
    ? `<div class="deskCard portfolioOnboarding">
        <h3>Bắt đầu với Portfolio</h3>
        <p class="onboardingLead">
          Theo dõi tối đa <strong>18 mã</strong> trong cookie trình duyệt (không đăng nhập). Hệ thống lọc tin khi tiêu đề hoặc tóm tắt có nhắc đến mã (theo từ, không phải khuyến nghị mua/bán).
        </p>
        <ol class="onboardingSteps">
          <li>Nhập mã vào ô bên dưới hoặc chọn một gợi ý nhanh để điền sẵn.</li>
          <li>Bấm <strong>Lưu &amp; lọc tin</strong> để lưu danh sách và cập nhật bảng tin.</li>
          <li>Chưa chọn mã thì trang hiển thị <strong>tất cả</strong> tin trong ngày (mặc định).</li>
        </ol>
        <div class="onboardingQuick">
          <span>Gợi ý nhanh</span>
          <a class="onboardingChip" href="${escAttr(prefillVN)}">VNM, FPT, HPG</a>
          <a class="onboardingChip" href="${escAttr(prefillBank)}">Nhóm NH: VCB, CTG, BID</a>
          <a class="onboardingChip" href="${escAttr(prefillDnse)}">Chứng khoán: SSI, VND, HCM</a>
        </div>
        <div class="onboardingActions">
          <a class="btn secondary" href="${escAttr(dismissOnboardingHref)}">Đã hiểu — ẩn hướng dẫn</a>
        </div>
      </div>`
    : "";

  const inner = `
    <div class="deskHero">
      <h2>Portfolio mode</h2>
      <p>Lọc tin theo mã trong danh sách theo dõi (cookie trình duyệt, tối đa 18 mã). Không lưu tài khoản đăng nhập.</p>
    </div>
    ${onboardingBlock}
    ${flash ? `<div class="deskCard" style="border-color:rgba(34,211,238,.35);margin-bottom:14px;">${esc(flash)}</div>` : ""}
    <div class="deskGrid">
      <div class="deskCard ${showOnboarding ? "portfolioFormAccent" : ""}" style="grid-column:1/-1;">
        <h3>Danh sách theo dõi</h3>
        <form class="deskForm" method="POST" action="/portfolio">
          <label style="color:var(--muted);font-size:.82rem;">Nhập mã, cách nhau bởi dấu phẩy hoặc khoảng trắng (VD: VNM, FPT, HPG)</label>
          <input name="symbols" type="text" value="${escAttr(formInputValue)}" placeholder="VNM, FPT, HPG" autocomplete="off" />
          <button class="btn" type="submit">Lưu &amp; lọc tin</button>
        </form>
      </div>
      <div class="deskCard" style="grid-column:1/-1;">
        <h3>Tin phù hợp ${symbols.length ? `(${articles.length} mục)` : "(chưa lọc — toàn bộ)"}</h3>
        <p style="color:var(--muted);font-size:.82rem;">Ngày ${esc(reportDate)} · điểm hiển thị là proxy độ nổi bật, không phải khuyến nghị.</p>
        <div style="overflow:auto;margin-top:10px;">
          <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
            <thead><tr style="text-align:left;color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;"><th style="padding:8px 6px;">Điểm</th><th style="padding:8px 6px;">Tiêu đề</th><th style="padding:8px 6px;">Nguồn</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="3" style="padding:12px;color:var(--muted);">Không có tin khớp mã — thử bỏ bớt mã hoặc chọn ngày khác.</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    </div>
    ${renderLiveFeedBarHtml()}
    ${renderLivePollScript({
      reportDate,
      anchorPublishedAt: computeLivePollAnchor(articles),
      mode: "portfolio"
    })}
  `;
  return deskShell({ title: "Portfolio", nav: "portfolio", inner, appearance, returnPath: "/portfolio" });
}

export function renderIntelArchive(params: { dates: string[]; appearance: Appearance }): string {
  const { dates, appearance } = params;
  const inner = `
    <div class="deskHero">
      <h2>Historical intelligence</h2>
      <p>Mỗi phiên hệ thống lưu snapshot JSON trên R2 (nếu bucket ASSETS bật) và chỉ mục ngày trên KV. Dùng cho so sánh tâm lý / sector theo thời gian.</p>
    </div>
    <div class="deskCard" style="max-width:720px;">
      <h3>Ngày đã lưu</h3>
      <ul class="deskList">
        ${dates.length
          ? dates
              .map(
                (d) =>
                  `<li><a href="/api/intel/daily?date=${escAttr(d)}">${esc(d)}</a> · <span style="color:var(--muted);">JSON snapshot</span></li>`
              )
              .join("")
          : `<li style="color:var(--muted);">Chưa có snapshot — chờ cron sau vài phiên hoặc kiểm tra binding R2 ASSETS.</li>`}
      </ul>
    </div>
  `;
  return deskShell({ title: "Intel Archive", nav: "intel", inner, appearance, returnPath: "/intel" });
}
