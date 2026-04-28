import type { DailyReport, StoredArticle } from "../types";

export function generateTodayRssXml(params: {
  baseUrl: string;
  reportDate: string;
  report: DailyReport;
  articles: StoredArticle[];
  sourceFilter?: string;
}): string {
  const { baseUrl, reportDate, report, articles, sourceFilter } = params;
  const channelLink = sourceFilter
    ? `${baseUrl}/?source=${encodeURIComponent(sourceFilter)}`
    : `${baseUrl}/`;

  const rssItems = articles
    .slice(0, 50)
    .map((a) => {
      const pubDate = new Date(a.publishedAt).toUTCString();
      const title = escapeXml(a.title);
      const link = escapeXml(a.url);
      const desc = escapeXml(a.summaryVi ?? a.snippet);
      return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${link}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <description>${desc}</description>
    </item>`;
    })
    .join("\n");

  const overview = escapeXml(report.overviewVi);
  const dt = escapeXml(new Date().toUTCString());

  const filterNote = sourceFilter ? ` Nguon: ${escapeXml(sourceFilter)}.` : "";

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Tin thị trường chứng khoán Việt Nam - ${escapeXml(reportDate)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${overview}${filterNote}</description>
    <language>vi</language>
    <lastBuildDate>${dt}</lastBuildDate>
${rssItems}
  </channel>
</rss>`;
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

