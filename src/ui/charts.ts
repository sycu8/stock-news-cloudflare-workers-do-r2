import type { StoredArticle } from "../types";
import type { SentimentSnapshot } from "../services/sentiment";
import { analyzeSentimentForArticles } from "../services/sentiment";

export interface ChartBundle {
  sentiment: SentimentSnapshot;
  scenarios: Array<{ label: string; pct: number; note: string }>;
  html: string;
}

export function buildChartsForToday(articles: StoredArticle[], previousSentiment?: SentimentSnapshot | null): ChartBundle {
  const sentiment = analyzeSentimentForArticles(articles);
  const scenarios = buildScenarios(sentiment);
  const html = renderChartsHtml({ sentiment, scenarios, previousSentiment: previousSentiment ?? null });
  return { sentiment, scenarios, html };
}

function buildScenarios(sentiment: SentimentSnapshot) {
  // Convert counts to scenario weights with smoothing.
  const p = sentiment.positive + 1;
  const n = sentiment.negative + 1;
  const u = sentiment.neutral + 1;

  // Base scenario leans to neutral; bullish to positive; cautious to negative.
  const bullish = p * 1.2;
  const base = u * 1.4 + Math.min(p, n) * 0.6;
  const cautious = n * 1.2;

  const sum = bullish + base + cautious;
  const toPct = (x: number) => Math.round((x / sum) * 100);

  let b = toPct(bullish);
  let m = toPct(base);
  let c = 100 - b - m;
  if (c < 0) c = 0;

  return [
    {
      label: "Kịch bản tích cực",
      pct: b,
      note: "Động lực đến từ thông tin/nhóm dẫn dắt; cần xác nhận bằng thanh khoản."
    },
    {
      label: "Kịch bản cơ sở",
      pct: m,
      note: "Biến động trong biên độ; ưu tiên quản trị rủi ro và theo dõi tin mới."
    },
    {
      label: "Kịch bản thận trọng",
      pct: c,
      note: "Áp lực chốt lời/tâm lý; rủi ro vĩ mô bất ngờ có thể làm tăng biến động."
    }
  ];
}

function renderChartsHtml(input: {
  sentiment: SentimentSnapshot;
  scenarios: Array<{ label: string; pct: number; note: string }>;
  previousSentiment: SentimentSnapshot | null;
}): string {
  const { sentiment, scenarios, previousSentiment } = input;
  const total = Math.max(1, sentiment.positive + sentiment.neutral + sentiment.negative);
  const posPct = Math.round((sentiment.positive / total) * 100);
  const neuPct = Math.round((sentiment.neutral / total) * 100);
  const negPct = 100 - posPct - neuPct;
  const prevTotal = previousSentiment
    ? Math.max(1, previousSentiment.positive + previousSentiment.neutral + previousSentiment.negative)
    : 0;
  const prevPosPct = previousSentiment ? Math.round((previousSentiment.positive / prevTotal) * 100) : null;
  const prevNeuPct = previousSentiment ? Math.round((previousSentiment.neutral / prevTotal) * 100) : null;
  const prevNegPct = previousSentiment ? 100 - (prevPosPct ?? 0) - (prevNeuPct ?? 0) : null;
  const delta = (now: number, prev: number | null) => (prev === null ? "N/A" : `${now - prev >= 0 ? "+" : ""}${now - prev}%`);
  const scoreDelta =
    previousSentiment === null ? "N/A" : `${sentiment.score - previousSentiment.score >= 0 ? "+" : ""}${sentiment.score - previousSentiment.score}`;

  const scenarioBars = scenarios
    .map(
      (s) => `
      <div class="scenario">
        <div class="scenarioTop">
          <strong>${escapeHtml(s.label)}</strong>
          <span>${s.pct}%</span>
        </div>
        <div class="scenarioTrack"><span class="scenarioFill" style="width:${s.pct}%"></span></div>
        <div class="hint">${escapeHtml(s.note)}</div>
      </div>
    `
    )
    .join("");

  return `
  <div class="chartEmbed">
    <h3>Biểu đồ hỗ trợ kịch bản (heuristic)</h3>
    <p class="disclaimer">Các biểu đồ dưới đây được tính từ chính tiêu đề/snippet/tóm tắt của bài viết thu thập được (không phải dữ liệu giá). Mục đích là hỗ trợ hình dung kịch bản, không phải dự báo chắc chắn.</p>
    <div class="chartGrid">
      <div class="chartCard">
        <h3>Cân bằng tin tức</h3>
        <p class="muted">So với lần cập nhật gần nhất: Tích cực ${delta(posPct, prevPosPct)} • Trung tính ${delta(
          neuPct,
          prevNeuPct
        )} • Tiêu cực ${delta(negPct, prevNegPct)} • Điểm ${scoreDelta}</p>
        <div class="stackSm">
          <div class="legendRow"><span class="dot pos"></span><span>Tích cực</span><span class="muted">${posPct}%</span></div>
          <div class="legendRow"><span class="dot neu"></span><span>Trung tính</span><span class="muted">${neuPct}%</span></div>
          <div class="legendRow"><span class="dot neg"></span><span>Tiêu cực</span><span class="muted">${negPct}%</span></div>
        </div>
        <div class="stackBar" aria-label="Sentiment distribution">
          <span class="seg pos" style="width:${posPct}%"></span>
          <span class="seg neu" style="width:${neuPct}%"></span>
          <span class="seg neg" style="width:${negPct}%"></span>
        </div>
      </div>
      <div class="chartCard span2">
        <h3>Trọng số kịch bản (tham khảo)</h3>
        ${scenarioBars}
        <p class="disclaimer"><strong>Disclaimer:</strong> This is not financial advice.</p>
      </div>
    </div>
  </div>
  `;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

