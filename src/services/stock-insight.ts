import type { Env, HSXMarketSnapshot, StoredArticle } from "../types";
import { getFeedByDate } from "./refresh";
import { analyzeSentimentForArticles, classifySentimentText } from "./sentiment";
import { getHSXMarketSnapshot, getStockChartRange } from "./hsx-market";

export interface StockInsight {
  symbol: string;
  reportDate: string;
  latestNews: StoredArticle[];
  sentiment: ReturnType<typeof analyzeSentimentForArticles>;
  mentionTrend: Array<{ hourLabel: string; count: number }>;
  priceChart1M: Array<{ time: number; closePrice: number; volume: number }>;
  foreignFlow: { buyMentions: number; sellMentions: number; net: "buy" | "sell" | "neutral" };
  volumeAbnormality: {
    level: "high" | "normal" | "unknown";
    ratioPct: number | null;
    volumeText: string | null;
    latestVolume: number | null;
    avg20Volume: number | null;
  };
  relativePerformance1M: { stockPct: number | null; vnindexPct: number | null; alphaPct: number | null };
  relatedCompanies: string[];
  bullCases: string[];
  bearCases: string[];
  hsxSnapshot: HSXMarketSnapshot | null;
}

export async function buildStockInsight(env: Env, symbolRaw: string, reportDate: string): Promise<StockInsight> {
  const symbol = sanitizeSymbol(symbolRaw);
  const [feed, hsxSnapshot] = await Promise.all([
    getFeedByDate(env, reportDate, { page: 1, pageSize: 200 }),
    getHSXMarketSnapshot(env)
  ]);
  const priceChart1M = await getStockChartRange(env, symbol, "1m");
  const bySymbol = feed.articles.filter((a) => mentionsSymbol(a, symbol));
  const latestNews = bySymbol.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 20);
  const sentiment = analyzeSentimentForArticles(bySymbol);
  const mentionTrend = buildHourlyMentions(bySymbol);
  const foreignFlow = estimateForeignFlow(bySymbol, symbol);
  const volumeAbnormality = detectVolumeAbnormality(hsxSnapshot, symbol, priceChart1M);
  const relativePerformance1M = computeRelativePerformance(priceChart1M, hsxSnapshot?.vnindex1M ?? []);
  const relatedCompanies = extractRelatedTickers(bySymbol, symbol).slice(0, 8);
  const { bullCases, bearCases } = extractBullBearCases(bySymbol);

  return {
    symbol,
    reportDate,
    latestNews,
    sentiment,
    mentionTrend,
    priceChart1M: priceChart1M.map((x) => ({ time: x.time, closePrice: x.closePrice, volume: x.volume })),
    foreignFlow,
    volumeAbnormality,
    relativePerformance1M,
    relatedCompanies,
    bullCases,
    bearCases,
    hsxSnapshot
  };
}

