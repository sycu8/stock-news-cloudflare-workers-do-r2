import type { StoredArticle } from "../types";

const DEFAULT_PUBLIC_ORIGIN = "https://vietstock.info";

export function buildTelegramArticleHref(
  article: Pick<StoredArticle, "title" | "url" | "publishedAt">,
  publicOrigin = DEFAULT_PUBLIC_ORIGIN
): string {
  const origin = normalizePublicOrigin(publicOrigin);
  const reportDate = formatCalendarDateVietnam(article.publishedAt);
  return `${origin}${buildArticleDetailPathForTelegram(reportDate, article.url, article.title)}`;
}

function normalizePublicOrigin(input: string): string {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" && url.protocol !== "http:") return DEFAULT_PUBLIC_ORIGIN;
    return url.origin.replace(/\/$/, "");
  } catch {
    return DEFAULT_PUBLIC_ORIGIN;
  }
}

function formatCalendarDateVietnam(isoLike: string): string {
  const date = new Date(isoLike);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

function buildArticleDetailPathForTelegram(reportDate: string, articleUrl: string, title: string): string {
  const slug = slugifyArticleTitle(title);
  return `/tin/${encodeURIComponent(reportDate)}/${slug}-${hashArticleUrl(articleUrl)}`;
}

function slugifyArticleTitle(input: string): string {
  const ascii = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[Đđ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "");
  return ascii.slice(0, 96).replace(/-+$/g, "") || "bai-viet";
}

function hashArticleUrl(url: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < url.length; i += 1) {
    hash ^= url.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}
