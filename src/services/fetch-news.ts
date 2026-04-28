import { XMLParser } from "fast-xml-parser";
import { listEnabledSources, logCrawlRun } from "../db";
import type { Env, NewsSourceRecord, NormalizedArticle } from "../types";
import { toIsoOrNow } from "../utils/date";
import { normalizeTitle, stripHtml, truncate } from "../utils/text";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true
});

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  guid?: string | { "#text"?: string };
}

export async function fetchAllSources(): Promise<NormalizedArticle[]> {
  throw new Error("fetchAllSources now requires env; use fetchAllSourcesFromDb(env)");
}

export async function fetchAllSourcesFromDb(env: Env): Promise<NormalizedArticle[]> {
  const enabledSources = await listEnabledSources(env.DB);
  const grouped = await Promise.all(
    enabledSources.map(async (source) => {
      const result = await fetchSource(env, source);
      await logCrawlRun(env.DB, {
        sourceId: source.id,
        status: result.status,
        message: result.message,
        fetchedCount: result.items.length
      });
      return result.items;
    })
  );
  const merged = grouped.flat();

  const dedupeMap = new Map<string, NormalizedArticle>();
  for (const item of merged) {
    const key = `${item.url}::${normalizeTitle(item.title)}::${item.publishedAt.slice(0, 10)}`;
    if (!dedupeMap.has(key)) {
      dedupeMap.set(key, item);
    }
  }

  return Array.from(dedupeMap.values());
}

async function fetchSource(
  _env: Env,
  source: NewsSourceRecord
): Promise<{ status: "success" | "error"; message: string; items: NormalizedArticle[] }> {
  try {
    if (source.type === "rss") {
      const items = await fetchRssSource(source);
      return { status: "success", message: `Fetched ${items.length} item(s) from rss`, items };
    }
    if (source.type === "html_list") {
      const items = await crawlHtmlListSource(source);
      return { status: "success", message: `Fetched ${items.length} item(s) from html_list`, items };
    }
    return { status: "success", message: "Unsupported source type skipped", items: [] };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown fetch error",
      items: []
    };
  }
}

async function fetchRssSource(source: NewsSourceRecord): Promise<NormalizedArticle[]> {
  try {
    const url = source.feedUrl ?? source.listUrl ?? source.baseUrl;
    if (!url) {
      return [];
    }

    const resp = await fetch(url, {
      headers: {
        "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
      }
    });

    if (!resp.ok) {
      console.error(`Feed fetch failed (${source.id}): ${resp.status} ${resp.statusText}`);
      return [];
    }

    const xml = await resp.text();
    const parsed = parser.parse(xml);
    const rssItems = normalizeRssItems(parsed);

    return rssItems
      .map((item) => normalizeRssItem(item, source))
      .filter((item): item is NormalizedArticle => item !== null);
  } catch (error) {
    console.error(`Feed parsing failed (${source.id}):`, error);
    return [];
  }
}

function normalizeRssItems(parsed: unknown): RssItem[] {
  const maybeAny = parsed as Record<string, unknown>;
  const fromRss = (maybeAny?.rss as Record<string, unknown> | undefined)?.channel as
    | Record<string, unknown>
    | undefined;
  const items = (fromRss?.item ?? (maybeAny?.feed as Record<string, unknown> | undefined)?.entry) as
    | RssItem[]
    | RssItem
    | undefined;

  if (!items) {
    return [];
  }

  return Array.isArray(items) ? items : [items];
}

function normalizeRssItem(item: RssItem, source: NewsSourceRecord): NormalizedArticle | null {
  const title = stripHtml(item.title ?? "");
  const link = pickLink(item);
  if (!title || !link) {
    return null;
  }

  const cleanedSnippet = truncate(stripHtml(item.description ?? ""), 500);
  const hasSnippet = Boolean(cleanedSnippet);
  return {
    sourceId: source.id,
    sourceName: source.name,
    title,
    url: link,
    publishedAt: toIsoOrNow(item.pubDate),
    snippet: hasSnippet ? cleanedSnippet : truncate(title, 220),
    contentLimited: !hasSnippet
  };
}

