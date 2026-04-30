import type { StockInsight } from "../services/stock-insight";
import { formatVietnamDateDisplay } from "../utils/date";
import { themeAppearanceSwitcher, themeFontLinks, themeSemanticVariablesBlock, type Appearance } from "./theme";

export function renderStockPage(insight: StockInsight, appearance: Appearance = "light"): string {
  const mentionBreakdown = renderMentionBreakdown(insight.mentionTrend);
  const sentimentTotal = insight.sentiment.positive + insight.sentiment.neutral + insight.sentiment.negative;
  const flowLabel =
    insight.foreignFlow.net === "buy" ? "Nghiêng mua" : insight.foreignFlow.net === "sell" ? "Nghiêng bán" : "Trung tính";
  const abnormality =
    insight.volumeAbnormality.level === "unknown"
      ? "Chưa có dữ liệu"
      : insight.volumeAbnormality.level === "high"
        ? `Đột biến cao (${insight.volumeAbnormality.ratioPct?.toFixed(2)}%)`
        : `Bình thường (${insight.volumeAbnormality.ratioPct?.toFixed(2)}%)`;
  const perfStock = formatPct(insight.relativePerformance1M.stockPct);
  const perfIndex = formatPct(insight.relativePerformance1M.vnindexPct);
  const perfAlpha = formatPct(insight.relativePerformance1M.alphaPct);
  const priceChart = renderPriceSvg(insight.priceChart1M, insight.symbol);
  const newsItems = insight.latestNews
    .map(
      (a) => `<li><a href="/article?u=${encodeURIComponent(a.url)}">${escapeHtml(a.title)}</a> <span class="muted">(${escapeHtml(
        a.sourceName
      )} • ${escapeHtml(formatVietnamDateDisplay(a.publishedAt))})</span></li>`
    )
    .join("");
  const related = insight.relatedCompanies.map((s) => `<a class="chip" href="/stocks/${encodeURIComponent(s)}">${escapeHtml(s)}</a>`).join("");
  const bull = insight.bullCases.map((x) => `<li>${escapeHtml(x)}</li>`).join("");
  const bear = insight.bearCases.map((x) => `<li>${escapeHtml(x)}</li>`).join("");
  const returnPath = `/stocks/${encodeURIComponent(insight.symbol)}`;
  const sw = themeAppearanceSwitcher(appearance, returnPath);

  return `<!doctype html><html lang="vi" data-theme="${appearance}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(insight.symbol)} - Phân tích cổ phiếu</title>
  ${themeFontLinks()}
  <style>
  ${themeSemanticVariablesBlock()}
  .stockTop{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:8px}
  .wrap{max-width:980px;margin:0 auto;padding:16px}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:12px;box-shadow:var(--shadow)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
  .metric{font-size:1.4rem;font-weight:800}.muted{color:var(--muted);font-size:.9rem}
  .mentionRows{display:grid;gap:8px}
  .mentionRow{display:grid;grid-template-columns:78px 1fr auto;gap:8px;align-items:center}
  .mentionLabel{font-size:.84rem;color:var(--muted);font-weight:700}
  .mentionTrack{height:10px;border:1px solid var(--border);border-radius:999px;overflow:hidden;background:color-mix(in srgb, var(--surface) 90%, transparent)}
  .mentionFill{height:100%;background:var(--primary2)}
  .mentionCount{font-size:.84rem;color:var(--muted);font-weight:700}
  .chart svg{width:100%;height:auto;display:block}.legend{display:flex;justify-content:space-between;gap:8px;color:#475467;font-size:.85rem;margin-top:6px}
  .chip{display:inline-flex;padding:6px 10px;border-radius:999px;border:1px solid var(--border);margin:4px 6px 0 0;color:var(--primary);text-decoration:none}
  a{color:var(--primary);text-decoration:none}
  a:hover{text-decoration:underline}
  ul{margin:8px 0;padding-left:18px}
  </style></head><body class="appBody"><main class="wrap">
  <div class="stockTop"><p style="margin:0"><a href="/">← Trang chủ</a></p>${sw}</div>
  <section class="card"><h1>${escapeHtml(insight.symbol)}</h1><p class="muted">Trang phân tích mã cổ phiếu theo dữ liệu tin tức thời gian thực.</p></section>
  <section class="card grid">
    <div><h3>Điểm cảm xúc</h3><div class="metric">${insight.sentiment.score}</div><p class="muted">${sentimentTotal} bài • +${insight.sentiment.positive} / =${insight.sentiment.neutral} / -${insight.sentiment.negative}</p></div>
    <div><h3>Khối ngoại mua/bán</h3><div class="metric">${escapeHtml(flowLabel)}</div><p class="muted">Lượt nhắc mua: ${insight.foreignFlow.buyMentions} • Lượt nhắc bán: ${insight.foreignFlow.sellMentions}</p></div>
    <div><h3>Bất thường khối lượng</h3><div class="metric">${escapeHtml(abnormality)}</div><p class="muted">Khối lượng: ${escapeHtml(insight.volumeAbnormality.volumeText ?? "N/A")} • 20 phiên TB: ${formatNumber(insight.volumeAbnormality.avg20Volume)}</p></div>
  </section>
  <section class="card"><h3>Chart giá 1 tháng</h3><div class="chart">${priceChart}</div></section>
  <section class="card grid">
    <div><h3>So với VNINDEX (1M)</h3><div class="metric">${escapeHtml(perfAlpha)}</div><p class="muted">${escapeHtml(insight.symbol)}: ${escapeHtml(perfStock)} • VNINDEX: ${escapeHtml(perfIndex)}</p></div>
    <div><h3>Tần suất tin nhắc đến</h3><p class="muted">Số lượng bài viết có nhắc mã theo khung giờ đăng tin.</p>${mentionBreakdown}</div>
  </section>
  <section class="card"><h3>Công ty liên quan</h3><div>${related || '<span class="muted">Chưa đủ dữ liệu liên quan.</span>'}</div></section>
  <section class="card grid">
    <div><h3>Kịch bản tăng giá</h3><ul>${bull || "<li>Chưa có luận điểm tăng giá rõ ràng.</li>"}</ul></div>
    <div><h3>Kịch bản giảm giá</h3><ul>${bear || "<li>Chưa có luận điểm giảm giá rõ ràng.</li>"}</ul></div>
  </section>
  <section class="card"><h3>Tin mới nhất</h3><ul>${newsItems || "<li>Chưa có tin mới cho mã này.</li>"}</ul></section>
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

function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
}

function renderPriceSvg(points: Array<{ time: number; closePrice: number }>, symbol: string): string {
  if (points.length < 2) return '<p class="muted">Chưa đủ dữ liệu giá.</p>';
  const width = 700;
  const height = 220;
  const padL = 16;
  const padR = 8;
  const padT = 10;
  const padB = 24;
  const values = points.map((p) => p.closePrice);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1e-6, max - min);
  const x = (idx: number) => padL + (idx / Math.max(1, points.length - 1)) * (width - padL - padR);
  const y = (value: number) => padT + (1 - (value - min) / span) * (height - padT - padB);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.closePrice).toFixed(1)}`).join(" ");
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const stroke = last.closePrice >= first.closePrice ? "#155eef" : "#b42318";
  const labelFirst = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(first.closePrice);
  const labelLast = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(last.closePrice);
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Biểu đồ giá ${escapeHtml(symbol)} 1 tháng">
    <line x1="${padL}" y1="${height - padB}" x2="${width - padR}" y2="${height - padB}" stroke="currentColor" opacity="0.16" />
    <path d="${path}" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
  </svg>
  <div class="legend"><span>Đầu kỳ: ${labelFirst}</span><strong>Cuối kỳ: ${labelLast}</strong></div>`;
}

function renderMentionBreakdown(points: Array<{ hourLabel: string; count: number }>): string {
  if (!points.length) return '<p class="muted">Chưa có dữ liệu nhắc đến.</p>';
  const buckets = [
    { label: "00-05h", from: 0, to: 5 },
    { label: "06-11h", from: 6, to: 11 },
    { label: "12-16h", from: 12, to: 16 },
    { label: "17-23h", from: 17, to: 23 }
  ];
  const sums = buckets.map((b) => ({
    label: b.label,
    count: points
      .filter((p) => {
        const h = Number.parseInt(p.hourLabel.slice(0, 2), 10);
        return h >= b.from && h <= b.to;
      })
      .reduce((acc, p) => acc + p.count, 0)
  }));
  const max = Math.max(1, ...sums.map((s) => s.count));
  const rows = sums
    .map(
      (s) =>
        `<div class="mentionRow"><span class="mentionLabel">${s.label}</span><div class="mentionTrack"><div class="mentionFill" style="width:${Math.round(
          (s.count / max) * 100
        )}%"></div></div><span class="mentionCount">${s.count} tin</span></div>`
    )
    .join("");
  const ranked = sums
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 2)
    .map((s) => s.label);
  const insight =
    ranked.length > 0
      ? `<p class="muted" style="margin-top:8px;"><strong>Insight:</strong> Tin về mã tập trung nhiều nhất trong khung ${ranked.join(", ")}.</p>`
      : '<p class="muted" style="margin-top:8px;">Chưa có đủ dữ liệu để rút ra khung giờ nổi bật.</p>';
  return `<div class="mentionRows">${rows}</div>${insight}`;
}
