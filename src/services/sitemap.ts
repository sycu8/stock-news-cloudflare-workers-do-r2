import { formatDateOnly } from "../utils/date";

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function w3cDateFromIso(isoLike: string): string {
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) {
    return formatDateOnly(new Date());
  }
  return d.toISOString().slice(0, 10);
}

export function buildArticleDetailPath(reportDate: string, articleUrl: string): string {
  const u = new URLSearchParams();
  u.set("d", reportDate);
  u.set("u", articleUrl);
  return `/article?${u.toString()}`;
}

export function normalizeStockSymbol(symbol: string): string | null {
  const t = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!t || t.length > 8) return null;
  return t;
}

export function generateSitemapXml(entries: SitemapUrlEntry[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ];
  for (const e of entries) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(e.loc)}</loc>`);
    if (e.lastmod) lines.push(`    <lastmod>${escapeXml(e.lastmod)}</lastmod>`);
    if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
    if (typeof e.priority === "number" && e.priority >= 0 && e.priority <= 1) {
      // Avoid binary float quirks (e.g. 0.75.toFixed(1) becoming "0.8").
      const rounded = Math.round(e.priority * 100) / 100;
      lines.push(`    <priority>${String(rounded)}</priority>`);
    }
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  return lines.join("\n");
}

export function buildRobotsTxt(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return [
    "User-agent: *",
    "Allow: /",
    "",
    "Disallow: /admin",
    "Disallow: /api/",
    "Disallow: /webhooks/",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    ""
  ].join("\n");
}
