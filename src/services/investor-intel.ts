import type { DailyReport, Env, HSXMarketSnapshot, HSXTopVolumeItem, HSXVNIndexPoint, StoredArticle } from "../types";
import type { SentimentSnapshot } from "./sentiment";
import { analyzeSentimentForArticles, classifySentimentText } from "./sentiment";

const INTEL_INDEX_KEY = "intel:index_dates";
const INTEL_R2_PREFIX = "intel/daily/";

export interface SectorBucket {
  id: string;
  labelVi: string;
  count: number;
  sharePct: number;
}

export interface FearGreedResult {
  value: number;
  labelVi: string;
  detailVi: string;
}

export interface InvestorDailySnapshot {
  version: 1;
  reportDate: string;
  generatedAt: string;
  articleCount: number;
  fearGreed: FearGreedResult;
  sectors: SectorBucket[];
  smartMoney: Array<{ symbol: string; volume: string; ratioPct: string }>;
  topHeadlines: Array<{ title: string; url: string; impact: number }>;
}

const SECTOR_DEFS: Array<{ id: string; labelVi: string; test: (t: string) => boolean }> = [
  { id: "bank", labelVi: "Ngân hàng", test: (t) => /ngân hàng|bank|nhnn|tín dụng|lãi suất|nợ xấu/i.test(t) },
  { id: "securities", labelVi: "Chứng khoán", test: (t) => /chứng khoán|broker|margin|room|tự doanh ck/i.test(t) },
  { id: "real_estate", labelVi: "Bất động sản", test: (t) => /bất động sản|địa ốc|khu đô thị|bđs|real estate/i.test(t) },
  { id: "steel", labelVi: "Thép / vật liệu", test: (t) => /thép|hoà phát|gang thép|xi măng/i.test(t) },
  { id: "oil", labelVi: "Dầu khí / năng lượng", test: (t) => /dầu khí|petro|lng|điện|năng lượng|pv/i.test(t) },
  { id: "consumer", labelVi: "Tiêu dùng / bán lẻ", test: (t) => /bán lẻ|tiêu dùng|fmcg|hàng tiêu dùng/i.test(t) },
  { id: "tech", labelVi: "Công nghệ", test: (t) => /công nghệ|fintech|ai|phần mềm|digital/i.test(t) },
  { id: "macro", labelVi: "Vĩ mô / thị trường", test: (t) => /vn-index|vnindex|fed|cpi|gdp|vĩ mô|thị trường cơ sở/i.test(t) },
  { id: "other", labelVi: "Khác / đa ngành", test: () => true }
];

/** 0–100 heuristic: attention + sentiment + source confirmation. */
export function computeNewsImpactScore(article: StoredArticle, hotScore: number): number {
  const blob = `${article.title}\n${article.summaryVi ?? ""}\n${article.snippet}`;
  const { label, score } = classifySentimentText(blob);
  const sentBoost = label === "positive" ? 8 : label === "negative" ? 10 : 4;
  const conf =
    article.confirmationLevel === "confirmed" ? 12 : article.confirmationLevel === "breaking" ? 6 : 0;
  const base = Math.min(40, hotScore * 3 + sentBoost + conf + Math.min(20, Math.floor(blob.length / 120)));
  const polarity = Math.abs(score) * 4;
  return Math.max(12, Math.min(100, Math.round(base + polarity)));
}

export function vnIndexRecentChangePct(points: HSXVNIndexPoint[]): number | null {
  if (points.length < 2) return null;
  const first = points[0]!.closePrice;
  const last = points[points.length - 1]!.closePrice;
  if (!first || !Number.isFinite(first) || !Number.isFinite(last)) return null;
  return ((last - first) / first) * 100;
}

export function computeFearGreedVn(sentiment: SentimentSnapshot, articleCount: number, vn1wChangePct: number | null): FearGreedResult {
  const n = Math.max(1, articleCount);
  const tilt = (sentiment.positive - sentiment.negative) / n;
  let v = 50 + tilt * 38 + Math.tanh(sentiment.score / Math.max(8, n)) * 12;
  if (vn1wChangePct != null && Number.isFinite(vn1wChangePct)) {
    v += Math.max(-18, Math.min(18, vn1wChangePct * 6));
  }
  v = Math.round(Math.max(0, Math.min(100, v)));
  let labelVi = "Trung lập";
  let detailVi = "Tổng hợp từ sentiment tin trong ngày và biến động VN-Index 1 tuần (heuristic, không phải chỉ số CNN).";
  if (v <= 24) labelVi = "Sợ hãi mạnh";
  else if (v <= 42) labelVi = "Thận trọng";
  else if (v <= 58) labelVi = "Trung lập";
  else if (v <= 76) labelVi = "Tự tin";
  else labelVi = "Tham lam mạnh";
  return { value: v, labelVi, detailVi };
}

