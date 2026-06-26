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
import { notifySubscribersOfNewArticles } from "./telegram-bot";
import { generateMorningBriefIfNeeded } from "./morning-brief";
import { persistArticleClusters } from "./news-cluster-persist";
import { notifyPushSubscribersOfArticles } from "./web-push";
import { getFxMarketSnapshot, getGoldMarketSnapshot } from "./market-extra";
import { precomputeExplainCacheIfNeeded } from "./news-explain-cache";
import { defaultNoFeedOverviewCopy } from "./vietnam-holidays";
import { hotScore } from "./article-heat";
import { buildDailyInvestorSnapshot, persistInvestorDailySnapshot } from "./investor-intel";

const DAILY_CACHE_KEY = "today-report-cache";
const LAST_GOOD_FEED_KEY = "today-report-last-good";
const HOME_HTML_CACHE_PREFIX = "home-html:v2";
const REPORT_HISTORY_PREFIX = "report-history";
const ENRICH_CONCURRENCY = 4;
const SUMMARY_CONCURRENCY = 4;

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

interface DailyCachePayload {
  report: DailyReport;
  articles: StoredArticle[];
  dedupedArticles?: StoredArticle[];
  mediaItems?: import("../types").MediaItemRecord[];
  cachedAt?: string;
  marketSnapshot?: CafeFMarketSnapshot | null;
  hsxMarketSnapshot?: HSXMarketSnapshot | null;
  fxMarketSnapshot?: FxMarketSnapshot | null;
  goldMarketSnapshot?: GoldMarketSnapshot | null;
  reportHistory?: ReportHistoryEntry[];
}

export function homeHtmlCacheKey(reportDate: string, appearance: "light" | "dark"): string {
  return `${HOME_HTML_CACHE_PREFIX}:${reportDate}:${appearance}`;
}

export async function invalidateHomeHtmlCache(env: Env, reportDate: string): Promise<void> {
  await Promise.all([
    env.CACHE.delete(homeHtmlCacheKey(reportDate, "light")),
    env.CACHE.delete(homeHtmlCacheKey(reportDate, "dark"))
  ]);
}

async function loadMarketSnapshotsForFeed(
  env: Env,
  cached?: Pick<
    DailyCachePayload,
    "marketSnapshot" | "hsxMarketSnapshot" | "fxMarketSnapshot" | "goldMarketSnapshot"
  >,
  hsxMode: "full" | "light" = "full"
): Promise<{
  marketSnapshot: CafeFMarketSnapshot | null;
  hsxMarketSnapshot: HSXMarketSnapshot | null;
  fxMarketSnapshot: FxMarketSnapshot | null;
  goldMarketSnapshot: GoldMarketSnapshot | null;
}> {
  const hasCachedHsx =
    cached?.hsxMarketSnapshot &&
  (hsxMode === "light"
      ? cached.hsxMarketSnapshot.topVolume.length > 0 || cached.hsxMarketSnapshot.vnindex1W.length > 0
      : cached.hsxMarketSnapshot.topVolume.length > 0 ||
        cached.hsxMarketSnapshot.vnindex1W.length > 0 ||
        cached.hsxMarketSnapshot.vnindex1M.length > 0 ||
        cached.hsxMarketSnapshot.vnindex1Y.length > 0);

  if (cached?.marketSnapshot && hasCachedHsx && cached.fxMarketSnapshot && cached.goldMarketSnapshot) {
    if (hsxMode === "light" && cached.hsxMarketSnapshot) {
      return {
        marketSnapshot: cached.marketSnapshot,
        hsxMarketSnapshot: {
          ...cached.hsxMarketSnapshot,
          vnindex1M: [],
          vnindex1Y: []
        },
        fxMarketSnapshot: cached.fxMarketSnapshot,
        goldMarketSnapshot: cached.goldMarketSnapshot
      };
    }
    return {
      marketSnapshot: cached.marketSnapshot,
      hsxMarketSnapshot: cached.hsxMarketSnapshot ?? null,
      fxMarketSnapshot: cached.fxMarketSnapshot,
      goldMarketSnapshot: cached.goldMarketSnapshot
    };
  }

  const hsxRanges = hsxMode === "light" ? (["1w"] as const) : (["1w", "1m", "1y"] as const);
  const [marketSnapshot, hsxMarketSnapshot, fxMarketSnapshot, goldMarketSnapshot] = await Promise.all([
    cached?.marketSnapshot ?? getCafeFMarketSnapshot(env),
    hasCachedHsx
      ? cached!.hsxMarketSnapshot!
      : getHSXMarketSnapshot(env, { ranges: [...hsxRanges] }),
    cached?.fxMarketSnapshot ?? getFxMarketSnapshot(env),
    cached?.goldMarketSnapshot ?? getGoldMarketSnapshot(env)
  ]);
  return { marketSnapshot, hsxMarketSnapshot, fxMarketSnapshot, goldMarketSnapshot };
}

