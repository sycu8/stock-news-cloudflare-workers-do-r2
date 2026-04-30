import { listArticlesPublishedAfter } from "../db";
import type { Env } from "../types";
import { filterArticlesForPortfolio } from "./investor-intel";

const FEED_CACHE_PREFIX = "today-report-cache:";

export interface LivePollJson {
  reportDate: string;
  feedCachedAt: string | null;
  newCount: number;
  portfolioNewCount: number;
  hasNew: boolean;
  articles: Array<{ title: string; url: string; sourceName: string; publishedAt: string }>;
  portfolioArticles: Array<{ title: string; url: string; sourceName: string; publishedAt: string }>;
  /** Mốc `published_at` lớn nhất trong lô mới — client dùng làm `since` cho lần poll sau */
  nextSince: string;
}

function toMinimal(
  rows: Array<{ title: string; url: string; sourceName: string; publishedAt: string }>
): LivePollJson["articles"] {
  return rows.map((a) => ({
    title: a.title,
    url: a.url,
    sourceName: a.sourceName,
    publishedAt: a.publishedAt
  }));
}

/** API realtime: bài trong ngày báo có `published_at` &gt; `sinceIso` (+ lọc portfolio nếu có mã). */
export async function buildLivePollJson(
  env: Env,
  reportDate: string,
  sinceIso: string,
  portfolioSymbols: string[]
): Promise<LivePollJson> {
  const cached = (await env.CACHE.get(`${FEED_CACHE_PREFIX}${reportDate}`, "json")) as { cachedAt?: string } | null;
  const feedCachedAt = cached?.cachedAt ?? null;

  const rows = await listArticlesPublishedAfter(env.DB, reportDate, sinceIso, 40);
  const portfolioRows = portfolioSymbols.length ? filterArticlesForPortfolio(rows, portfolioSymbols) : [];

  let nextSince = sinceIso;
  for (const a of rows) {
    if (a.publishedAt > nextSince) nextSince = a.publishedAt;
  }

  return {
    reportDate,
    feedCachedAt,
    newCount: rows.length,
    portfolioNewCount: portfolioRows.length,
    hasNew: rows.length > 0,
    articles: toMinimal(rows).slice(0, 15),
    portfolioArticles: toMinimal(portfolioRows).slice(0, 12),
    nextSince
  };
}
