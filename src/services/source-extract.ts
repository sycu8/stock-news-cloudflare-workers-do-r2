import { stripHtml, truncate } from "../utils/text";

export interface SourceExtraction {
  imageUrl: string | null;
  text: string;
}

export async function fetchAndExtractSource(url: string): Promise<SourceExtraction | null> {
  try {
    const target = new URL(url);
    if (target.protocol !== "http:" && target.protocol !== "https:") return null;

    const resp = await fetch(url, {
      headers: {
        "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
        Accept: "text/html,application/xhtml+xml"
      }
    });
    if (!resp.ok) return null;
    const html = await resp.text();

    const ogImage = pickMeta(html, "og:image") ?? pickMeta(html, "twitter:image") ?? null;
    const description =
      pickMeta(html, "description") ??
      pickMeta(html, "og:description") ??
      pickMeta(html, "twitter:description") ??
      "";

    // Very lightweight text extraction: strip tags from body and take first chunk.
    const body = pickBody(html);
    const bodyText = truncate(stripHtml(body), 2200);
    const descText = truncate(stripHtml(description), 500);
    const merged = truncate([descText, bodyText].filter(Boolean).join("\n"), 2400);

    return {
      imageUrl: normalizeMaybeRelativeUrl(ogImage, url),
      text: merged
    };
  } catch {
    return null;
  }
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
    if (value) return value;
  }
  return null;
}

function pickBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m?.[1] ?? html;
}

function normalizeMaybeRelativeUrl(input: string | null, pageUrl: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed, pageUrl).toString();
  } catch {
    return null;
  }
}

