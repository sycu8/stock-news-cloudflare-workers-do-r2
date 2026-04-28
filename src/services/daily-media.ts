import { XMLParser } from "fast-xml-parser";
import { MEDIA_SOURCES } from "../config/sources";
import { getMediaItemsByDate, upsertMediaItem } from "../db";
import type { Env, MediaItemRecord, StoredArticle } from "../types";
import { formatDateOnly, toIsoOrNow } from "../utils/date";
import { stripHtml, truncate } from "../utils/text";
import { fetchAndExtractSource } from "./source-extract";
import { ensureGeneratedThumbnail } from "./image-gen";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true
});

interface FeedItem {
  title?: string;
  link?: string | { "@_href"?: string };
  pubDate?: string;
  published?: string;
  description?: string;
  summary?: string;
  "media:thumbnail"?: { "@_url"?: string } | Array<{ "@_url"?: string }>;
  thumbnail?: { "@_url"?: string };
}

export async function refreshDailyMedia(env: Env, reportDate: string, articles: StoredArticle[]): Promise<void> {
  const collected = await fetchMediaSourcesForDate(reportDate);

  // Fallback briefs from hot articles only if the dedicated brief feeds do not provide enough items.
  const derivedBriefs = articles.slice(0, 6).map<MediaItemRecord>((article) => ({
    kind: "news_image",
    sourceId: `derived-brief-${article.sourceId}`,
    sourceName: `${article.sourceName} (tóm tắt)`,
    title: article.title,
    url: article.url,
    publishedAt: article.publishedAt,
    reportDate,
    summaryVi: article.summaryVi ?? article.snippet,
    imageUrl: article.imageUrl ?? null
  }));

  const dedicatedBriefs = collected.filter((item) => item.sourceId.startsWith("vietstock-brief-"));
  const finalItems = dedicatedBriefs.length >= 4 ? collected : [...collected, ...derivedBriefs];

  // Enrich images for brief/media cards from source page or generated image.
  let generatedCount = 0;
  for (const item of finalItems) {
    if (!item.imageUrl) {
      const extracted = await fetchAndExtractSource(item.url);
      if (extracted?.imageUrl) {
        item.imageUrl = extracted.imageUrl;
      } else if (generatedCount < 4) {
        const gen = await ensureGeneratedThumbnail({
          env,
          reportDate,
          articleUrl: item.url,
          title: item.title
        });
        if (gen) {
          item.imageUrl = gen.publicPath;
          generatedCount += 1;
        }
      }
    }
    await upsertMediaItem(env.DB, item);
  }
}

export async function loadDailyMedia(env: Env, reportDate: string): Promise<MediaItemRecord[]> {
  return getMediaItemsByDate(env.DB, reportDate, 12);
}

async function fetchMediaSourcesForDate(reportDate: string): Promise<MediaItemRecord[]> {
  const results = await Promise.all(
    MEDIA_SOURCES.map(async (source) => {
      try {
        const resp = await fetch(source.url, {
          headers: {
            "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
            Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
          }
        });
        if (!resp.ok) {
          return [];
        }
        const xml = await resp.text();
        const parsed = parser.parse(xml);
        const items = normalizeFeedItems(parsed);
        return items
          .map((item) => normalizeMediaItem(source.id, source.name, source.type, reportDate, item))
          .filter((item): item is MediaItemRecord => item !== null)
          .filter((item) => formatDateOnly(item.publishedAt) === reportDate)
          .slice(0, 8);
      } catch {
        return [];
      }
    })
  );
  return results.flat();
}

function normalizeFeedItems(parsed: unknown): FeedItem[] {
  const anyParsed = parsed as Record<string, unknown>;
  const rssChannel = (anyParsed?.rss as Record<string, unknown> | undefined)?.channel as
    | Record<string, unknown>
    | undefined;
  const atomFeed = anyParsed?.feed as Record<string, unknown> | undefined;
  const items = (rssChannel?.item ?? atomFeed?.entry) as FeedItem[] | FeedItem | undefined;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

function normalizeMediaItem(
  sourceId: string,
  sourceName: string,
  type: "rss" | "youtube",
  reportDate: string,
  item: FeedItem
): MediaItemRecord | null {
  const title = truncate(stripHtml(item.title ?? ""), 220);
  const url = pickLink(item);
  if (!title || !url) return null;
  const summary = truncate(stripHtml(item.description ?? item.summary ?? title), 300);
  return {
    kind: type === "youtube" ? "youtube" : "news_image",
    sourceId,
    sourceName,
    title,
    url,
    publishedAt: toIsoOrNow(item.pubDate ?? item.published),
    reportDate,
    summaryVi: summary,
    imageUrl: pickImage(item, item.description ?? item.summary ?? "")
  };
}

function pickLink(item: FeedItem): string {
  if (typeof item.link === "string") return item.link.trim();
  if (typeof item.link === "object" && item.link?.["@_href"]) return item.link["@_href"].trim();
  return "";
}

function pickImage(item: FeedItem, description: string): string | null {
  const mediaThumb = Array.isArray(item["media:thumbnail"]) ? item["media:thumbnail"][0] : item["media:thumbnail"];
  const fromMedia = mediaThumb?.["@_url"] ?? item.thumbnail?.["@_url"];
  if (fromMedia) return fromMedia;

  const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch?.[1] ?? null;
}

