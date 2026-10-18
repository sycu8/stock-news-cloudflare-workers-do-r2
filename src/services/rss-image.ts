/** Shared RSS/Atom feed image extraction for news and media items. */

export interface RssImageItem {
  description?: string;
  summary?: string;
  "content:encoded"?: string;
  enclosure?: { "@_url"?: string; "@_type"?: string } | Array<{ "@_url"?: string; "@_type"?: string }>;
  "media:thumbnail"?: { "@_url"?: string } | Array<{ "@_url"?: string }>;
  "media:content"?: { "@_url"?: string; "@_type"?: string; "@_medium"?: string } | Array<{ "@_url"?: string; "@_type"?: string; "@_medium"?: string }>;
  thumbnail?: { "@_url"?: string };
}

function first<T>(value: T | T[] | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isImageType(type: string | undefined): boolean {
  if (!type) return false;
  return type.startsWith("image/");
}

function pickFromEnclosure(item: RssImageItem): string | null {
  const enclosure = first(item.enclosure);
  if (!enclosure?.["@_url"]) return null;
  const type = enclosure["@_type"] ?? "";
  if (type && !isImageType(type)) return null;
  return enclosure["@_url"];
}

function pickFromMediaContent(item: RssImageItem): string | null {
  const media = first(item["media:content"]);
  if (!media?.["@_url"]) return null;
  const type = media["@_type"] ?? "";
  const medium = media["@_medium"] ?? "";
  if (type && !isImageType(type) && medium !== "image") return null;
  return media["@_url"];
}

function pickFromDescription(html: string): string | null {
  if (!html) return null;
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch?.[1] ?? null;
}

/** Extract a thumbnail URL from an RSS/Atom item, or null if none found. */
export function pickRssItemImage(item: RssImageItem, descriptionFallback = ""): string | null {
  const mediaThumb = first(item["media:thumbnail"]);
  const fromMedia = mediaThumb?.["@_url"] ?? item.thumbnail?.["@_url"];
  if (fromMedia?.trim()) return fromMedia.trim();

  const fromEnclosure = pickFromEnclosure(item);
  if (fromEnclosure?.trim()) return fromEnclosure.trim();

  const fromMediaContent = pickFromMediaContent(item);
  if (fromMediaContent?.trim()) return fromMediaContent.trim();

  const html = item["content:encoded"] ?? item.description ?? item.summary ?? descriptionFallback;
  const fromHtml = pickFromDescription(html);
  return fromHtml?.trim() ? fromHtml.trim() : null;
}
