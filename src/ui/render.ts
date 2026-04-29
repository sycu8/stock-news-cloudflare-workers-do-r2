import type { CafeFMarketSnapshot, DailyReport, HSXMarketSnapshot, MediaItemRecord, ReportHistoryEntry, StoredArticle } from "../types";
import { LOGO_URL } from "./brand";
import { formatVietnamDateDisplay, formatVietnamDateTimeDisplay, formatVietnamTimeDisplay } from "../utils/date";
import { classifySentimentText } from "../services/sentiment";

interface HomePageParams {
  dateLabel: string;
  report: DailyReport;
  mediaItems?: MediaItemRecord[];
  marketSnapshot?: CafeFMarketSnapshot | null;
  hsxMarketSnapshot?: HSXMarketSnapshot | null;
  reportHistory?: ReportHistoryEntry[];
  pinnedArticles?: StoredArticle[];
  articles: StoredArticle[];
  availableSources: string[];
  selectedSource?: string;
  selectedSentiment?: "positive" | "neutral" | "negative";
  chartsHtml?: string;
  hotKeywords?: string[];
  canonicalUrl?: string;
  reportDate?: string;
  q?: string;
  page?: number;
  total?: number;
  pageSize?: number;
  updatedAt?: string | null;
  cacheStatus?: "hit" | "miss";
}

