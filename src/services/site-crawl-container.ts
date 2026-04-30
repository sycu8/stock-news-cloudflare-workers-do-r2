import type { Env } from "../types";

export interface SiteCrawlDoc {
  url: string;
  title: string;
  text: string;
  crawledAt: string;
}

interface SiteCrawlContainer {
  id: string;
  baseUrl: string;
  seededAt: string;
  docs: SiteCrawlDoc[];
}

const CONTAINER_KEY = "ai_search:website_container:v1";

function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = "";
    u.searchParams.delete("utm_source");
    u.searchParams.delete("utm_medium");
    u.searchParams.delete("utm_campaign");
    u.searchParams.delete("utm_term");
    u.searchParams.delete("utm_content");
    return u.toString();
  } catch {
    return null;
  }
}

function extractLinks(html: string, baseUrl: string): string[] {
  const out = new Set<string>();
  const base = new URL(baseUrl);
  const re = /href\s*=\s*["']([^"'#]+)["']/gi;
  for (const m of html.matchAll(re)) {
    const href = m[1]?.trim();
    if (!href) continue;
    try {
      const u = new URL(href, baseUrl);
      if (u.origin !== base.origin) continue;
      if (/^\/(?:api|admin|cdn-cgi)\b/.test(u.pathname)) continue;
      const normalized = normalizeUrl(u.toString());
      if (!normalized) continue;
      out.add(normalized);
    } catch {
      // Skip invalid links.
    }
  }
  return Array.from(out);
}

function cleanText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return (titleMatch?.[1] ?? "Website page").replace(/\s+/g, " ").trim().slice(0, 180);
}

export async function crawlWebsiteIntoContainer(
  env: Env,
  params: { seedUrls: string[]; maxPages?: number; perPageTextLimit?: number }
): Promise<{ id: string; crawled: number; skipped: number; baseUrl: string; seededAt: string }> {
  const seeds = params.seedUrls.map((x) => normalizeUrl(x)).filter((x): x is string => Boolean(x));
  if (!seeds.length) throw new Error("No valid seed URLs");
  const maxPages = Math.min(Math.max(params.maxPages ?? 24, 1), 80);
  const perPageTextLimit = Math.min(Math.max(params.perPageTextLimit ?? 2600, 400), 10000);

  const base = new URL(seeds[0]!);
  const queue: string[] = [...new Set(seeds)];
  const visited = new Set<string>();
  const docs: SiteCrawlDoc[] = [];

  while (queue.length > 0 && docs.length < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    try {
      const resp = await fetch(url, {
        headers: { Accept: "text/html,application/xhtml+xml" },
        cf: { cacheTtl: 120, cacheEverything: false }
      });
      const contentType = resp.headers.get("content-type") ?? "";
      if (!resp.ok || !contentType.toLowerCase().includes("text/html")) continue;
      const html = await resp.text();
      const title = extractTitle(html);
      const text = cleanText(html).slice(0, perPageTextLimit);
      if (text.length >= 60) {
        docs.push({ url, title, text, crawledAt: new Date().toISOString() });
      }
      const links = extractLinks(html, url);
      for (const link of links) {
        if (queue.length + docs.length >= maxPages * 4) break;
        if (visited.has(link)) continue;
        if (new URL(link).origin !== base.origin) continue;
        queue.push(link);
      }
    } catch {
      // Best effort crawl: continue even if one page fails.
    }
  }

  const seededAt = new Date().toISOString();
  const container: SiteCrawlContainer = {
    id: `site-${Date.now().toString(36)}`,
    baseUrl: base.origin,
    seededAt,
    docs
  };
  await env.CACHE.put(CONTAINER_KEY, JSON.stringify(container), {
    expirationTtl: 60 * 60 * 24 * 7
  });
  return {
    id: container.id,
    crawled: container.docs.length,
    skipped: visited.size - container.docs.length,
    baseUrl: container.baseUrl,
    seededAt
  };
}

export async function getWebsiteContainerDocs(env: Env): Promise<SiteCrawlDoc[]> {
  const raw = await env.CACHE.get(CONTAINER_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SiteCrawlContainer;
    if (!parsed || !Array.isArray(parsed.docs)) return [];
    return parsed.docs
      .filter((d) => typeof d?.url === "string" && typeof d?.text === "string")
      .slice(0, 120);
  } catch {
    return [];
  }
}
