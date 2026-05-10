import type { StoredArticle } from "../types";
import { formatCalendarDateVietnam } from "../utils/date.js";

const FALLBACK_SLUG = "bai-viet";
const MAX_SLUG_LENGTH = 96;

export function buildArticleDetailPath(reportDate: string, articleUrl: string, title?: string | null): string {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(reportDate) ? reportDate : "today";
  const slug = slugifyArticleTitle(title || hostnameFromUrl(articleUrl) || FALLBACK_SLUG);
  return `/tin/${encodeURIComponent(safeDate)}/${slug}-${hashArticleUrl(articleUrl)}`;
}

/** Trang chủ/RSS luôn dùng `/tin/ngày/...` theo lịch VN của `publishedAt` (đồng bộ Telegram). */
export function buildArticleDetailHrefFromPublished(record: Pick<StoredArticle, "url" | "title" | "publishedAt">): string {
  const day = formatCalendarDateVietnam(record.publishedAt);
  return buildArticleDetailPath(day, record.url, record.title);
}

export function slugifyArticleTitle(input: string): string {
  const ascii = stripVietnameseDiacritics(input)
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  const compact = ascii.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
  return compact || FALLBACK_SLUG;
}

export function extractArticleUrlHashFromSlug(slugAndHash: string): string | null {
  const match = slugAndHash.match(/-([0-9a-f]{8})$/i);
  return match ? match[1].toLowerCase() : null;
}

export function findArticleByUrlHash<T extends Pick<StoredArticle, "url">>(articles: T[], hash: string | null): T | null {
  if (!hash) return null;
  const normalized = hash.toLowerCase();
  return articles.find((article) => hashArticleUrl(article.url) === normalized) ?? null;
}

export function hashArticleUrl(url: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < url.length; i += 1) {
    hash ^= url.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}

function stripVietnameseDiacritics(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[Đđ]/g, "d");
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}
