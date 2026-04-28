import type { StoredArticle } from "../types";
import { stripHtml } from "../utils/text";

const STOPWORDS = new Set([
  "và",
  "là",
  "của",
  "trong",
  "với",
  "cho",
  "từ",
  "đến",
  "khi",
  "đã",
  "đang",
  "sẽ",
  "một",
  "các",
  "những",
  "về",
  "theo",
  "trên",
  "dưới",
  "giữa",
  "tại",
  "này",
  "đó",
  "hôm",
  "nay",
  "thị",
  "trường",
  "chứng",
  "khoán",
  "việt",
  "nam",
  "tin",
  "bản",
  "ngày",
  "phiên",
  "cổ",
  "phiếu",
  "vn",
  "hose",
  "hnx",
  "upcom"
]);

export function extractHotKeywords(articles: StoredArticle[], max = 12): string[] {
  const phraseFreq = new Map<string, number>();
  const tickerFreq = new Map<string, number>();

  for (const a of articles) {
    // 1) Tickers / company codes (keep original casing from title/snippet)
    const raw = stripHtml(`${a.title} ${a.summaryVi ?? ""} ${a.snippet}`);
    for (const match of raw.matchAll(/\b[A-Z]{2,5}\b/g)) {
      const t = match[0];
      if (!t) continue;
      tickerFreq.set(t, (tickerFreq.get(t) ?? 0) + 1);
    }

    // 2) Phrases (2-3 words) from Vietnamese text
    const text = raw.toLowerCase();
    const cleaned = stripHtml(text)
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

    const tokens = cleaned
      .split(" ")
      .filter(Boolean)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));

    // bigrams + trigrams (prefer phrases)
    for (let i = 0; i < tokens.length; i++) {
      const bi = i + 1 < tokens.length ? `${tokens[i]} ${tokens[i + 1]}` : "";
      const tri = i + 2 < tokens.length ? `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}` : "";
      if (bi) phraseFreq.set(bi, (phraseFreq.get(bi) ?? 0) + 1);
      if (tri) phraseFreq.set(tri, (phraseFreq.get(tri) ?? 0) + 1);
    }
  }

  const tickers = Array.from(tickerFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.min(6, max))
    .map(([k]) => k);

  const phrases = Array.from(phraseFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max * 2)
    .map(([k]) => k)
    .filter((k) => {
      // drop phrases that are mostly stopwords
      const parts = k.split(" ");
      return parts.every((p) => !STOPWORDS.has(p));
    });

  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tickers) {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      out.push(t);
      seen.add(key);
    }
  }
  for (const p of phrases) {
    const key = p.toLowerCase();
    if (out.length >= max) break;
    if (!seen.has(key)) {
      out.push(p);
      seen.add(key);
    }
  }
  return out.slice(0, max);
}

