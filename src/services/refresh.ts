import {
  ensureDefaultSources,
  getArticlesByDate,
  listArticlesNeedingEnrichment,
  getArticlesByDatePaged,
  getDailyReport,
  getTodayDateKey,
  listLatestFeedHealth,
  insertSystemStatusSnapshot,
  setArticleSummary,
  setArticleImageUrl,
  upsertArticle,
  upsertDailyReport
} from "../db";
import type {
  CafeFMarketSnapshot,
  DailyReport,
  Env,
  FxMarketSnapshot,
  GoldMarketSnapshot,
  HSXMarketSnapshot,
  ReportHistoryEntry,
  StoredArticle
} from "../types";
import { getCafeFMarketSnapshot } from "./cafef-market";
import { getHSXMarketSnapshot } from "./hsx-market";
import { loadDailyMedia, refreshDailyMedia } from "./daily-media";
import { fetchAllSourcesFromDb } from "./fetch-news";
import { summarizeArticle, summarizeArticleFromSource, summarizeDailyOverview } from "./summarizer";
import { fetchAndExtractSource } from "./source-extract";
import { ensureGeneratedThumbnail } from "./image-gen";
import { analyzeSentimentForArticles } from "./sentiment";
import { collapseDuplicateNews } from "./news-cluster";
import { ensureOptimizedImageAsset } from "./image-cache";
import { broadcastTelegramMessage, getTelegramSubscriberCount, isTelegramNotifyConfigured } from "./telegram-bot";
import { getFxMarketSnapshot, getGoldMarketSnapshot } from "./market-extra";
import { precomputeExplainCacheIfNeeded } from "./news-explain-cache";
import { defaultNoFeedOverviewCopy } from "./vietnam-holidays";
import { hotScore } from "./article-heat";
import { buildDailyInvestorSnapshot, persistInvestorDailySnapshot } from "./investor-intel";

const DAILY_CACHE_KEY = "today-report-cache";
const LAST_GOOD_FEED_KEY = "today-report-last-good";
const REPORT_HISTORY_PREFIX = "report-history";

export interface RefreshResult {
  reportDate: string;
  fetchedCount: number;
  storedCount: number;
  summarizedCount: number;
  report: DailyReport;
}

interface TodayFeedResponse {
  reportDate: string;
  report: DailyReport;
  articles: StoredArticle[];
  mediaItems: import("../types").MediaItemRecord[];
  marketSnapshot: CafeFMarketSnapshot | null;
  hsxMarketSnapshot: HSXMarketSnapshot | null;
  fxMarketSnapshot: FxMarketSnapshot | null;
  goldMarketSnapshot: GoldMarketSnapshot | null;
  reportHistory: ReportHistoryEntry[];
  total: number;
  cacheHit: boolean;
  cachedAt: string | null;
}