export function computeSectorRotation(articles: StoredArticle[]): SectorBucket[] {
  const counts = new Map<string, number>();
  const labelById = new Map(SECTOR_DEFS.map((d) => [d.id, d.labelVi] as const));
  for (const a of articles) {
    const t = `${a.title} ${a.summaryVi ?? ""} ${a.snippet}`.toLowerCase();
    const def =
      SECTOR_DEFS.find((d) => d.id !== "other" && d.test(t)) ?? SECTOR_DEFS.find((d) => d.id === "other")!;
    counts.set(def.id, (counts.get(def.id) ?? 0) + 1);
  }
  const total = articles.length || 1;
  const buckets: SectorBucket[] = Array.from(counts.entries())
    .map(([id, count]) => ({
      id,
      labelVi: labelById.get(id) ?? id,
      count,
      sharePct: Math.round((count / total) * 1000) / 10
    }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count);
  return buckets.slice(0, 10);
}

function topVolumeLite(rows: HSXTopVolumeItem[], max = 12): Array<{ symbol: string; volume: string; ratioPct: string }> {
  return rows.slice(0, max).map((r) => ({ symbol: r.symbol, volume: r.volume, ratioPct: r.ratioPct }));
}

export function buildDailyInvestorSnapshot(params: {
  reportDate: string;
  articles: StoredArticle[];
  sentiment: SentimentSnapshot;
  report: DailyReport;
  hsx: HSXMarketSnapshot | null;
  hotScoreFn: (a: StoredArticle) => number;
}): InvestorDailySnapshot {
  const { reportDate, articles, sentiment, hsx, hotScoreFn } = params;
  const vnChg = hsx ? vnIndexRecentChangePct(hsx.vnindex1W) : null;
  const fearGreed = computeFearGreedVn(sentiment, articles.length, vnChg);
  const sectors = computeSectorRotation(articles);
  const smartMoney = hsx ? topVolumeLite(hsx.topVolume) : [];
  const scored = articles
    .map((a) => ({ a, impact: computeNewsImpactScore(a, hotScoreFn(a)) }))
    .sort((x, y) => y.impact - x.impact)
    .slice(0, 8)
    .map(({ a, impact }) => ({ title: a.title, url: a.url, impact }));
  return {
    version: 1,
    reportDate,
    generatedAt: new Date().toISOString(),
    articleCount: articles.length,
    fearGreed,
    sectors,
    smartMoney,
    topHeadlines: scored
  };
}

export async function persistInvestorDailySnapshot(env: Env, snapshot: InvestorDailySnapshot): Promise<void> {
  const body = JSON.stringify(snapshot);
  const r2Key = `${INTEL_R2_PREFIX}${snapshot.reportDate}.json`;
  if (env.ASSETS) {
    try {
      await env.ASSETS.put(r2Key, body, {
        httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "public, max-age=31536000, immutable" }
      });
    } catch (e) {
      console.error("intel R2 put failed:", e);
    }
  }
  try {
    const prev = await env.CACHE.get(INTEL_INDEX_KEY, "json");
    const arr = Array.isArray(prev) ? (prev as string[]) : [];
    const next = [snapshot.reportDate, ...arr.filter((d) => d !== snapshot.reportDate)].slice(0, 120);
    await env.CACHE.put(INTEL_INDEX_KEY, JSON.stringify(next), { expirationTtl: 60 * 60 * 24 * 400 });
  } catch (e) {
    console.error("intel index KV failed:", e);
  }
}

export async function loadInvestorSnapshotFromR2(env: Env, reportDate: string): Promise<InvestorDailySnapshot | null> {
  if (!env.ASSETS) return null;
  const obj = await env.ASSETS.get(`${INTEL_R2_PREFIX}${reportDate}.json`);
  if (!obj) return null;
  try {
    const t = await obj.text();
    const parsed = JSON.parse(t) as InvestorDailySnapshot;
    if (parsed?.version === 1 && parsed.reportDate) return parsed;
  } catch {
    return null;
  }
  return null;
}

export async function listIntelArchiveDates(env: Env): Promise<string[]> {
  const raw = await env.CACHE.get(INTEL_INDEX_KEY, "json");
  return Array.isArray(raw) ? (raw as string[]) : [];
}

export function filterArticlesForPortfolio(articles: StoredArticle[], symbols: string[]): StoredArticle[] {
  if (!symbols.length) return articles;
  const set = new Set(symbols.map((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "")).filter(Boolean));
  return articles.filter((a) => {
    const t = `${a.title} ${a.summaryVi ?? ""} ${a.snippet}`;
    for (const sym of set) {
      if (sym.length >= 2 && new RegExp(`\\b${sym}\\b`, "i").test(t)) return true;
    }
    return false;
  });
}

export function parsePortfolioSymbols(raw: string | undefined | null, max = 18): string[] {
  if (!raw) return [];
  const parts = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    if (p.length > 8 || p.length < 2) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= max) break;
  }
  return out;
}
