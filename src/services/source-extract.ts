import { stripHtml, truncate } from "../utils/text";

export interface SourceExtraction {
  imageUrl: string | null;
  text: string;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchAndExtractSource(url: string): Promise<SourceExtraction | null> {
  try {
    const target = new URL(url);
    if (target.protocol !== "http:" && target.protocol !== "https:") return null;

    const resp = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8"
      },
      redirect: "follow"
    });
    if (!resp.ok) return null;
    const html = await resp.text();

    const ogImage =
      pickMeta(html, "og:image") ??
      pickMeta(html, "og:image:url") ??
      pickMeta(html, "twitter:image") ??
      pickMeta(html, "twitter:image:src") ??
      null;
    const articleImage = pickArticleImageFromHtml(html, url);
    const description =
      pickMeta(html, "description") ??
      pickMeta(html, "og:description") ??
      pickMeta(html, "twitter:description") ??
      "";

    const body = pickBody(html);
    const bodyText = truncate(stripHtml(body), 2200);
    const descText = truncate(stripHtml(description), 500);
    const merged = truncate([descText, bodyText].filter(Boolean).join("\n"), 2400);

    return {
      imageUrl: normalizeMaybeRelativeUrl(ogImage ?? articleImage, url),
      text: merged
    };
  } catch {
    return null;
  }
}

/** Fallback when meta tags are missing (common on CNBC and similar publishers). */
export function pickArticleImageFromHtml(html: string, pageUrl: string): string | null {
  const candidates: string[] = [];

  for (const match of html.matchAll(/https?:\/\/image\.cnbcfm\.com\/api\/v1\/image\/[^"'<> \t]+/gi)) {
    candidates.push(decodeHtmlEntities(match[0]!));
  }

  for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    const src = decodeHtmlEntities(match[1] ?? "").trim();
    if (!src || src.startsWith("data:")) continue;
    if (/\.(svg|gif)(\?|$)/i.test(src)) continue;
    if (/logo|icon|avatar|sprite|pixel|tracking|1x1|spacer|badge|button/i.test(src)) continue;
    candidates.push(src);
  }

  for (const raw of candidates) {
    const abs = normalizeMaybeRelativeUrl(raw, pageUrl);
    if (abs && looksLikeArticlePhoto(abs)) return abs;
  }
  return null;
}

function looksLikeArticlePhoto(url: string): boolean {
  if (/logo|icon|avatar|sprite|pixel|tracking|1x1|spacer|badge|button|placeholder/i.test(url)) return false;
  if (/\.(svg|gif)(\?|$)/i.test(url)) return false;
  return /^https?:\/\//i.test(url);
}

function pickMeta(html: string, propertyOrName: string): string | null {
  const escaped = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, "i")
  ];
  for (const re of patterns) {
    const m = html.match(re);
    const value = m?.[1]?.trim();
    if (value) return decodeHtmlEntities(value);
  }
  return null;
}

function pickBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m?.[1] ?? html;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeMaybeRelativeUrl(input: string | null, pageUrl: string): string | null {
  if (!input) return null;
  const trimmed = decodeHtmlEntities(input.trim());
  if (!trimmed) return null;
  try {
    return new URL(trimmed, pageUrl).toString();
  } catch {
    return null;
  }
}