export async function refreshDailyNews(env: Env): Promise<RefreshResult> {
  const reportDate = getTodayDateKey();
  await ensureDefaultSources(env.DB);
  const beforeArticles = await getArticlesByDate(env.DB, reportDate);
  const existingUrls = new Set(beforeArticles.map((item) => item.url));
  const fetched = await fetchAllSourcesFromDb(env);
  const newlySeenUrls = new Set<string>();

  let storedCount = 0;
  for (const article of fetched) {
    if (!existingUrls.has(article.url)) {
      newlySeenUrls.add(article.url);
      existingUrls.add(article.url);
    }
    await upsertArticle(env.DB, article);
    storedCount += 1;
  }

  // Enrich a limited number of new/updated articles by opening the source URL to:
  // - extract og:image as representative thumbnail
  // - summarize based on source excerpt (Workers AI preferred)
  // This is intentionally capped to control cost/latency for 5-minute cron.
  const toEnrich = await listArticlesNeedingEnrichment(env.DB, reportDate, 80);
  let generatedCount = 0;
  for (const article of toEnrich) {
    const extracted = await fetchAndExtractSource(article.url);
    if (extracted?.imageUrl && (!article.imageUrl || article.imageUrl.trim().length === 0)) {
      const optimized =
        (await ensureOptimizedImageAsset({
          env,
          sourceUrl: extracted.imageUrl,
          namespace: "article-thumb"
        })) ?? extracted.imageUrl;
      await setArticleImageUrl(env.DB, article.id, optimized);
    }
    if (
      (!article.imageUrl || article.imageUrl.trim().length === 0) &&
      !extracted?.imageUrl &&
      generatedCount < 24
    ) {
      const gen = await ensureGeneratedThumbnail({
        env,
        reportDate,
        articleUrl: article.url,
        title: article.title
      });
      if (gen) {
        await setArticleImageUrl(env.DB, article.id, gen.publicPath);
        generatedCount += 1;
      }
    }
    if ((!article.summaryVi || article.summaryVi.trim().length === 0) && extracted?.text) {
      const summary = await summarizeArticleFromSource(article, extracted.text, env);
      await setArticleSummary(env.DB, article.id, summary);
    }
  }

  const todaysArticles = await getArticlesByDate(env.DB, reportDate);
  let summarizedCount = 0;
  for (const article of todaysArticles) {
    if (article.summaryVi && article.summaryVi.trim().length > 0) {
      continue;
    }
    const summary = await summarizeArticle(article, env);
    await setArticleSummary(env.DB, article.id, summary);
    summarizedCount += 1;
  }

  const finalizedArticles = await getArticlesByDate(env.DB, reportDate);
  const sentiment = analyzeSentimentForArticles(finalizedArticles);
  const report = await summarizeDailyOverview(reportDate, finalizedArticles, env);
  await upsertDailyReport(env.DB, report);
  await refreshDailyMedia(env, reportDate, finalizedArticles);
  const mediaItems = await loadDailyMedia(env, reportDate);
  await appendReportHistory(env, reportDate, {
    updatedAt: new Date().toISOString(),
    overviewVi: report.overviewVi,
    outlookVi: report.outlookVi,
    assumptionsVi: report.assumptionsVi,
    articleCount: report.articleCount,
    sentiment
  });
  await env.CACHE.put(
    `${DAILY_CACHE_KEY}:${reportDate}`,
    JSON.stringify({
      report,
      articles: finalizedArticles,
      mediaItems,
      cachedAt: new Date().toISOString()
    }),
    { expirationTtl: 60 * 60 * 24 }
  );
  await env.CACHE.put(
    LAST_GOOD_FEED_KEY,
    JSON.stringify({
      reportDate,
      report,
      articles: finalizedArticles,
      mediaItems,
      cachedAt: new Date().toISOString()
    }),
    { expirationTtl: 60 * 60 * 24 * 3 }
  );
  const feedHealth = await listLatestFeedHealth(env.DB);
  const feedOkCount = feedHealth.filter((x) => x.status === "success").length;
  const feedErrorCount = feedHealth.filter((x) => x.status === "error").length;
  await insertSystemStatusSnapshot(env.DB, {
    reportDate,
    feedOkCount,
    feedErrorCount,
    feedTotalCount: feedHealth.length,
    aiOk: Boolean(env.AI || env.OPENAI_API_KEY),
    articleCount: finalizedArticles.length
  });
  await notifyNewArticlesViaTelegram(env, finalizedArticles, newlySeenUrls);
  try {
    const hsxForIntel = await getHSXMarketSnapshot(env);
    const intelSnap = buildDailyInvestorSnapshot({
      reportDate,
      articles: finalizedArticles,
      sentiment,
      report,
      hsx: hsxForIntel,
      hotScoreFn: hotScore
    });
    await persistInvestorDailySnapshot(env, intelSnap);
  } catch (e) {
    console.error("persist investor snapshot:", e);
  }
  const explainCacheRefresh = await precomputeExplainCacheIfNeeded(env, reportDate, finalizedArticles);
  console.log(
    "news_explain_cache",
    JSON.stringify({
      refreshed: explainCacheRefresh.refreshed,
      reason: explainCacheRefresh.reason,
      signature: explainCacheRefresh.signature,
      reportDate
    })
  );

  return {
    reportDate,
    fetchedCount: fetched.length,
    storedCount,
    summarizedCount,
    report
  };
}

