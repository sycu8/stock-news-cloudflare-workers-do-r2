import type { HSXMarketSnapshot, HSXTopVolumeItem, StoredArticle } from "../types";

export type ArticleImpactDirection = "positive" | "neutral" | "negative";
export type ArticleImpactRelation = "direct" | "sector";

export interface ArticleImpactStock {
  symbol: string;
  direction: ArticleImpactDirection;
  relation: ArticleImpactRelation;
  price?: string;
  reason: string;
}

const SECTOR_SYMBOLS: Array<{ keywords: string[]; symbols: string[] }> = [
  { keywords: ["ngan hang", "tin dung", "lai suat", "nha bang"], symbols: ["VCB", "BID", "CTG", "MBB", "TCB"] },
  { keywords: ["bat dong san", "dia oc", "nha o", "khu cong nghiep"], symbols: ["VHM", "VIC", "KDH", "NVL", "BCM"] },
  { keywords: ["thep", "ton ma", "vat lieu xay dung"], symbols: ["HPG", "HSG", "NKG"] },
  { keywords: ["chung khoan", "moi gioi", "margin"], symbols: ["SSI", "VCI", "VND", "HCM"] },
  { keywords: ["dau khi", "xang dau", "gia dau"], symbols: ["GAS", "PLX", "PVD", "PVS"] },
  { keywords: ["ban le", "tieu dung", "dien may"], symbols: ["MWG", "FRT", "PNJ"] },
  { keywords: ["cong nghe", "chuyen doi so", "phan mem"], symbols: ["FPT", "CMG"] },
  { keywords: ["hang khong", "du lich"], symbols: ["VJC", "HVN", "ACV"] }
];

const TICKER_RE = /\b[A-Z]{3,4}\b/g;

export function analyzeArticleMarketImpact(
  article: Pick<StoredArticle, "title" | "summaryVi" | "snippet">,
  hsxMarketSnapshot?: Pick<HSXMarketSnapshot, "topVolume"> | null
): ArticleImpactStock[] {
  const text = `${article.title}\n${article.summaryVi ?? ""}\n${article.snippet ?? ""}`;
  const normalized = normalizeForSearch(text);
  const sentiment = classifyImpactDirection(text);
  const priceMap = buildPriceMap(hsxMarketSnapshot?.topVolume ?? []);
  const out = new Map<string, ArticleImpactStock>();

  for (const symbol of extractMentionedSymbols(text)) {
    out.set(symbol, {
      symbol,
      direction: sentiment,
      relation: "direct",
      price: priceMap.get(symbol),
      reason: `Được nhắc trực tiếp trong tin; sắc thái tin đang nghiêng ${directionVietnamese(sentiment)}.`
    });
  }

  for (const bucket of SECTOR_SYMBOLS) {
    if (!bucket.keywords.some((keyword) => normalized.includes(keyword))) continue;
    for (const symbol of bucket.symbols) {
      if (out.has(symbol)) continue;
      out.set(symbol, {
        symbol,
        direction: sentiment,
        relation: "sector",
        price: priceMap.get(symbol),
        reason: `Liên quan cùng nhóm ngành; tác động dự kiến ${directionVietnamese(sentiment)} nếu thông tin được thị trường phản ánh.`
      });
      if (out.size >= 8) break;
    }
    if (out.size >= 8) break;
  }

  return Array.from(out.values()).slice(0, 8);
}

function extractMentionedSymbols(text: string): string[] {
  const ignore = new Set(["GDP", "USD", "VND", "ETF", "IPO", "CEO", "CFO", "HOSE", "HNX", "UPCOM"]);
  const symbols = new Set<string>();
  for (const match of text.matchAll(TICKER_RE)) {
    const symbol = match[0].toUpperCase();
    if (!ignore.has(symbol)) symbols.add(symbol);
  }
  return Array.from(symbols).slice(0, 8);
}

function buildPriceMap(items: HSXTopVolumeItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    if (item.symbol && item.price) map.set(item.symbol.toUpperCase(), item.price);
  }
  return map;
}

function classifyImpactDirection(text: string): ArticleImpactDirection {
  const normalized = normalizeForSearch(text);
  const positiveTerms = ["tang", "but pha", "khoi sac", "tich cuc", "loi nhuan", "vuot", "ky vong", "mua rong", "cai thien"];
  const negativeTerms = ["giam", "dieu chinh", "ap luc", "rui ro", "than trong", "ban rong", "suy yeu", "lo", "kem"];
  let score = 0;
  for (const term of positiveTerms) if (normalized.includes(term)) score += 1;
  for (const term of negativeTerms) if (normalized.includes(term)) score -= 1;
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

function directionVietnamese(direction: ArticleImpactDirection): string {
  if (direction === "positive") return "tích cực";
  if (direction === "negative") return "tiêu cực";
  return "trung lập";
}

function normalizeForSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[Đđ]/g, "d")
    .toLowerCase();
}