function sanitizeSymbol(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

function mentionsSymbol(article: StoredArticle, symbol: string): boolean {
  if (!symbol) return false;
  const re = new RegExp(`\\b${symbol}\\b`, "i");
  return re.test(`${article.title} ${article.summaryVi ?? ""} ${article.snippet}`);
}

function buildHourlyMentions(articles: StoredArticle[]): Array<{ hourLabel: string; count: number }> {
  const bins = new Array<number>(24).fill(0);
  for (const item of articles) {
    const d = new Date(item.publishedAt);
    const hour = Number.isNaN(d.getTime()) ? 0 : d.getUTCHours();
    bins[Math.max(0, Math.min(23, hour))] += 1;
  }
  return bins.map((count, hour) => ({ hourLabel: `${String(hour).padStart(2, "0")}:00`, count }));
}

function estimateForeignFlow(
  articles: StoredArticle[],
  symbol: string
): { buyMentions: number; sellMentions: number; net: "buy" | "sell" | "neutral" } {
  let buyMentions = 0;
  let sellMentions = 0;
  const re = new RegExp(`\\b${symbol}\\b`, "i");
  for (const item of articles) {
    const text = `${item.title} ${item.summaryVi ?? ""} ${item.snippet}`.toLowerCase();
    if (!re.test(text)) continue;
    if (/(khối ngoại|nước ngoài|foreign).*(mua ròng|mua)/i.test(text) || /(mua ròng).*(khối ngoại|foreign)/i.test(text)) {
      buyMentions += 1;
    }
    if (/(khối ngoại|nước ngoài|foreign).*(bán ròng|bán)/i.test(text) || /(bán ròng).*(khối ngoại|foreign)/i.test(text)) {
      sellMentions += 1;
    }
  }
  const net = buyMentions > sellMentions ? "buy" : sellMentions > buyMentions ? "sell" : "neutral";
  return { buyMentions, sellMentions, net };
}

function detectVolumeAbnormality(
  hsxSnapshot: HSXMarketSnapshot | null,
  symbol: string,
  chart1M: Array<{ volume: number }>
): {
  level: "high" | "normal" | "unknown";
  ratioPct: number | null;
  volumeText: string | null;
  latestVolume: number | null;
  avg20Volume: number | null;
} {
  const row = hsxSnapshot?.topVolume.find((x) => x.symbol.toUpperCase() === symbol);
  const volumes = chart1M.map((x) => x.volume).filter((v) => Number.isFinite(v) && v > 0);
  const recent20 = volumes.slice(-20);
  const latestVolume = recent20.length ? recent20[recent20.length - 1]! : null;
  const avg20Volume = recent20.length ? recent20.reduce((s, v) => s + v, 0) / recent20.length : null;
  if (!row) return { level: "unknown", ratioPct: null, volumeText: null, latestVolume, avg20Volume };
  const ratio = Number.parseFloat((row.ratioPct ?? "").replace(",", "."));
  if (!Number.isFinite(ratio)) {
    return { level: "unknown", ratioPct: null, volumeText: row.volume ?? null, latestVolume, avg20Volume };
  }
  const spike = latestVolume && avg20Volume && avg20Volume > 0 ? latestVolume / avg20Volume : 1;
  return {
    level: ratio >= 8 || spike >= 1.7 ? "high" : "normal",
    ratioPct: ratio,
    volumeText: row.volume ?? null,
    latestVolume,
    avg20Volume
  };
}

function extractRelatedTickers(articles: StoredArticle[], symbol: string): string[] {
  const freq = new Map<string, number>();
  for (const item of articles) {
    const text = `${item.title} ${item.summaryVi ?? ""} ${item.snippet}`;
    for (const match of text.matchAll(/\b[A-Z]{2,5}\b/g)) {
      const t = (match[0] ?? "").toUpperCase();
      if (!t || t === symbol) continue;
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

function extractBullBearCases(articles: StoredArticle[]): { bullCases: string[]; bearCases: string[] } {
  const bull: string[] = [];
  const bear: string[] = [];
  const sorted = articles.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  for (const item of sorted) {
    const text = `${item.title}\n${item.summaryVi ?? ""}\n${item.snippet}`;
    const sentiment = classifySentimentText(text);
    if (sentiment.label === "positive" && bull.length < 4) bull.push(item.title);
    if (sentiment.label === "negative" && bear.length < 4) bear.push(item.title);
    if (bull.length >= 4 && bear.length >= 4) break;
  }
  return { bullCases: bull, bearCases: bear };
}

function computeRelativePerformance(
  stock: Array<{ closePrice: number }>,
  index: Array<{ closePrice: number }>
): { stockPct: number | null; vnindexPct: number | null; alphaPct: number | null } {
  const perf = (points: Array<{ closePrice: number }>): number | null => {
    if (points.length < 2) return null;
    const first = points[0]!.closePrice;
    const last = points[points.length - 1]!.closePrice;
    if (!Number.isFinite(first) || !Number.isFinite(last) || first <= 0) return null;
    return ((last - first) / first) * 100;
  };
  const stockPct = perf(stock);
  const vnindexPct = perf(index);
  const alphaPct = stockPct !== null && vnindexPct !== null ? stockPct - vnindexPct : null;
  return { stockPct, vnindexPct, alphaPct };
}
