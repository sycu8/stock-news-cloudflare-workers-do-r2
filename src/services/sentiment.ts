import type { StoredArticle } from "../types";
import { stripHtml } from "../utils/text";

const POSITIVE_TERMS = [
  "tăng",
  "bứt phá",
  "khởi sắc",
  "tích cực",
  "mở rộng",
  "lợi nhuận",
  "vượt",
  "kỳ vọng",
  "mua ròng",
  "cải thiện",
  "đột biến"
];

const NEGATIVE_TERMS = [
  "giảm",
  "điều chỉnh",
  "áp lực",
  "rủi ro",
  "thận trọng",
  "bán ròng",
  "suy yếu",
  "lỗ",
  "kém",
  "biến động",
  "lo ngại"
];

export type SentimentLabel = "positive" | "neutral" | "negative";

export interface SentimentSnapshot {
  positive: number;
  neutral: number;
  negative: number;
  score: number;
}

export function classifySentimentText(text: string): { label: SentimentLabel; score: number } {
  const cleaned = stripHtml(text.toLowerCase());
  let score = 0;
  for (const term of POSITIVE_TERMS) {
    if (cleaned.includes(term)) score += 1;
  }
  for (const term of NEGATIVE_TERMS) {
    if (cleaned.includes(term)) score -= 1;
  }
  if (score > 0) return { label: "positive", score };
  if (score < 0) return { label: "negative", score };
  return { label: "neutral", score };
}

export function analyzeSentimentForArticles(articles: StoredArticle[]): SentimentSnapshot {
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  let score = 0;
  for (const a of articles) {
    const one = classifySentimentText(`${a.title}\n${a.summaryVi ?? ""}\n${a.snippet}`);
    score += one.score;
    if (one.label === "positive") positive += 1;
    else if (one.label === "negative") negative += 1;
    else neutral += 1;
  }
  return { positive, neutral, negative, score };
}

