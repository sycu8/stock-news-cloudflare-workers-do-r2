export interface EnglishArticleTranslation {
  title: string;
  summary: string;
  analysis: string;
  sourceName?: string;
}

const TRANSLATION_CACHE_PREFIX = "article-translation:en:v1";

export function buildArticleTranslationCacheKey(articleUrl: string): string {
  return `${TRANSLATION_CACHE_PREFIX}:${hashFNV1a(articleUrl)}`;
}

/** Characters typical of Vietnamese prose (helps reject non-English model output). */
const VI_TEXT_MARKERS =
  /[ÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỴĐàáảãạắằẳẵặấầẩẫậèéẻẽẹếềểễệìíỉĩịòóỏõọốồổỗộớờởợùúủũụứựửữỳýỷỵđ]/gu;

/** Reject payloads that still look Vietnamese (Workers AI sometimes ignores “English-only”). */
export function looksLikeVietnameseForInvestorEnglish(text: string): boolean {
  const t = text.trim();
  if (!t.length) return false;
  const matches = t.match(VI_TEXT_MARKERS);
  const count = matches ? matches.length : 0;
  if (count < 3) return false;
  const compact = t.replace(/\s+/g, "").length || 1;
  return count >= 6 || count / compact >= 0.035;
}

export function normalizeEnglishArticleTranslation(input: unknown): EnglishArticleTranslation | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Partial<EnglishArticleTranslation>;
  const title = cleanText(row.title);
  const summary = cleanText(row.summary);
  const analysis = cleanText(row.analysis);
  const sourceName = cleanText(row.sourceName);
  if (!isUseful(title) || !isUseful(summary)) return null;
  if (looksLikeVietnameseForInvestorEnglish(title) || looksLikeVietnameseForInvestorEnglish(summary)) {
    return null;
  }
  const analysisOut = isUseful(analysis) ? analysis : summary;
  if (looksLikeVietnameseForInvestorEnglish(analysisOut)) return null;
  return {
    title,
    summary,
    analysis: analysisOut,
    ...(sourceName && !looksLikeVietnameseForInvestorEnglish(sourceName) ? { sourceName } : {})
  };
}

function cleanText(input: unknown): string {
  return typeof input === "string" ? input.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() : "";
}

function isUseful(input: string): boolean {
  return input.replace(/[-*•\s.]+/gu, "").length >= 8;
}

function hashFNV1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}