export function renderHomePage({
  dateLabel,
  report,
  mediaItems = [],
  marketSnapshot = null,
  hsxMarketSnapshot = null,
  reportHistory = [],
  pinnedArticles = [],
  articles,
  availableSources,
  selectedSource,
  selectedSentiment,
  chartsHtml = "",
  hotKeywords = [],
  canonicalUrl = ""
  ,
  reportDate = "",
  q = "",
  page = 1,
  total = 0,
  pageSize = 12,
  updatedAt = null,
  cacheStatus = "miss"
}: HomePageParams): string {
  const sourceOptions = availableSources
    .map((source) => `<option value="${escapeHtml(source)}" ${selectedSource === source ? "selected" : ""}>${escapeHtml(source)}</option>`)
    .join("");
  const pinnedCards = pinnedArticles
    .map(
      (article, idx) => `
        <article class="card cardPinned">
          <div class="pinRow">
            <span class="pinBadge">Hot</span>
            <p class="meta">${escapeHtml(article.sourceName)} • ${escapeHtml(formatVietnamDateDisplay(article.publishedAt))}</p>
          </div>
          ${renderResponsiveImage(article.imageUrl || LOGO_URL, "cardThumb", article.title, {
            width: 1200,
            height: 675,
            loading: idx === 0 ? "eager" : "lazy",
            fetchpriority: idx === 0 ? "high" : "auto",
            sizes: "(max-width: 768px) 100vw, 33vw"
          })}
          <h3>${
            (article as StoredArticle & { detailUrl?: string }).detailUrl
              ? `<a href="${escapeAttribute((article as StoredArticle & { detailUrl?: string }).detailUrl ?? "#")}">${escapeHtml(article.title)}</a>`
              : escapeHtml(article.title)
          }</h3>
          ${renderSentimentBadge((article as StoredArticle & { sentimentLabel?: string }).sentimentLabel ?? classifySentimentText(`${article.title} ${article.summaryVi ?? ""} ${article.snippet}`).label)}
          ${renderConfirmationBadge(article)}
          ${renderMergedSources(article)}
          <p class="summary">${escapeHtml(article.summaryVi ?? article.snippet)}</p>
          ${
            article.contentLimited
              ? '<p class="tag">Tóm tắt dữ liệu bị giới hạn (chỉ từ tiêu đề/snippet).</p>'
              : ""
          }
          <a class="source-link" href="${escapeAttribute((article as StoredArticle & { sourceUrl?: string }).sourceUrl ?? article.url)}" target="_blank" rel="noopener noreferrer"><span>Tài liệu nguồn gốc</span></a>
        </article>
      `
    )
    .join("");

  const cards = articles
    .map(
      (article, idx) => `
        <article class="card">
          <p class="meta">${escapeHtml(article.sourceName)} • ${escapeHtml(formatVietnamDateDisplay(article.publishedAt))}</p>
          ${renderResponsiveImage(article.imageUrl || LOGO_URL, "cardThumb", article.title, {
            width: 1200,
            height: 675,
            loading: idx === 0 && pinnedArticles.length === 0 ? "eager" : "lazy",
            fetchpriority: idx === 0 && pinnedArticles.length === 0 ? "high" : "auto",
            sizes: "(max-width: 768px) 100vw, 33vw"
          })}
          <h3>${
            (article as StoredArticle & { detailUrl?: string }).detailUrl
              ? `<a href="${escapeAttribute((article as StoredArticle & { detailUrl?: string }).detailUrl ?? "#")}">${escapeHtml(article.title)}</a>`
              : escapeHtml(article.title)
          }</h3>
          ${renderSentimentBadge((article as StoredArticle & { sentimentLabel?: string }).sentimentLabel ?? classifySentimentText(`${article.title} ${article.summaryVi ?? ""} ${article.snippet}`).label)}
          ${renderConfirmationBadge(article)}
          ${renderMergedSources(article)}
          <p class="summary">${escapeHtml(article.summaryVi ?? article.snippet)}</p>
          ${
            article.contentLimited
              ? '<p class="tag">Tóm tắt dữ liệu bị giới hạn (chỉ từ tiêu đề/snippet).</p>'
              : ""
          }
          <a class="source-link" href="${escapeAttribute((article as StoredArticle & { sourceUrl?: string }).sourceUrl ?? article.url)}" target="_blank" rel="noopener noreferrer"><span>Tài liệu nguồn gốc</span></a>
        </article>
      `
    )
    .join("");

  const domesticBriefItems = mediaItems
    .filter((item) => isDomesticFinanceBrief(item))
    .slice(0, 6);

  const internationalVnBriefItems = mediaItems
    .filter((item) => isInternationalFinanceBrief(item))
    .slice(0, 6);

  const visualMediaItems = mediaItems
    .filter((item) => !item.sourceId.startsWith("vietstock-brief-") && !item.sourceId.startsWith("derived-brief-"))
    .slice(0, 8);

  const mediaCards = visualMediaItems
    .map(
      (item) => `
        <article class="mediaCard">
          ${
            item.imageUrl
              ? renderResponsiveImage(item.imageUrl, "mediaThumb", item.title, {
                  width: 1200,
                  height: 675,
                  loading: "lazy",
                  fetchpriority: "auto",
                  sizes: "(max-width: 768px) 100vw, 50vw"
                })
              : `<div class="mediaThumb mediaThumbFallback">${item.kind === "youtube" ? "YouTube" : "Tin nhanh"}</div>`
          }
          <div class="mediaBody">
            <p class="meta">${escapeHtml(item.sourceName)} • ${escapeHtml(formatVietnamDateDisplay(item.publishedAt))}</p>
            <h3>${escapeHtml(item.title)}</h3>
            <a href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer">Xem nguồn</a>
          </div>
        </article>
      `
    )
    .join("");

  const domesticBriefBullets = domesticBriefItems
    .map(
      (item) => {
        const briefSentiment = classifySentimentText(`${item.title} ${item.summaryVi}`);
        return `<li><strong>${escapeHtml(item.sourceName)}:</strong> <a href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a><span class="briefTypeBadge domestic">Trong nước</span> ${renderSentimentBadge(briefSentiment.label)}</li>`;
      }
    )
    .join("");

  const internationalBriefBullets = internationalVnBriefItems
    .map((item) => {
      const briefSentiment = classifySentimentText(`${item.title} ${item.summaryVi}`);
      return `<li><strong>${escapeHtml(item.sourceName)}:</strong> <a href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a><span class="briefTypeBadge international">Quốc tế</span> ${renderSentimentBadge(briefSentiment.label)}</li>`;
    })
    .join("");

  const metaDescription = escapeAttribute(
    `Tổng hợp tin tức thị trường chứng khoán Việt Nam mỗi ngày: ${report.overviewVi}`.slice(0, 180)
  );
  const canonical = canonicalUrl ? `<link rel="canonical" href="${escapeAttribute(canonicalUrl)}" />` : "";
  const jsonLd = escapeHtml(
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Tin thị trường chứng khoán Việt Nam",
      url: canonicalUrl || "/",
      inLanguage: "vi",
      description: `Bản tin chứng khoán Việt Nam hằng ngày. ${report.overviewVi}`.slice(0, 200)
    })
  );

  const hotKeywordChips = hotKeywords
    .slice(0, 12)
    .map((k) => {
      const qp = new URLSearchParams();
      if (selectedSource) {
        qp.set("source", selectedSource);
      }
      if (selectedSentiment) {
        qp.set("sentiment", selectedSentiment);
      }
      if (reportDate) {
        qp.set("date", reportDate);
      }
      qp.set("q", k);
      qp.set("page", "1");
      return `<a class="chip" href="/?${qp.toString()}">${escapeHtml(k)}</a>`;
    })
    .join("");

  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 12)));
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const baseParams = new URLSearchParams();
  if (selectedSource) baseParams.set("source", selectedSource);
  if (selectedSentiment) baseParams.set("sentiment", selectedSentiment);
  if (reportDate) baseParams.set("date", reportDate);
  if (q) baseParams.set("q", q);

  const prevHref = (() => {
    const p = new URLSearchParams(baseParams);
    p.set("page", String(prevPage));
    return `/?${p.toString()}`;
  })();
  const nextHref = (() => {
    const p = new URLSearchParams(baseParams);
    p.set("page", String(nextPage));
    return `/?${p.toString()}`;
  })();
  const marketOverviewChips = (marketSnapshot?.overviewItems ?? [])
    .map((item) => `<span class="chip chipStatic">${escapeHtml(item)}</span>`)
    .join("");
  const curatedCafeFLinks = buildCuratedCafeFLinks(marketSnapshot);
  const curatedCafeFHtml = curatedCafeFLinks
    .map(
      (item) =>
        `<a class="cafefLinkCard" href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer">
          <span class="cafefLinkTitle">${escapeHtml(item.label)}</span>
          <span class="cafefLinkMeta">Mở dữ liệu</span>
        </a>`
    )
    .join("");
  const marketNotes = (marketSnapshot?.notes ?? [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const latestDataStamp = marketSnapshot?.fetchedAt ? formatVietnamDateTimeDisplay(marketSnapshot.fetchedAt) : null;
  const latestMarketVisual = mediaItems.find((item) => Boolean(item.imageUrl)) ?? null;
  const updatedLabel = updatedAt ? formatVietnamTimeDisplay(updatedAt) : null;
  const updatedFullLabel = updatedAt ? formatVietnamDateTimeDisplay(updatedAt) : null;
  const resultsCount = (pinnedArticles?.length ?? 0) + articles.length;
  const autoRefreshCheckUrl = (() => {
    const qp = new URLSearchParams();
    if (reportDate) qp.set("date", reportDate);
    if (selectedSource) qp.set("source", selectedSource);
    return `/api/news/today?${qp.toString()}`;
  })();
  const historySlice = compressHistoryEntries(reportHistory, report).slice(0, 10);
  const historyTabButtons = historySlice
    .map((h, idx) => {
      const prev = historySlice[idx + 1];
      const sentimentScore = h.sentiment?.score ?? 0;
      const prevScore = prev?.sentiment?.score ?? 0;
      const scoreDelta = prev ? sentimentScore - prevScore : 0;
      const deltaLabel = prev ? `${scoreDelta >= 0 ? "+" : ""}${scoreDelta}` : "mốc đầu";
      return `<button type="button" class="historyTabBtn ${idx === 0 ? "active" : ""}" data-tab="history-${idx}">
          <span class="historyDot ${historySentimentClass(sentimentScore)}"></span>
          <span class="historyMain">
            <span class="historyTime">${escapeHtml(formatVietnamTimeDisplay(h.updatedAt))}</span>
            <span class="historyCount">${h.articleCount} tin</span>
          </span>
          <span class="historyDelta ${scoreDelta > 0 ? "up" : scoreDelta < 0 ? "down" : "flat"}">Điểm ${escapeHtml(deltaLabel)}</span>
        </button>`;
    })
    .join("");
  const historyTabPanels = historySlice
    .map((h, idx) => {
      const sentiment = h.sentiment ?? { positive: 0, neutral: 0, negative: 0, score: 0 };
      const total = Math.max(1, sentiment.positive + sentiment.neutral + sentiment.negative);
      const posPct = Math.round((sentiment.positive / total) * 100);
      const neuPct = Math.round((sentiment.neutral / total) * 100);
      const negPct = 100 - posPct - neuPct;
      const needsExpand = [h.overviewVi, h.outlookVi, h.assumptionsVi || ""].some((text) => normalizeText(text).length > 240);
      return `<article class="historyPanel ${idx === 0 ? "active" : ""}" id="history-${idx}">
        <p class="meta">Cập nhật lúc ${escapeHtml(formatVietnamDateTimeDisplay(h.updatedAt))}</p>
        <div class="historyKpis">
          <span class="historyKpi">Tích cực ${posPct}%</span>
          <span class="historyKpi">Trung tính ${neuPct}%</span>
          <span class="historyKpi">Tiêu cực ${negPct}%</span>
          <span class="historyKpi">Điểm ${sentiment.score}</span>
        </div>
        <div class="stackBar" aria-label="History sentiment distribution">
          <span class="seg pos" style="width:${posPct}%"></span>
          <span class="seg neu" style="width:${neuPct}%"></span>
          <span class="seg neg" style="width:${negPct}%"></span>
        </div>
        <div class="historyContentWrap">
          ${renderHistoryTextBlock("Tổng quan", h.overviewVi)}
          ${renderHistoryTextBlock("Outlook", h.outlookVi)}
          ${renderHistoryTextBlock("Giả định", h.assumptionsVi || "Đang cập nhật")}
        </div>
        ${
          needsExpand
            ? `<button type="button" class="historyExpandBtn" data-expand-target="history-${idx}" aria-expanded="false">Xem thêm</button>`
            : ""
        }
      </article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tin Thị Trường Chứng Khoán Việt Nam Hằng Ngày</title>
    <meta name="description" content="${metaDescription}" />
    <link rel="icon" type="image/png" href="${LOGO_URL}" />
    <link rel="apple-touch-icon" href="${LOGO_URL}" />
    ${canonical}
    <meta property="og:title" content="Tin thị trường chứng khoán Việt Nam" />
    <meta property="og:description" content="${metaDescription}" />
    <meta property="og:type" content="website" />
    ${canonicalUrl ? `<meta property="og:url" content="${escapeAttribute(canonicalUrl)}" />` : ""}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <script type="application/ld+json">${jsonLd}</script>
    <style>
      :root { color-scheme: light dark; }
      body { font-family: Montserrat, system-ui, -apple-system, "Segoe UI", Arial, sans-serif; margin: 0; background: #f2f4f7; color: #121926; }
      :root{
        --bg: #f2f4f7;
        --surface: #ffffff;
        --surface2: #ffffff;
        --text: #121926;
        --muted: #475467;
        --border: #eaecf0;
        --shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
        --primary: #175cd3;
        --primary2: #155eef;
        --warning: #f59e0b;
        --pos: #12b76a;
        --neg: #f04438;
        --neu: #98a2b3;
      }
      body { background: var(--bg); color: var(--text); }
      .container { max-width: 980px; margin: 0 auto; padding: 16px; }
      .header { background: linear-gradient(135deg, #0f172a 0%, #111827 100%); color: #fff; border-radius: 14px; padding: 18px; margin-bottom: 16px; }
      .headerTop { display:flex; align-items:center; gap:14px; }
      .brandLogo { width:72px; height:72px; border-radius: 14px; object-fit: cover; background: #fff; padding: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.18); flex: 0 0 auto; }
      .brandHomeLink{ display:inline-flex; border-radius: 14px; }
      .brandText { min-width: 0; }
      .header h1 { margin: 0 0 8px; font-size: 1.4rem; }
      .header a { color: rgba(255,255,255,.92); }
      .updateStamp { margin-top: 8px; color: rgba(255,255,255,.84); font-size: .92rem; }
      .topNavWrap { position: sticky; top: 0; z-index: 40; margin-bottom: 12px; }
      .topNav { display:flex; gap:10px; overflow-x:auto; padding: 10px 12px; border:1px solid var(--border); border-radius: 14px; background: color-mix(in srgb, var(--surface) 90%, transparent); box-shadow: var(--shadow); backdrop-filter: blur(12px); -webkit-overflow-scrolling: touch; }
      .topNav::-webkit-scrollbar { display: none; }
      .topNavBrand{ display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius: 999px; border:1px solid var(--border); background: var(--surface2); flex: 0 0 auto; }
      .topNavBrand img{ width:24px; height:24px; object-fit: cover; border-radius: 999px; }
      .topNavLink { white-space: nowrap; display:inline-flex; align-items:center; justify-content:center; padding: 10px 14px; border-radius: 999px; border:1px solid var(--border); background: var(--surface2); color: var(--text); font-weight: 600; }
      .topNavLink:hover { text-decoration:none; border-color: color-mix(in srgb, var(--primary) 55%, var(--border)); }
      .skipLink{
        position:absolute; left: 8px; top: -44px; z-index: 100;
        background:#fff; color:#111; border:1px solid #cbd5e1; border-radius:8px; padding:8px 12px;
      }
      .skipLink:focus{ top: 8px; }
      :focus-visible{ outline: 3px solid color-mix(in srgb, var(--primary2) 75%, #fff); outline-offset: 2px; }
      #main-content, #tin-tuc, #du-lieu, #tin-van, #du-bao { scroll-margin-top: 76px; }
      button, a, input, select { min-height: 24px; min-width: 24px; }
      .srOnly{
        position:absolute !important; width:1px; height:1px; padding:0; margin:-1px;
        overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;
      }
      .panel { background: var(--surface); border-radius: 12px; padding: 14px; margin-bottom: 12px; box-shadow: var(--shadow); border: 1px solid var(--border); }
      .panel h2 { margin-top: 0; font-size: 1.1rem; }
      .historySmart{ display:grid; grid-template-columns: 280px 1fr; gap:10px; align-items:start; }
      .historyTabs{ display:grid; gap:8px; margin-bottom:10px; max-height: 360px; overflow:auto; padding-right:4px; }
      .historyTabBtn{
        display:grid;
        grid-template-columns: 14px 1fr auto;
        align-items:center;
        gap:8px;
        border:1px solid var(--border);
        background:var(--surface2);
        color:var(--text);
        border-radius:10px;
        padding:8px 10px;
        font:inherit;
        cursor:pointer;
        text-align:left;
      }
      .historyMain{ display:grid; gap:2px; }
      .historyDot{ width:10px; height:10px; border-radius:999px; background: color-mix(in srgb, var(--muted) 65%, transparent); }
      .historyDot.pos{ background: color-mix(in srgb, var(--pos) 85%, transparent); }
      .historyDot.neu{ background: color-mix(in srgb, var(--neu) 85%, transparent); }
      .historyDot.neg{ background: color-mix(in srgb, var(--neg) 85%, transparent); }
      .historyTime{ font-weight:700; }
      .historyCount{ font-size:.8rem; color: var(--muted); }
      .historyDelta{ font-size:.78rem; border-radius:999px; padding:3px 8px; border:1px solid var(--border); color:var(--muted); }
      .historyDelta.up{ color:#066649; border-color: color-mix(in srgb, var(--pos) 50%, var(--border)); background: color-mix(in srgb, var(--pos) 10%, transparent); }
      .historyDelta.down{ color:#b42318; border-color: color-mix(in srgb, var(--neg) 50%, var(--border)); background: color-mix(in srgb, var(--neg) 10%, transparent); }
      .historyDelta.flat{ color:#475467; }
      .historyTabBtn.active{
        border-color: color-mix(in srgb, var(--primary) 55%, var(--border));
        background: color-mix(in srgb, var(--primary) 10%, var(--surface2));
      }
      .historyTabBtn.active .historyDot{ background: color-mix(in srgb, var(--primary2) 85%, transparent); }
      .historyPanel{ display:none; border:1px solid var(--border); border-radius:10px; padding:10px; background: color-mix(in srgb, var(--surface2) 92%, transparent); }
      .historyPanel.active{ display:block; }
      .historyKpis{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
      .historyKpi{ font-size:.8rem; border-radius:999px; padding:3px 8px; border:1px solid var(--border); background: color-mix(in srgb, var(--surface2) 92%, transparent); }
      .overviewReadable p { margin: 8px 0; line-height: 1.55; }
      .overviewReadable ul, .historyTextBody ul { margin: 8px 0; padding-left: 18px; display: grid; gap: 8px; }
      .historyContentWrap { margin-top: 10px; display: grid; gap: 10px; }
      .historyTextBlock { border-top: 1px dashed color-mix(in srgb, var(--border) 72%, transparent); padding-top: 8px; }
      .historyTextTitle { margin: 0 0 4px; font-size: .92rem; }
      .historyTextPreview {
        margin: 0;
        color: var(--muted);
        line-height: 1.55;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .historyTextBody { display: none; }
      .historyPanel.expanded .historyTextBody { display: block; }
      .historyPanel.expanded .historyTextPreview { display: none; }
      .historyExpandBtn{
        margin-top: 10px;
        padding: 8px 12px;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: color-mix(in srgb, var(--surface2) 92%, transparent);
        color: var(--text);
        font: inherit;
        font-size: .88rem;
        cursor: pointer;
      }
      .historyExpandBtn:hover{ border-color: color-mix(in srgb, var(--primary) 55%, var(--border)); }
      .warning { border-left: 4px solid #f59e0b; }
      .disclaimer { font-size: 0.9rem; color: var(--muted); }
      .langHint { font-size: 0.85rem; color: rgba(255,255,255,0.85); }
      .filter { margin: 12px 0; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .filter label { white-space: nowrap; }
      .filter select { min-width: 180px; flex: 1 1 220px; }
      .filter select, .filter button { padding: 8px 10px; border: 1px solid #d0d5dd; border-radius: 8px; background: #fff; color: #101828; }
      .filter button { flex: 0 0 auto; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; }
      .spanAll{ grid-column: 1 / -1; }
      .card { background: var(--surface2); border-radius: 12px; padding: 12px; border: 1px solid var(--border); }
      .cardPinned { border-color: color-mix(in srgb, var(--warning) 55%, var(--border)); background: color-mix(in srgb, var(--warning) 8%, var(--surface2)); }
      .cardThumb{ width:100%; aspect-ratio: 16/9; max-height: 220px; object-fit: cover; border-radius: 12px; margin: 10px 0 10px; border: 1px solid var(--border); background:#d0d5dd; }
      .sentimentBadge{ display:inline-flex; align-items:center; padding:4px 8px; border-radius:999px; font-size:.8rem; font-weight:700; margin-bottom:6px; }
      .sentimentBadge.pos{ color:#066649; background: color-mix(in srgb, #12b76a 18%, transparent); border:1px solid color-mix(in srgb, #12b76a 45%, transparent); }
      .sentimentBadge.neu{ color:#475467; background: color-mix(in srgb, #98a2b3 20%, transparent); border:1px solid color-mix(in srgb, #98a2b3 45%, transparent); }
      .sentimentBadge.neg{ color:#b42318; background: color-mix(in srgb, #f04438 16%, transparent); border:1px solid color-mix(in srgb, #f04438 45%, transparent); }
      .confirmBadge{ display:inline-flex; align-items:center; padding:4px 8px; border-radius:999px; font-size:.78rem; font-weight:700; margin:0 0 8px 6px; border:1px solid var(--border); }
      .confirmBadge.confirmed{ color:#166534; background:#dcfce7; border-color:#86efac; }
      .confirmBadge.single{ color:#92400e; background:#fef3c7; border-color:#fcd34d; }
      .confirmBadge.breaking{ color:#991b1b; background:#fee2e2; border-color:#fca5a5; }
      .mergeMeta{ margin-top:-2px; color: var(--muted); font-size:.84rem; }
      .pinRow { display:flex; align-items:center; justify-content: space-between; gap: 10px; }
      .pinBadge { display:inline-flex; align-items:center; padding: 4px 10px; border-radius: 999px; font-size: .85rem; font-weight: 700; background: color-mix(in srgb, var(--warning) 22%, transparent); border:1px solid color-mix(in srgb, var(--warning) 55%, transparent); }
      .card h3 { margin: 8px 0; font-size: 1.02rem; line-height: 1.35; }
      .card p { margin: 8px 0; }
      .meta { color: var(--muted); font-size: 0.86rem; }
      .tag { color: #b54708; font-size: 0.86rem; }
      a { color: var(--primary); text-decoration: none; }
      a:hover { text-decoration: underline; }
      /* Charts */
      .chartGrid{ display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:12px; }
      .chartEmbed{ margin-top: 16px; padding-top: 14px; border-top: 1px dashed color-mix(in srgb, var(--warning) 35%, var(--border)); }
      .chartEmbed h3{ margin: 0 0 10px; font-size: 1rem; }
      .chartCard{ background: var(--surface2); border:1px solid var(--border); border-radius: 12px; padding: 12px; }
      .chartCard h3{ margin: 0 0 10px; font-size: 1rem; }
      .chartCard.span2{ grid-column: 1 / -1; }
      .stackSm{ display:grid; gap:6px; }
      .legendRow{ display:flex; align-items:center; justify-content: space-between; gap:10px; }
      .legendRow span:nth-child(2){ flex: 1 1 auto; }
      .muted{ color: var(--muted); font-size: .9rem; }
      .dot{ width:10px; height:10px; border-radius:999px; display:inline-block; }
      .dot.pos{ background: var(--pos); }
      .dot.neu{ background: var(--neu); }
      .dot.neg{ background: var(--neg); }
      .stackBar{ display:flex; height:10px; border-radius:999px; overflow:hidden; border:1px solid var(--border); margin-top: 10px; }
      .seg.pos{ background: color-mix(in srgb, var(--pos) 85%, transparent); }
      .seg.neu{ background: color-mix(in srgb, var(--neu) 85%, transparent); }
      .seg.neg{ background: color-mix(in srgb, var(--neg) 85%, transparent); }
      /* (Nguồn chart đã bỏ theo yêu cầu) */
      .scenario{ margin-top: 10px; }
      .scenarioTop{ display:flex; justify-content: space-between; align-items:center; gap:10px; }
      .scenarioTrack{ height:10px; border-radius:999px; background: color-mix(in srgb, var(--border) 65%, transparent); overflow:hidden; border:1px solid var(--border); margin-top:6px; }
      .scenarioFill{ display:block; height:100%; background: color-mix(in srgb, var(--warning) 70%, transparent); }
      /* Hot keywords */
      .chips{ display:flex; gap:8px; flex-wrap: wrap; margin-top: 10px; }
      .chip{ display:inline-flex; align-items:center; padding: 7px 10px; border-radius: 999px; border: 1px solid var(--border); background: color-mix(in srgb, var(--surface2) 92%, transparent); color: var(--text); font-size: .9rem; }
      .chipStatic{ cursor: default; }
      .chip:hover{ border-color: color-mix(in srgb, var(--primary) 55%, var(--border)); text-decoration: none; }
      /* Daily media */
      .mediaGrid{ display:grid; grid-template-columns: repeat(auto-fit, minmax(260px,1fr)); gap:12px; }
      .mediaCard{ background: var(--surface2); border:1px solid var(--border); border-radius: 14px; overflow:hidden; }
      .mediaThumb{ display:block; width:100%; aspect-ratio: 16/9; max-height: 200px; object-fit: cover; background:#d0d5dd; }
      .mediaThumbFallback{ display:flex; align-items:center; justify-content:center; font-weight:700; color: var(--muted); }
      .mediaBody{ padding:12px; }
      .mediaBody h3{ margin: 0 0 8px; font-size: 1rem; line-height: 1.4; }
      .briefTabs{ display:flex; gap:8px; margin: 0 0 10px; flex-wrap: wrap; }
      .briefTabBtn{
        border:1px solid var(--border); border-radius: 999px; padding:8px 12px; background: var(--surface2);
        color: var(--text); font: inherit; cursor:pointer; font-weight:700;
      }
      .briefTabBtn.active{
        border-color: color-mix(in srgb, var(--primary2) 60%, var(--border));
        background: color-mix(in srgb, var(--primary2) 12%, transparent);
      }
      .briefTabPanel{ display:none; }
      .briefTabPanel.active{ display:block; }
      .briefList{ margin: 0; padding-left: 18px; display:grid; gap:8px; }
      .briefTypeBadge{
        display:inline-flex; align-items:center; margin-left:8px; padding:2px 8px;
        border-radius:999px; border:1px solid var(--border); font-size:.74rem; font-weight:700;
      }
      .briefTypeBadge.domestic{
        color:#066649; border-color: color-mix(in srgb, var(--pos) 50%, var(--border)); background: color-mix(in srgb, var(--pos) 10%, transparent);
      }
      .briefTypeBadge.international{
        color:#155eef; border-color: color-mix(in srgb, var(--primary2) 50%, var(--border)); background: color-mix(in srgb, var(--primary2) 10%, transparent);
      }
      .marketBoard { margin-top: 12px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface2); padding: 14px; }
      .marketGrid { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
      .marketBlock { border: 1px solid var(--border); border-radius: 12px; padding: 12px; background: color-mix(in srgb, var(--surface) 88%, transparent); }
      .marketBlock h3 { margin: 0 0 10px; font-size: 1rem; }
      .marketLinks { display:flex; gap:8px; flex-wrap: wrap; }
      .marketList { margin: 0; padding-left: 18px; display:grid; gap:6px; }
      .cafefGrid{ display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:10px; }
      .cafefLinkCard{
        display:flex; flex-direction:column; gap:6px; padding:12px;
        border-radius:12px; border:1px solid var(--border);
        background: color-mix(in srgb, var(--surface) 90%, transparent);
        color: var(--text); text-decoration:none;
      }
      .cafefLinkCard:hover{ border-color: color-mix(in srgb, var(--primary) 55%, var(--border)); text-decoration:none; }
      .cafefLinkTitle{ font-weight:700; line-height:1.35; }
      .cafefLinkMeta{ font-size:.82rem; color: var(--muted); }
      .marketMini{ display:grid; grid-template-columns: 96px 1fr; gap:10px; align-items:center; }
      .marketMini img{ width:96px; height:64px; object-fit:cover; border-radius:10px; border:1px solid var(--border); }
      .hsxGrid{ display:grid; grid-template-columns: 1.1fr .9fr; gap:12px; margin-top:12px; }
      .hsxCard{ border: 1px solid var(--border); border-radius: 12px; padding: 12px; background: color-mix(in srgb, var(--surface) 88%, transparent); }
      .hsxTable{ width:100%; border-collapse:collapse; font-size:.88rem; }
      .hsxTable th,.hsxTable td{ padding:7px 6px; border-bottom:1px solid var(--border); text-align:right; }
      .hsxTable th:first-child,.hsxTable td:first-child{ text-align:left; font-weight:700; }
      .hsxChartWrap{ width:100%; overflow:hidden; }
      .hsxChart{ width:100%; height:auto; display:block; }
      .hsxLegend{ display:flex; justify-content:space-between; gap:8px; color:var(--muted); font-size:.82rem; margin-top:6px; }
      .hsxRangeTabs{ display:flex; gap:8px; flex-wrap:wrap; margin: 8px 0 10px; }
      .hsxRangeBtn{ border:1px solid var(--border); border-radius:999px; padding:7px 11px; background:var(--surface2); color:var(--text); font:inherit; font-size:.84rem; font-weight:700; cursor:pointer; }
      .hsxRangeBtn.active{ border-color: color-mix(in srgb, var(--primary2) 60%, var(--border)); background: color-mix(in srgb, var(--primary2) 12%, transparent); }
      .hsxChartPanel{ display:none; }
      .hsxChartPanel.active{ display:block; }
      .footer { margin: 18px 0 8px; padding: 18px 16px; border-radius: 16px; background: linear-gradient(135deg, #0f172a 0%, #111827 100%); color:#fff; display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap: wrap; }
      .footerBrand { display:flex; align-items:center; gap:12px; }
      .footerLogo { width:52px; height:52px; border-radius: 12px; object-fit: cover; background:#fff; padding: 4px; }
      .footer p { margin: 0; color: rgba(255,255,255,.88); }
      @media (max-width: 640px) {
        .header h1 { font-size: 1.25rem; }
        .headerTop { align-items: flex-start; }
        .brandLogo { width: 56px; height: 56px; border-radius: 12px; }
        .topNavWrap { top: 8px; }
        .topNav { padding: 8px; gap: 8px; }
        .topNavLink { padding: 9px 12px; font-size: .92rem; }
        .historySmart{ grid-template-columns: 1fr; }
        .historyTabs{ max-height: none; overflow: visible; }
        .historyTabBtn{
          grid-template-columns: 12px 1fr;
          grid-template-areas:
            "dot time"
            ". count"
            ". delta";
        }
        .historyDot{ grid-area: dot; }
        .historyTime{ grid-area: time; }
        .historyCount{ grid-area: count; font-size:.78rem; }
        .historyDelta{ grid-area: delta; justify-self: start; }
        .cardThumb{ max-height: 160px; }
        .mediaThumb{ max-height: 145px; }
        .cafefGrid{ grid-template-columns: 1fr; }
        .hsxGrid{ grid-template-columns: 1fr; }
        .filter { align-items: stretch; }
        .filter label { width: 100%; }
        .filter select, .filter button { width: 100%; }
        .chartGrid{ grid-template-columns: 1fr; }
        .footer { align-items: flex-start; }
        /* no source bars */
      }
      @media (prefers-color-scheme: dark) {
        :root{
          --bg: #0b1220;
          --surface: #0f172a;
          --surface2: #111827;
          --text: #e5e7eb;
          --muted: #9ca3af;
          --border: #1f2937;
          --shadow: 0 10px 30px rgba(0,0,0,.35);
          --primary: #93c5fd;
          --primary2: #60a5fa;
        }
        .filter select, .filter button { background: #0b1220; color: var(--text); border-color: #334155; }
      }
      /* Back to top */
      .backTop{ position: fixed; right: 14px; bottom: 14px; z-index: 50; display:none; }
      .backTop button{ background: color-mix(in srgb, var(--primary2) 85%, transparent); color:#fff; border: 1px solid color-mix(in srgb, var(--primary2) 75%, transparent); border-radius: 999px; padding: 10px 12px; cursor:pointer; box-shadow: var(--shadow); }
      .backTop button:active{ transform: translateY(1px); }
      /* Pagination + date filter */
      .pager{ display:flex; align-items:center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin: 10px 0 4px; }
      .pager a{ display:inline-flex; align-items:center; justify-content:center; padding: 9px 12px; border-radius: 12px; border:1px solid var(--border); background: color-mix(in srgb, var(--surface2) 92%, transparent); color: var(--text); }
      .pager a:hover{ border-color: color-mix(in srgb, var(--primary) 55%, var(--border)); text-decoration:none; }
      .pager .muted{ flex: 1 1 auto; }
      .dateRow{ display:flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      .dateRow input[type="date"], .dateRow input[type="search"]{ border: 1px solid #d0d5dd; border-radius: 8px; padding: 8px 10px; background:#fff; color:#101828; }
      @media (prefers-color-scheme: dark) {
        .dateRow input[type="date"], .dateRow input[type="search"]{ background:#0b1220; color: var(--text); border-color:#334155; }
      }
    </style>
  </head>
  <body>
    <main class="container" id="top">
      <a class="skipLink" href="#main-content">Bỏ qua đến nội dung chính</a>
      <header class="header" role="banner">
        <div class="headerTop">
          <a class="brandHomeLink" href="/" aria-label="Về trang chủ và tải lại dữ liệu mới">
            <img class="brandLogo" src="${LOGO_URL}" alt="Stock News by Orange Cloud" width="72" height="72" fetchpriority="high" loading="eager" decoding="async" />
          </a>
          <div class="brandText">
            <h1 id="headerTitle">Tin thị trường chứng khoán Việt Nam</h1>
            <p> Cập nhật ngày: ${escapeHtml(dateLabel)} </p>
            ${updatedLabel ? `<p class="updateStamp" title="${escapeAttribute(updatedFullLabel ?? updatedLabel)}">Lần cập nhật gần nhất: ${escapeHtml(updatedLabel)}</p>` : ""}
            <a class="langHint" href="/rss/today">RSS hôm nay</a>
          </div>
        </div>
      </header>
      <div class="topNavWrap">
        <nav class="topNav" aria-label="Điều hướng nhanh">
          <a class="topNavBrand" href="/" aria-label="Về trang chủ và làm mới trang">
            <img src="${LOGO_URL}" alt="Logo trang chủ" width="24" height="24" loading="eager" decoding="async" />
          </a>
          <a class="topNavLink" href="#du-lieu">Dữ liệu</a>
          <a class="topNavLink" href="#tin-van">Tin vắn</a>
          <a class="topNavLink" href="#du-bao">Dự báo</a>
          <a class="topNavLink" href="#tin-tuc">Tin tức</a>
          <a class="topNavLink" href="/notify">Thông báo</a>
          <a class="topNavLink" href="/status">Status</a>
        </nav>
      </div>
      <main id="main-content" role="main">
      <section class="panel">
        <h2 id="overviewTitle">Tổng quan thị trường trong ngày</h2>
        <div id="overviewText" class="overviewReadable">${renderReadableText(report.overviewVi)}</div>
        ${
          reportHistory.length > 0
            ? `<h3 style="margin:14px 0 8px;">Lịch sử cập nhật trong ngày</h3><div class="historySmart"><div class="historyTabs">${historyTabButtons}</div><div>${historyTabPanels}</div></div>`
            : ""
        }
      </section>

      <section class="panel">
        <h2>Từ khóa đang hot</h2>
        <p class="disclaimer">Tổng hợp từ tiêu đề/tóm tắt hôm nay (tự động, có thể không hoàn hảo).</p>
        <div class="chips">${hotKeywordChips || "<span class=\"muted\">Chưa đủ dữ liệu để tổng hợp từ khóa.</span>"}</div>
      </section>

      <form class="filter panel" method="GET" action="/" aria-label="Lọc và tìm kiếm tin tức">
        <h2 style="margin:0 0 10px;">Tìm kiếm và lọc tin</h2>
        <label for="source" id="filterLabel">Lọc theo nguồn:</label>
        <select id="source" name="source">
          <option value="" id="allSourcesOption">Tất cả</option>
          ${sourceOptions}
        </select>
        <label class="srOnly" for="sentimentFilter">Lọc theo cảm xúc</label>
        <select id="sentimentFilter" name="sentiment" aria-label="Lọc theo sentiment">
          <option value="" ${!selectedSentiment ? "selected" : ""}>Tất cả sentiment</option>
          <option value="positive" ${selectedSentiment === "positive" ? "selected" : ""}>Tích cực</option>
          <option value="neutral" ${selectedSentiment === "neutral" ? "selected" : ""}>Trung tính</option>
          <option value="negative" ${selectedSentiment === "negative" ? "selected" : ""}>Tiêu cực</option>
        </select>
        <div class="dateRow">
          <label class="srOnly" for="dateFilter">Chọn ngày</label>
          <input id="dateFilter" type="date" name="date" value="${escapeAttribute(reportDate)}" aria-label="Chọn ngày" />
          <label class="srOnly" for="keywordFilter">Tìm theo từ khóa</label>
          <input id="keywordFilter" type="search" name="q" value="${escapeAttribute(q)}" placeholder="Tìm theo từ khóa…" aria-label="Tìm theo từ khóa" />
        </div>
        <input type="hidden" name="page" value="1" />
        <button id="applyButton" type="submit">Áp dụng</button>
      </form>
      <p id="resultsStatus" class="meta" role="status" aria-live="polite">Đang hiển thị ${resultsCount} tin trên trang này.</p>
      <div class="pager">
        <a href="${escapeAttribute(prevHref)}" aria-label="Trang trước">← Trước</a>
        <span class="muted">Trang ${page} / ${totalPages} • ${total || 0} tin</span>
        <a href="${escapeAttribute(nextHref)}" aria-label="Trang sau">Sau →</a>
      </div>
      <section class="grid" id="tin-tuc" aria-labelledby="newsHeading">
        ${
          pinnedCards
            ? `<div class="spanAll"><h2 id="newsHeading" style="margin:6px 0 10px;">Tin nổi bật và mới nhất</h2></div>${pinnedCards}`
            : `<div class="spanAll"><h2 id="newsHeading" style="margin:6px 0 10px;">Tin mới nhất</h2></div>`
        }
        ${cards || "<p id=\"noArticles\">Chưa có bài viết nào cho ngày hôm nay.</p>"}
      </section>
      <div class="pager">
        <a href="${escapeAttribute(prevHref)}" aria-label="Trang trước">← Trước</a>
        <span class="muted">Trang ${page} / ${totalPages}</span>
        <a href="${escapeAttribute(nextHref)}" aria-label="Trang sau">Sau →</a>
      </div>
      <section class="panel" id="du-lieu">
        <h2>Dữ liệu thị trường từ CafeF</h2>
        <p class="disclaimer">4 link chính, ngắn gọn và dễ theo dõi. Nguồn: <a href="${escapeAttribute(
          marketSnapshot?.sourceUrl ?? "https://cafef.vn/du-lieu.chn"
        )}" target="_blank" rel="noopener noreferrer">CafeF Dữ liệu</a>.</p>
        <div class="marketBoard">
          <div class="marketGrid">
            <section class="marketBlock">
              <h3>Link dữ liệu chính</h3>
              <div class="cafefGrid">${curatedCafeFHtml || '<span class="muted">Chưa có link dữ liệu.</span>'}</div>
              <p class="meta" style="margin-top:10px;">Cập nhật mới nhất: ${escapeHtml(latestDataStamp ?? "Đang cập nhật")}</p>
            </section>
            <section class="marketBlock">
              <h3>Tổng quan nhanh</h3>
              <div class="chips">${marketOverviewChips || '<span class="muted">Đang đồng bộ dữ liệu.</span>'}</div>
              ${
                latestMarketVisual
                  ? `<div class="marketMini" style="margin-top:10px;">
                      ${renderResponsiveImage(latestMarketVisual.imageUrl || LOGO_URL, "", latestMarketVisual.title, {
                        width: 320,
                        height: 180,
                        loading: "lazy",
                        fetchpriority: "auto",
                        sizes: "96px"
                      })}
                      <div>
                        <p class="meta" style="margin:0 0 4px;">Mới nhất</p>
                        <a href="${escapeAttribute(latestMarketVisual.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(latestMarketVisual.title)}</a>
                      </div>
                    </div>`
                  : ""
              }
              <ul class="marketList" style="margin-top:8px;">${marketNotes || "<li>Dữ liệu chỉ mang tính tham khảo.</li>"}</ul>
            </section>
          </div>
          ${
            hsxMarketSnapshot
              ? `<div class="hsxGrid">
                  <section class="hsxCard">
                    <h3 style="margin-top:0;">Khối lượng giao dịch cao nhất hôm nay</h3>
                    <p class="meta">Nguồn HSX: <a href="${escapeAttribute(hsxMarketSnapshot.statsUrl)}" target="_blank" rel="noopener noreferrer">Top trong ngày</a></p>
                    ${renderHSXTopVolumeTable(hsxMarketSnapshot)}
                  </section>
                  <section class="hsxCard">
                    <h3 style="margin-top:0;">VNINDEX 1 năm</h3>
                    <p class="meta">Phong cách hiển thị tham chiếu từ trang biểu đồ HSX. Dữ liệu: <a href="${escapeAttribute(hsxMarketSnapshot.chartUrl)}" target="_blank" rel="noopener noreferrer">Biểu đồ HSX</a></p>
                    ${renderVNIndexMultiRangeChart(hsxMarketSnapshot)}
                  </section>
                </div>`
              : ""
          }
        </div>
      </section>

      <section class="panel" id="tin-van">
        <h2>Bản tin vắn & media trong ngày</h2>
        <p class="disclaimer">Tổng hợp trong cùng ngày cập nhật từ YouTube/public feed, báo tài chính trong nước và các nguồn quốc tế như Reuters, CNBC. Có thể xem lại bằng bộ lọc ngày ở phía dưới.</p>
        <div class="panel" style="margin-bottom:12px;">
          <div class="briefTabs" role="tablist" aria-label="Bộ lọc tin vắn">
            <button class="briefTabBtn active" id="brief-tab-domestic" type="button" role="tab" aria-selected="true" aria-controls="brief-panel-domestic">Trong nước</button>
            <button class="briefTabBtn" id="brief-tab-international" type="button" role="tab" aria-selected="false" aria-controls="brief-panel-international">Nước ngoài</button>
          </div>
          <div id="brief-panel-domestic" class="briefTabPanel active" role="tabpanel" aria-labelledby="brief-tab-domestic">
            <h3 style="margin-top:0;">Tin trong nước (tài chính & chứng khoán)</h3>
            <ul class="briefList">${domesticBriefBullets || "<li>Chưa có bản tin trong nước cho ngày này.</li>"}</ul>
          </div>
          <div id="brief-panel-international" class="briefTabPanel" role="tabpanel" aria-labelledby="brief-tab-international">
            <h3 style="margin-top:0;">Tin quốc tế về tình hình Việt Nam (tài chính & chứng khoán)</h3>
            <ul class="briefList">${internationalBriefBullets || "<li>Chưa có bản tin quốc tế liên quan Việt Nam cho ngày này.</li>"}</ul>
          </div>
        </div>
        <div class="mediaGrid">
          ${mediaCards || "<p>Chưa có media/hình ảnh phù hợp cho ngày này.</p>"}
        </div>
      </section>

      <section class="panel warning" id="du-bao">
        <h2>Kịch bản thị trường (heuristic)</h2>
        ${chartsHtml || "<p class=\"muted\">Chưa đủ dữ liệu để hiển thị biểu đồ.</p>"}
      </section>
      </main>
      <footer class="footer" role="contentinfo">
        <div class="footerBrand">
          <img class="footerLogo" src="${LOGO_URL}" alt="Stock News by Orange Cloud" width="52" height="52" loading="lazy" decoding="async" />
          <div>
            <strong>Stock News by Orange Cloud</strong>
            <p>Tổng hợp tin chứng khoán Việt Nam theo ngày, tối ưu cho desktop và mobile.</p>
          </div>
        </div>
        <a class="topNavLink" href="#top">Lên đầu trang</a>
      </footer>
    </main>
    <div class="backTop" id="backTop"><button type="button" aria-label="Back to top">↑ Lên đầu trang</button></div>

    <script>
      // Back to top
      const backTop = document.getElementById("backTop");
      const backTopBtn = backTop?.querySelector("button");
      function onScroll(){
        if (!backTop) return;
        backTop.style.display = (window.scrollY || document.documentElement.scrollTop) > 600 ? "block" : "none";
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      backTopBtn?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

      // History tabs
      const tabButtons = Array.from(document.querySelectorAll(".historyTabBtn"));
      const tabPanels = Array.from(document.querySelectorAll(".historyPanel"));
      tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-tab");
          tabButtons.forEach((b) => b.classList.remove("active"));
          tabPanels.forEach((p) => p.classList.remove("active"));
          btn.classList.add("active");
          if (id) document.getElementById(id)?.classList.add("active");
        });
      });
      const briefTabButtons = Array.from(document.querySelectorAll(".briefTabBtn"));
      const briefPanels = Array.from(document.querySelectorAll(".briefTabPanel"));
      function activateBriefTab(id){
        briefTabButtons.forEach((btn) => {
          const active = btn.getAttribute("aria-controls") === id;
          btn.classList.toggle("active", active);
          btn.setAttribute("aria-selected", active ? "true" : "false");
        });
        briefPanels.forEach((panel) => panel.classList.toggle("active", panel.id === id));
      }
      briefTabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("aria-controls");
          if (id) activateBriefTab(id);
        });
      });
      const hsxRangeButtons = Array.from(document.querySelectorAll(".hsxRangeBtn"));
      const hsxRangePanels = Array.from(document.querySelectorAll(".hsxChartPanel"));
      function activateHSXRange(id){
        hsxRangeButtons.forEach((btn) => btn.classList.toggle("active", btn.getAttribute("data-range-target") === id));
        hsxRangePanels.forEach((panel) => panel.classList.toggle("active", panel.id === id));
      }
      hsxRangeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-range-target");
          if (id) activateHSXRange(id);
        });
      });
      const expandButtons = Array.from(document.querySelectorAll(".historyExpandBtn"));
      expandButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const targetId = btn.getAttribute("data-expand-target");
          const panel = targetId ? document.getElementById(targetId) : null;
          if (!panel) return;
          const expanded = panel.classList.toggle("expanded");
          btn.setAttribute("aria-expanded", expanded ? "true" : "false");
          btn.textContent = expanded ? "Thu gọn" : "Xem thêm";
        });
      });

      // Auto refresh every 5 minutes when fresh crawl is available.
      const currentCachedAt = ${JSON.stringify(updatedAt ?? "")};
      const autoRefreshUrl = ${JSON.stringify(autoRefreshCheckUrl)};
      const rumPayloadBase = { routeTemplate: "home", deviceClass: window.innerWidth < 768 ? "mobile" : "desktop", path: location.pathname + location.search, cacheStatus: ${JSON.stringify(cacheStatus)} };
      function sendRum(metric){
        try{
          navigator.sendBeacon("/api/rum", JSON.stringify({ ...rumPayloadBase, ...metric }));
        } catch {}
      }
      if ("PerformanceObserver" in window) {
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === "largest-contentful-paint") sendRum({ metric: "LCP", value: entry.startTime });
              if (entry.entryType === "layout-shift" && !(entry).hadRecentInput) sendRum({ metric: "CLS", value: (entry).value });
            }
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) sendRum({ metric: "INP", value: (entry).duration ?? entry.startTime });
          }).observe({ type: "event", buffered: true, durationThreshold: 40 });
        } catch {}
      }
      const nav = performance.getEntriesByType("navigation")[0];
      if (nav) {
        sendRum({ metric: "TTFB", value: nav.responseStart });
        sendRum({ metric: "FCP", value: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0 });
      }
      async function checkForFreshDataAndReload() {
        try {
          const resp = await fetch(autoRefreshUrl, {
            method: "GET",
            headers: { "Accept": "application/json" },
            cache: "no-store"
          });
          if (!resp.ok) return;
          const data = await resp.json();
          const nextCachedAt = String(data?.cachedAt ?? "");
          if (nextCachedAt && currentCachedAt && nextCachedAt !== currentCachedAt) {
            window.location.reload();
          }
        } catch {
          // Ignore network errors, try again on next interval.
        }
      }
      window.setInterval(checkForFreshDataAndReload, 5 * 60 * 1000);
    </script>
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

function escapeAttribute(input: string): string {
  return escapeHtml(input);
}

function renderSentimentBadge(label: string): string {
  if (label === "positive") return '<span class="sentimentBadge pos">Tích cực</span>';
  if (label === "negative") return '<span class="sentimentBadge neg">Tiêu cực</span>';
  return '<span class="sentimentBadge neu">Trung tính</span>';
}

function renderConfirmationBadge(article: StoredArticle): string {
  const level = article.confirmationLevel;
  const label = article.confirmationLabel;
  if (!level || !label) return "";
  if (level === "confirmed") return `<span class="confirmBadge confirmed">✅ ${escapeHtml(label)}</span>`;
  if (level === "single") return `<span class="confirmBadge single">⚠️ ${escapeHtml(label)}</span>`;
  return `<span class="confirmBadge breaking">🔥 ${escapeHtml(label)}</span>`;
}

function renderMergedSources(article: StoredArticle): string {
  const count = article.sourceCount ?? 1;
  if (count <= 1) return "";
  return `<p class="mergeMeta">${escapeHtml(article.title)} reported by ${count} sources</p>`;
}

function historySentimentClass(score: number): string {
  if (score > 0) return "pos";
  if (score < 0) return "neg";
  return "neu";
}

function compressHistoryEntries(entries: ReportHistoryEntry[], current: DailyReport): ReportHistoryEntry[] {
  if (!entries.length) return [];
  const normalized = entries
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((entry, idx, arr) => {
      // Hide the newest snapshot if it is effectively identical to the currently displayed report.
      if (
        idx === 0 &&
        normalizeText(entry.overviewVi) === normalizeText(current.overviewVi) &&
        normalizeText(entry.outlookVi) === normalizeText(current.outlookVi) &&
        normalizeText(entry.assumptionsVi || "") === normalizeText(current.assumptionsVi || "")
      ) {
        return false;
      }
      // Collapse consecutive unchanged snapshots to avoid repetitive timeline.
      const prev = arr[idx - 1];
      if (!prev) return true;
      return (
        normalizeText(entry.overviewVi) !== normalizeText(prev.overviewVi) ||
        normalizeText(entry.outlookVi) !== normalizeText(prev.outlookVi) ||
        normalizeText(entry.assumptionsVi || "") !== normalizeText(prev.assumptionsVi || "")
      );
    });
  return normalized;
}

function normalizeText(input: string): string {
  return input.replace(/\s+/g, " ").trim().toLowerCase();
}

function renderHistoryTextBlock(title: string, text: string): string {
  const preview = text.replace(/\s+/g, " ").trim();
  return `<div class="historyTextBlock">
    <p class="historyTextTitle"><strong>${escapeHtml(title)}:</strong></p>
    <p class="historyTextPreview">${escapeHtml(preview)}</p>
    <div class="historyTextBody">${renderReadableText(text)}</div>
  </div>`;
}

function renderReadableText(input: string): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (!compact) return "<p>Đang cập nhật.</p>";
  const starParts = compact
    .split(/\s*\*\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);
  if (starParts.length > 1) {
    return `<ul>${starParts.map((part) => `<li>${escapeHtml(part)}</li>`).join("")}</ul>`;
  }
  const sentenceParts = compact
    .split(/(?<=[.!?])\s+/g)
    .map((part) => part.trim())
    .filter(Boolean);
  if (sentenceParts.length <= 1) {
    return `<p>${escapeHtml(compact)}</p>`;
  }
  return sentenceParts.map((part) => `<p>${escapeHtml(part)}</p>`).join("");
}

function renderResponsiveImage(
  src: string,
  className: string,
  alt: string,
  opts: { width: number; height: number; loading: "eager" | "lazy"; fetchpriority: "high" | "auto"; sizes: string }
): string {
  const srcset = buildCloudflareSrcset(src);
  const srcsetAttr = srcset ? ` srcset="${escapeAttribute(srcset)}"` : "";
  const source = proxiedImageUrl(src);
  const fallback = escapeAttribute(proxiedImageUrl(LOGO_URL));
  return `<img class="${className}" src="${escapeAttribute(source)}" alt="${escapeAttribute(alt)}" width="${opts.width}" height="${opts.height}" loading="${opts.loading}" fetchpriority="${opts.fetchpriority}" decoding="async"${srcsetAttr} sizes="${escapeAttribute(opts.sizes)}" onerror="this.onerror=null;this.src='${fallback}';" />`;
}

function buildCloudflareSrcset(src: string): string {
  /** Remote HTTPS images: optimize via Workers /img + Cloudflare image transforms on fetch. Same-origin paths: no responsive srcset (avoid invalid /cdn-cgi paths). */
  if (!/^https?:\/\//i.test(src)) return "";
  const widths = [320, 640, 960, 1200];
  return widths.map((w) => `/img?${imgProxyQuery(src, { w, q: 82 })} ${w}w`).join(", ");
}

function imgProxyQuery(u: string, opts: { w: number; q: number }): string {
  const p = new URLSearchParams();
  p.set("u", u);
  p.set("w", String(opts.w));
  p.set("q", String(opts.q));
  return p.toString();
}

function proxiedImageUrl(src: string): string {
  if (!/^https?:\/\//i.test(src)) return src;
  return `/img?${imgProxyQuery(src, { w: 960, q: 82 })}`;
}

function isInternationalSource(item: MediaItemRecord): boolean {
  const source = `${item.sourceId} ${item.sourceName}`.toLowerCase();
  return source.includes("reuters") || source.includes("cnbc") || source.includes("bloomberg") || source.includes("wsj");
}

function isInternationalFinanceBrief(item: MediaItemRecord): boolean {
  if (!isInternationalSource(item)) return false;
  const text = `${item.title} ${item.summaryVi}`.toLowerCase();
  return /(stock|market|equity|bond|bank|finance|financial|securit|chứng khoán|tài chính|ngân hàng|thị trường)/i.test(text);
}

function isDomesticFinanceBrief(item: MediaItemRecord): boolean {
  const source = `${item.sourceId} ${item.sourceName}`.toLowerCase();
  const isDomesticSource =
    source.includes("vietstock") ||
    source.includes("cafef") ||
    source.includes("vnexpress") ||
    source.includes("stockscafe") ||
    source.includes("derived-brief-") ||
    /\.vn(\/|$)/i.test(item.url);
  if (!isDomesticSource) return false;
  const text = `${item.title} ${item.summaryVi}`.toLowerCase();
  return /(chứng khoán|tài chính|ngân hàng|thị trường|vn-index|vnindex|hose|hnx|upcom|stock|finance|market)/i.test(text);
}

function buildCuratedCafeFLinks(snapshot: CafeFMarketSnapshot | null): Array<{ label: string; url: string }> {
  const allLinks = [...(snapshot?.quickLinks ?? []), ...(snapshot?.toolLinks ?? [])];
  const pick = (label: string, keywords: string[], fallback: string): { label: string; url: string } => {
    const found = allLinks.find((x) => keywords.some((k) => x.label.toLowerCase().includes(k)));
    return { label, url: found?.url ?? fallback };
  };
  return [
    pick("Báo cáo phân tích", ["báo cáo", "phan tich"], "https://cafef.vn/du-lieu/phan-tich-bao-cao.chn"),
    pick("Bảng giá trực tuyến", ["bảng giá", "liveboard"], "https://liveboard.cafef.vn/"),
    pick("Công bố thông tin", ["công bố", "thông tin"], "https://cafef.vn/du-lieu/cong-bo-thong-tin.chn"),
    pick("Dữ liệu doanh nghiệp", ["doanh nghiệp"], "https://cafef.vn/du-lieu/du-lieu-doanh-nghiep.chn")
  ];
}

function renderHSXTopVolumeTable(snapshot: HSXMarketSnapshot): string {
  const rows = snapshot.topVolume
    .slice(0, 10)
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.symbol)}</td>
        <td>${escapeHtml(item.price)}</td>
        <td>${escapeHtml(item.volume)}</td>
        <td>${escapeHtml(item.ratioPct)}%</td>
      </tr>`
    )
    .join("");
  return `<table class="hsxTable">
    <thead><tr><th>Mã</th><th>Giá</th><th>KL</th><th>Tỷ trọng</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4">Đang cập nhật.</td></tr>'}</tbody>
  </table>`;
}

function renderVNIndexMultiRangeChart(snapshot: HSXMarketSnapshot): string {
  const tabs: Array<{ id: "1w" | "1m" | "1y"; label: string; points: typeof snapshot.vnindex1Y }> = [
    { id: "1w", label: "Tuần", points: snapshot.vnindex1W },
    { id: "1m", label: "Tháng", points: snapshot.vnindex1M },
    { id: "1y", label: "Năm", points: snapshot.vnindex1Y }
  ];
  const hasAny = tabs.some((t) => t.points.length > 0);
  if (!hasAny) return '<p class="muted">Chưa lấy được dữ liệu VNINDEX.</p>';

  const buttons = tabs
    .map(
      (tab, idx) =>
        `<button type="button" class="hsxRangeBtn ${idx === 0 ? "active" : ""}" data-range-target="hsx-range-${tab.id}">${escapeHtml(
          tab.label
        )}</button>`
    )
    .join("");
  const panels = tabs
    .map((tab, idx) => `<div id="hsx-range-${tab.id}" class="hsxChartPanel ${idx === 0 ? "active" : ""}">${renderSingleVNIndexChart(tab.points, tab.label)}</div>`)
    .join("");

  return `<div>
    <div class="hsxRangeTabs" role="tablist" aria-label="Khoảng thời gian VNINDEX">${buttons}</div>
    ${panels}
  </div>`;
}

function renderSingleVNIndexChart(points: HSXMarketSnapshot["vnindex1Y"], label: string): string {
  if (!points.length) return `<p class="muted">Chưa lấy được dữ liệu VNINDEX theo ${escapeHtml(label.toLowerCase())}.</p>`;

  const width = 680;
  const height = 260;
  const padL = 18;
  const padR = 8;
  const padT = 14;
  const padB = 26;
  const closes = points.map((p) => p.closePrice);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = Math.max(1, max - min);
  const x = (idx: number) => padL + (idx / Math.max(1, points.length - 1)) * (width - padL - padR);
  const y = (value: number) => padT + (1 - (value - min) / span) * (height - padT - padB);
  const path = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${x(idx).toFixed(1)} ${y(p.closePrice).toFixed(1)}`).join(" ");
  const area = `${path} L ${x(points.length - 1).toFixed(1)} ${(height - padB).toFixed(1)} L ${x(0).toFixed(1)} ${(height - padB).toFixed(1)} Z`;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const trendUp = last.closePrice >= first.closePrice;
  const stroke = trendUp ? "#155eef" : "#b42318";
  const fill = trendUp ? "rgba(21,94,239,0.14)" : "rgba(180,35,24,0.12)";
  const labelIndexes = Array.from(new Set([0, Math.floor(points.length / 3), Math.floor((points.length * 2) / 3), points.length - 1])).filter(
    (idx) => idx >= 0 && idx < points.length
  );
  const labels = labelIndexes
    .map((idx) => {
      const date = new Date(points[idx]!.time * 1000);
      const format =
        label === "Tuần"
          ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })
          : label === "Tháng"
            ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })
            : new Intl.DateTimeFormat("vi-VN", { month: "short", year: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
      const labelText = format.format(date);
      return `<text x="${x(idx).toFixed(1)}" y="${height - 8}" text-anchor="${idx === 0 ? "start" : idx === points.length - 1 ? "end" : "middle"}" fill="currentColor" opacity="0.65" font-size="11">${escapeHtml(labelText)}</text>`;
    })
    .join("");
  const lastX = x(points.length - 1).toFixed(1);
  const lastY = y(last.closePrice).toFixed(1);
  const firstDate = formatVNIndexDate(points[0]!.time);
  const lastDate = formatVNIndexDate(points[points.length - 1]!.time);
  return `<div class="hsxChartWrap">
    <svg class="hsxChart" viewBox="0 0 ${width} ${height}" role="img" aria-label="VNINDEX 1 year chart">
      <defs>
        <linearGradient id="vnidxFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${fill}" />
          <stop offset="100%" stop-color="rgba(148,163,184,0.02)" />
        </linearGradient>
      </defs>
      <line x1="${padL}" y1="${height - padB}" x2="${width - padR}" y2="${height - padB}" stroke="currentColor" opacity="0.12" />
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${height - padB}" stroke="currentColor" opacity="0.08" />
      <path d="${area}" fill="url(#vnidxFill)" />
      <path d="${path}" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx="${lastX}" cy="${lastY}" r="3.5" fill="${stroke}" />
      ${labels}
    </svg>
    <div class="hsxLegend">
      <span>${escapeHtml(firstDate)} • ${escapeHtml(formatCompactNumber(first.closePrice))} điểm</span>
      <strong>${escapeHtml(lastDate)} • ${escapeHtml(formatCompactNumber(last.closePrice))} điểm</strong>
    </div>
  </div>`;
}

function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(n);
}

function formatVNIndexDate(unixSec: number): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(unixSec * 1000));
}

export function renderArticleDetailPage(params: {
  title: string;
  sourceName: string;
  publishedAt: string;
  summaryVi: string;
  snippet: string;
  imageUrl?: string | null;
  sourceUrl: string;
  sentimentLabel: "positive" | "neutral" | "negative";
  cacheStatus?: "hit" | "miss";
}): string {
  const p = params;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(p.title)}</title>
  <link rel="icon" type="image/png" href="${LOGO_URL}" />
  <style>
    .skipLink{position:absolute;left:8px;top:-44px;background:#fff;color:#111;border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px}
    .skipLink:focus{top:8px}
    :focus-visible{outline:3px solid #155eef;outline-offset:2px}
    body{font-family:Montserrat,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;background:#f2f4f7;margin:0;color:#121926}
    .wrap{max-width:900px;margin:0 auto;padding:16px}
    .card{background:#fff;border:1px solid #eaecf0;border-radius:14px;padding:14px;box-shadow:0 4px 14px rgba(15,23,42,.06)}
    .meta{color:#475467;font-size:.9rem}
    .thumb{width:100%;aspect-ratio:16/9;max-height:300px;object-fit:cover;border-radius:12px;border:1px solid #eaecf0;background:#d0d5dd;margin:10px 0}
    @media (max-width:640px){ .thumb{max-height:210px} }
    .sentimentBadge{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;font-size:.8rem;font-weight:700;margin:8px 0}
    .sentimentBadge.pos{color:#066649;background:rgba(18,183,106,.16);border:1px solid rgba(18,183,106,.4)}
    .sentimentBadge.neu{color:#475467;background:rgba(152,162,179,.2);border:1px solid rgba(152,162,179,.45)}
    .sentimentBadge.neg{color:#b42318;background:rgba(240,68,56,.14);border:1px solid rgba(240,68,56,.45)}
    a{color:#175cd3;text-decoration:none}
    a:hover{text-decoration:underline}
  </style></head><body><a class="skipLink" href="#main-content">Bỏ qua đến nội dung chính</a><main id="main-content" class="wrap" role="main">
    <p><a href="/">← Về trang chủ</a></p>
    <article class="card">
      <h1>${escapeHtml(p.title)}</h1>
      <p class="meta">${escapeHtml(p.sourceName)} • ${escapeHtml(formatVietnamDateDisplay(p.publishedAt))}</p>
      ${renderSentimentBadge(p.sentimentLabel)}
      ${renderResponsiveImage(p.imageUrl || LOGO_URL, "thumb", p.title, {
        width: 1200,
        height: 675,
        loading: "eager",
        fetchpriority: "high",
        sizes: "(max-width: 900px) 100vw, 900px"
      })}
      <p><strong>Tóm tắt:</strong> ${escapeHtml(p.summaryVi)}</p>
      <p><strong>Nội dung trích:</strong> ${escapeHtml(p.snippet)}</p>
      <p><a href="${escapeAttribute(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">Mở tài liệu nguồn gốc</a></p>
    </article>
  </main><script>
    const rumPayloadBase = { routeTemplate: "article", deviceClass: window.innerWidth < 768 ? "mobile" : "desktop", path: location.pathname + location.search, cacheStatus: ${JSON.stringify(p.cacheStatus ?? "miss")} };
    function sendRum(metric){ try{ navigator.sendBeacon("/api/rum", JSON.stringify({ ...rumPayloadBase, ...metric })); } catch {} }
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav) sendRum({ metric: "TTFB", value: nav.responseStart });
  </script></body></html>`;
}