async function runLimitedArticleEnrichment(env: Env, reportDate: string): Promise<void> {
  const toEnrich = await listArticlesNeedingEnrichment(env.DB, reportDate, 80);
  let generatedReservations = 0;
  await mapWithConcurrency(toEnrich, ENRICH_CONCURRENCY, async (article) => {
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
      generatedReservations < 24
    ) {
      generatedReservations += 1;
      const gen = await ensureGeneratedThumbnail({
        env,
        reportDate,
        articleUrl: article.url,
        title: article.title
      });
      if (gen) {
        await setArticleImageUrl(env.DB, article.id, gen.publicPath);
      }
    }
    if ((!article.summaryVi || article.summaryVi.trim().length === 0) && extracted?.text) {
      const summary = await summarizeArticleFromSource(article, extracted.text, env);
      await setArticleSummary(env.DB, article.id, summary);
    }
  });
}

async function summarizeArticlesMissingVi(env: Env, reportDate: string): Promise<number> {
  const todaysArticles = await getArticlesByDate(env.DB, reportDate);
  let summarizedCount = 0;
  await mapWithConcurrency(todaysArticles, SUMMARY_CONCURRENCY, async (article) => {
    if (article.summaryVi && article.summaryVi.trim().length > 0) {
      return;
    }
    const summary = await summarizeArticle(article, env);
    await setArticleSummary(env.DB, article.id, summary);
    summarizedCount += 1;
  });
  return summarizedCount;
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

  await runLimitedArticleEnrichment(env, reportDate);
  let summarizedCount = await summarizeArticlesMissingVi(env, reportDate);

  // Tin Vietstock chỉ trong bảng media → đồng bộ vào articles rồi enrich lần hai (trước khi tổng hợp ngày).
  const articlesForMedia = await getArticlesByDate(env.DB, reportDate);
  await refreshDailyMedia(env, reportDate, articlesForMedia);

  await runLimitedArticleEnrichment(env, reportDate);
  summarizedCount += await summarizeArticlesMissingVi(env, reportDate);

  const finalizedArticles = await getArticlesByDate(env.DB, reportDate);
  const sentiment = analyzeSentimentForArticles(finalizedArticles);
  const report = await summarizeDailyOverview(reportDate, finalizedArticles, env);
  await upsertDailyReport(env.DB, report);
  const mediaItems = await loadDailyMedia(env, reportDate);
  await appendReportHistory(env, reportDate, {
    updatedAt: new Date().toISOString(),
    overviewVi: report.overviewVi,
    outlookVi: report.outlookVi,
    assumptionsVi: report.assumptionsVi,
    articleCount: report.articleCount,
    sentiment
  });
  const dedupedArticles = collapseDuplicateNews(finalizedArticles);
  const reportHistory = await getReportHistory(env, reportDate);
  const [marketSnapshot, hsxMarketSnapshot, fxMarketSnapshot, goldMarketSnapshot] = await Promise.all([
    getCafeFMarketSnapshot(env),
    getHSXMarketSnapshot(env),
    getFxMarketSnapshot(env),
    getGoldMarketSnapshot(env)
  ]);
  const cachePayload: DailyCachePayload = {
    report,
    articles: finalizedArticles,
    dedupedArticles,
    mediaItems,
    cachedAt: new Date().toISOString(),
    marketSnapshot,
    hsxMarketSnapshot,
    fxMarketSnapshot,
    goldMarketSnapshot,
    reportHistory
  };
  await env.CACHE.put(`${DAILY_CACHE_KEY}:${reportDate}`, JSON.stringify(cachePayload), { expirationTtl: 60 * 60 * 24 });
  await env.CACHE.put(
    LAST_GOOD_FEED_KEY,
    JSON.stringify({
      reportDate,
      ...cachePayload
    }),
    { expirationTtl: 60 * 60 * 24 * 3 }
  );
  await invalidateHomeHtmlCache(env, reportDate);
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
  try {
    await persistArticleClusters(env.DB, finalizedArticles);
  } catch (e) {
    console.error("persist clusters:", e);
  }
  await notifySubscribersOfNewArticles(env, finalizedArticles, newlySeenUrls);
  try {
    const clustered = collapseDuplicateNews(finalizedArticles.filter((a) => newlySeenUrls.has(a.url)));
    if (clustered.length) await notifyPushSubscribersOfArticles(env, clustered);
  } catch (e) {
    console.error("web push notify:", e);
  }
  try {
    await generateMorningBriefIfNeeded(env, reportDate, report, finalizedArticles);
  } catch (e) {
    console.error("morning brief:", e);
  }
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

export async function getTodayFeed(env: Env, sourceFilter?: string): Promise<TodayFeedResponse> {
  return getFeedByDate(env, getTodayDateKey(), { sourceFilter });
}

export async function getFeedByDate(
  env: Env,
  reportDate: string,
  options?: {
    sourceFilter?: string;
    page?: number;
    pageSize?: number;
    q?: string;
    hsxMode?: "full" | "light";
  }
): Promise<TodayFeedResponse> {
  await ensureDefaultSources(env.DB);
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 50));
  const page = Math.max(1, options?.page ?? 1);
  const offset = (page - 1) * pageSize;
  const normalizedSource = options?.sourceFilter?.trim().toLowerCase();
  const q = options?.q?.trim() || undefined;
  const hsxMode = options?.hsxMode ?? "full";

  // Use KV cache only for today and only when requesting first page and no q filter.
  const isToday = reportDate === getTodayDateKey();
  if (isToday && page === 1 && !q) {
    const cacheKey = `${DAILY_CACHE_KEY}:${reportDate}`;
    const cached = await env.CACHE.get(cacheKey, "json");
    if (cached && typeof cached === "object") {
      const typed = cached as DailyCachePayload;
      if (typed.report && Array.isArray(typed.articles)) {
        const filtered = normalizedSource
          ? typed.articles.filter(
              (a) =>
                String(a.sourceId).toLowerCase() === normalizedSource ||
                String(a.sourceName).toLowerCase() === normalizedSource
            )
          : typed.articles;
        const dedupedBase = typed.dedupedArticles ?? collapseDuplicateNews(filtered);
        const deduped = normalizedSource ? collapseDuplicateNews(filtered) : dedupedBase;
        const [{ marketSnapshot, hsxMarketSnapshot, fxMarketSnapshot, goldMarketSnapshot }, reportHistory] =
          await Promise.all([
            loadMarketSnapshotsForFeed(env, typed, hsxMode),
            typed.reportHistory ? Promise.resolve(typed.reportHistory) : getReportHistory(env, reportDate)
          ]);
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

  const [report, paged, mediaItems, marketBundle, reportHistory] = await Promise.all([
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
    loadMarketSnapshotsForFeed(env, undefined, hsxMode),
    getReportHistory(env, reportDate)
  ]);
  const { marketSnapshot, hsxMarketSnapshot, fxMarketSnapshot, goldMarketSnapshot } = marketBundle;

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

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  let nextIndex = 0;
  const runners = Array.from({ length: limit }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index]!, index);
    }
  });
  await Promise.all(runners);
}