async function notifyNewArticlesViaTelegram(env: Env, articles: StoredArticle[], newUrls: Set<string>): Promise<void> {
  if (!newUrls.size) return;
  if (!isTelegramNotifyConfigured(env)) return;
  const subscriberCount = await getTelegramSubscriberCount(env);
  if (subscriberCount <= 0) return;

  const news = articles
    .filter((item) => newUrls.has(item.url))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 20);
  if (!news.length) return;

  const lines: string[] = [`🆕 <b>Có ${news.length} bài mới vừa crawl</b>`];
  for (let i = 0; i < news.length; i += 1) {
    const item = news[i]!;
    const summary = (item.summaryVi ?? item.snippet ?? "").trim().slice(0, 180);
    lines.push(
      "",
      `<b>${i + 1}. ${escapeTelegramHtml(item.title)}</b>`,
      `${escapeTelegramHtml(item.sourceName)} • ${escapeTelegramHtml(item.publishedAt)}`,
      summary ? `<i>${escapeTelegramHtml(summary)}</i>` : "",
      `<a href="${escapeTelegramAttr(item.url)}">Đọc bài</a>`
    );
  }
  let text = lines.filter(Boolean).join("\n");
  if (text.length > 3900) {
    text = `${text.slice(0, 3850)}\n\n... (rút gọn, mở trang để xem đầy đủ)`;
  }
  await broadcastTelegramMessage(env, text);
}

function escapeTelegramHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeTelegramAttr(input: string): string {
  return input.replace(/"/g, "&quot;");
}

export async function getTodayFeed(env: Env, sourceFilter?: string): Promise<TodayFeedResponse> {
  return getFeedByDate(env, getTodayDateKey(), { sourceFilter });
}

export async function getFeedByDate(
  env: Env,
  reportDate: string,
  options?: { sourceFilter?: string; page?: number; pageSize?: number; q?: string }
): Promise<TodayFeedResponse> {
  await ensureDefaultSources(env.DB);
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 50));
  const page = Math.max(1, options?.page ?? 1);
  const offset = (page - 1) * pageSize;
  const normalizedSource = options?.sourceFilter?.trim().toLowerCase();
  const q = options?.q?.trim() || undefined;

  // Use KV cache only for today and only when requesting first page and no q filter.
  const isToday = reportDate === getTodayDateKey();
  if (isToday && page === 1 && !q) {
    const cacheKey = `${DAILY_CACHE_KEY}:${reportDate}`;
    const cached = await env.CACHE.get(cacheKey, "json");
    if (cached && typeof cached === "object") {
      const typed = cached as {
        report?: DailyReport;
        articles?: StoredArticle[];
        mediaItems?: import("../types").MediaItemRecord[];
        cachedAt?: string;
      };
      if (typed.report && Array.isArray(typed.articles)) {
        const [marketSnapshot, hsxMarketSnapshot, fxMarketSnapshot, goldMarketSnapshot] = await Promise.all([
          getCafeFMarketSnapshot(env),
          getHSXMarketSnapshot(env),
          getFxMarketSnapshot(env),
          getGoldMarketSnapshot(env)
        ]);
        const reportHistory = await getReportHistory(env, reportDate);
        const filtered = normalizedSource
          ? typed.articles.filter(
              (a) =>
                String(a.sourceId).toLowerCase() === normalizedSource ||
                String(a.sourceName).toLowerCase() === normalizedSource
            )
          : typed.articles;
        const deduped = collapseDuplicateNews(filtered);
        const staleMinutes = typed.cachedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(typed.cachedAt)) / 60000)) : 0;
        const staleSuffix = staleMinutes > 0 ? ` Latest available update: ${staleMinutes} mins ago.` : "";
        return {
          reportDate,
          report: {
            ...typed.report,
            overviewVi: `${typed.report.overviewVi}${staleSuffix}`
          },
          articles: deduped.slice(offset, offset + pageSize),
          mediaItems: Array.isArray(typed.mediaItems) ? typed.mediaItems : [],
          marketSnapshot,
          hsxMarketSnapshot,
          fxMarketSnapshot,
          goldMarketSnapshot,
          reportHistory,
          total: deduped.length,
          cacheHit: true,
          cachedAt: typed.cachedAt ?? null
        };
      }
    }
  }

  const [report, paged, mediaItems, marketSnapshot, hsxMarketSnapshot, fxMarketSnapshot, goldMarketSnapshot, reportHistory] =
    await Promise.all([
    getDailyReport(env.DB, reportDate),
    getArticlesByDatePaged({
      db: env.DB,
      reportDate,
      limit: pageSize,
      offset,
      sourceFilter: normalizedSource,
      q
      }),
      loadDailyMedia(env, reportDate),
      getCafeFMarketSnapshot(env),
      getHSXMarketSnapshot(env),
      getFxMarketSnapshot(env),
      getGoldMarketSnapshot(env),
      getReportHistory(env, reportDate)
    ]);

  const dedupedPaged = collapseDuplicateNews(paged.articles);
  const hasFreshData = dedupedPaged.length > 0;
  if (!hasFreshData && isToday) {
    const fallback = await env.CACHE.get(LAST_GOOD_FEED_KEY, "json");
    if (fallback && typeof fallback === "object") {
      const typed = fallback as {
        reportDate?: string;
        report?: DailyReport;
        articles?: StoredArticle[];
        mediaItems?: import("../types").MediaItemRecord[];
        cachedAt?: string;
      };
      if (typed.report && Array.isArray(typed.articles)) {
        const merged = collapseDuplicateNews(typed.articles);
        const staleMinutes = typed.cachedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(typed.cachedAt)) / 60000)) : 0;
        return {
          reportDate,
          report: {
            ...typed.report,
            overviewVi: `${typed.report.overviewVi} Latest available update: ${staleMinutes} mins ago.`
          },
          articles: merged.slice(offset, offset + pageSize),
          mediaItems: Array.isArray(typed.mediaItems) ? typed.mediaItems : [],
          marketSnapshot,
          hsxMarketSnapshot,
          fxMarketSnapshot,
          goldMarketSnapshot,
          reportHistory,
          total: merged.length,
          cacheHit: true,
          cachedAt: typed.cachedAt ?? null
        };
      }
    }
  }
  const noDbReportCopy = defaultNoFeedOverviewCopy(reportDate);
  return {
    reportDate,
    report:
      report ??
      ({
        reportDate,
        overviewVi: noDbReportCopy.overviewVi,
        outlookVi: noDbReportCopy.outlookVi,
        assumptionsVi: noDbReportCopy.assumptionsVi,
        articleCount: paged.total
      } satisfies DailyReport),
    articles: dedupedPaged,
    mediaItems,
    marketSnapshot,
    hsxMarketSnapshot,
    fxMarketSnapshot,
    goldMarketSnapshot,
    reportHistory,
    total: dedupedPaged.length,
    cacheHit: false,
    cachedAt: null
  };
}

async function appendReportHistory(env: Env, reportDate: string, entry: ReportHistoryEntry): Promise<void> {
  const key = `${REPORT_HISTORY_PREFIX}:${reportDate}`;
  const current = await getReportHistory(env, reportDate);
  const next = [entry, ...current];
  // Keep latest 48 entries/day (~4 hours if refreshing every 5 minutes).
  await env.CACHE.put(key, JSON.stringify(next.slice(0, 48)), { expirationTtl: 60 * 60 * 24 * 3 });
}

async function getReportHistory(env: Env, reportDate: string): Promise<ReportHistoryEntry[]> {
  const key = `${REPORT_HISTORY_PREFIX}:${reportDate}`;
  const raw = await env.CACHE.get(key, "json");
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => x as ReportHistoryEntry)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