function pickLink(item: RssItem): string {
  if (typeof item.link === "string" && item.link.trim().length > 0) {
    return item.link.trim();
  }
  if (typeof item.guid === "string" && item.guid.trim().startsWith("http")) {
    return item.guid.trim();
  }
  if (typeof item.guid === "object" && item.guid?.["#text"]?.trim().startsWith("http")) {
    return item.guid["#text"].trim();
  }
  return "";
}

async function crawlHtmlListSource(source: NewsSourceRecord): Promise<NormalizedArticle[]> {
  if (!source.allowCrawl || !source.listUrl) {
    return [];
  }

  if (source.respectRobots && source.baseUrl) {
    const robotsAllowed = await isPathAllowedByRobots(source.baseUrl, source.listUrl);
    if (!robotsAllowed) {
      console.warn(`Robots.txt disallows crawl for ${source.id}`);
      return [];
    }
  }

  const resp = await fetch(source.listUrl, {
    headers: {
      "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
      Accept: "text/html,application/xhtml+xml"
    }
  });
  if (!resp.ok) {
    throw new Error(`HTML list fetch failed (${resp.status})`);
  }

  const html = await resp.text();
  const baseUrl = source.baseUrl ?? new URL(source.listUrl).origin;
  return extractGenericMarketNewsLinks(html, source, baseUrl);
}

function extractGenericMarketNewsLinks(html: string, source: NewsSourceRecord, baseUrl: string): NormalizedArticle[] {
  const anchorPattern = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const results: NormalizedArticle[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(anchorPattern)) {
    const rawHref = match[1] ?? "";
    const title = truncate(stripHtml(match[2] ?? ""), 220);
    if (!title || title.length < 20) {
      continue;
    }

    const href = toAbsoluteUrl(rawHref, baseUrl);
    if (!href || seen.has(href)) {
      continue;
    }

    const urlObj = new URL(href);
    if (source.baseUrl && !href.startsWith(source.baseUrl)) {
      continue;
    }

    const path = urlObj.pathname.toLowerCase();
    const looksLikeArticle =
      path.includes("news") ||
      path.includes("tin") ||
      path.includes("article") ||
      path.includes("thi-truong") ||
      path.includes("chung-khoan");
    if (!looksLikeArticle) {
      continue;
    }

    seen.add(href);
    results.push({
      sourceId: source.id,
      sourceName: source.name,
      title,
      url: href,
      publishedAt: new Date().toISOString(),
      snippet: title,
      contentLimited: true
    });
  }

  return results.slice(0, 30);
}

async function isPathAllowedByRobots(baseUrl: string, targetUrl: string): Promise<boolean> {
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).toString();
    const resp = await fetch(robotsUrl, {
      headers: { "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)" }
    });
    if (!resp.ok) {
      return true;
    }

    const robots = await resp.text();
    const targetPath = new URL(targetUrl).pathname;
    const lines = robots.split(/\r?\n/);
    let applies = false;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }
      const lower = line.toLowerCase();
      if (lower.startsWith("user-agent:")) {
        const ua = line.split(":").slice(1).join(":").trim();
        applies = ua === "*" || ua.toLowerCase().includes("vn-market-daily-worker");
      } else if (applies && lower.startsWith("disallow:")) {
        const disallow = line.split(":").slice(1).join(":").trim();
        if (disallow && targetPath.startsWith(disallow)) {
          return false;
        }
      }
    }
    return true;
  } catch {
    return true;
  }
}

function toAbsoluteUrl(input: string, baseUrl: string): string | null {
  try {
    return new URL(input, baseUrl).toString();
  } catch {
    return null;
  }
}
