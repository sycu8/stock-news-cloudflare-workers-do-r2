import { Hono } from "hono";
import type { Context } from "hono";
import {
  createManualArticle,
  createSource,
  deleteManualArticle,
  deleteSource,
  ensureDefaultSources,
  getArticleByUrl,
  getMediaItemByUrl,
  listRecentArticlesForSitemap,
  getTodayDateKey,
  getLatestSystemStatusSnapshot,
  listLatestFeedHealth,
  listRecentManualArticles,
  listRecentCrawlRuns,
  listSources,
  toggleSource,
  updateManualArticle
} from "./db";
import { NEWS_SOURCES } from "./config/sources";
import { getFeedByDate, getTodayFeed, refreshDailyNews } from "./services/refresh";
import type { Env, NewsSourceRecord, NewsSourceType } from "./types";
import { formatVietnamDateDisplay } from "./utils/date";
import { renderArticleDetailPage, renderHomePage, renderVNIndexChart } from "./ui/render";
import { renderNotifyPage } from "./ui/notify";
import { renderStatusPage } from "./ui/status";
import { renderCalendarPage } from "./ui/calendar";
import { getHSXMarketSnapshot } from "./services/hsx-market";
import { buildStockInsight } from "./services/stock-insight";
import {
  broadcastTelegramMessage,
  getTelegramSubscriberCount,
  handleTelegramWebhookUpdate,
  isTelegramNotifyConfigured,
  verifyTelegramWebhookSecret
} from "./services/telegram-bot";
import { buildMarketCalendar, buildMarketCalendarFromArticles } from "./services/market-calendar";
import { generateTodayRssXml } from "./ui/rss";
import { renderAdminDashboardPage, renderAdminLoginPage, renderAdminSourcesPage } from "./ui/admin";
import { renderStockPage } from "./ui/stocks";
import { buildChartsForToday } from "./ui/charts";
import { extractHotKeywords } from "./services/hot-keywords";
import { getViewsMap, incrementView } from "./services/views";
import { LOGO_ASSET_KEY } from "./ui/brand";
import { analyzeSentimentForArticles, classifySentimentText } from "./services/sentiment";
import { fetchAndExtractSource } from "./services/source-extract";
import { fetchOptimizedRemoteImage } from "./services/cf-image-fetch";
import { getOrCreateCachedExplanation } from "./services/news-explain-cache";
import {
  apiCatalogContentType,
  buildApiCatalogHeadLinkHeader,
  buildApiCatalogLinkset,
  appendHomepageAgentLinkHeaders,
  buildJwksDocument,
  buildMcpServerCard,
  buildOAuthAuthorizationServerMetadata,
  buildOpenApiDocument,
  buildOpenIdConnectDiscoveryDocument,
  PUBLIC_API_CATALOG_ENTRIES,
  renderApiDocsHtml
} from "./services/agent-discovery";
import { AGENT_SKILLS_SKILL_MD_BODY, buildAgentSkillsDiscoveryIndex } from "./services/agent-skills-discovery";
import {
  buildArticleDetailPath,
  buildRobotsTxt,
  generateSitemapXml,
  normalizeStockSymbol,
  w3cDateFromIso,
  type SitemapUrlEntry
} from "./services/sitemap";
import { formatCalendarDateVietnam, reportDayStartIso } from "./utils/date";
import { buildLivePollJson } from "./services/live-poll";
import {
  buildOAuthProtectedResourceMetadata,
  oauthProtectedResourceCacheControl,
  wwwAuthenticateResourceMetadata
} from "./services/oauth-protected-resource";
import { serveHttpMessageSignaturesDirectory } from "./services/web-bot-auth-directory";
import {
  appearanceSetCookieHeader,
  parseAppearanceFromCookie,
  themeAppearanceSwitcher,
  themeFontLinks,
  themeSemanticVariablesBlock,
  type Appearance,
} from "./ui/theme";
import { hotScore } from "./services/article-heat";
import {
  buildDailyInvestorSnapshot,
  computeNewsImpactScore,
  filterArticlesForPortfolio,
  listIntelArchiveDates,
  loadInvestorSnapshotFromR2,
  parsePortfolioSymbols
} from "./services/investor-intel";
import {
  renderIntelArchive,
  renderInvestorHub,
  renderMarketsDesk,
  renderMorningBriefing,
  renderPortfolioDesk
} from "./ui/investor-desk";

const app = new Hono<{ Bindings: Env }>();
const ADMIN_COOKIE_NAME = "admin_token";
const ADMIN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function jsonUnauthorizedWithResourceMetadata(c: Context<{ Bindings: Env }>) {
  return c.json(
    { error: "Unauthorized" },
    401,
    { "WWW-Authenticate": wwwAuthenticateResourceMetadata(new URL(c.req.url).origin) }
  );
}

app.use("*", async (c, next) => {
  await ensureDefaultSources(c.env.DB);
  await next();
});

function readAppearance(c: { req: { header(name: string): string | undefined } }): Appearance {
  return parseAppearanceFromCookie(c.req.header("cookie"));
}

app.get("/api/set-appearance", (c) => {
  const q = (c.req.query("theme") ?? "").toLowerCase();
  const appearance: Appearance = q === "dark" ? "dark" : "light";
  let next = c.req.query("next") ?? "/";
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    next = "/";
  }
  c.header("Set-Cookie", appearanceSetCookieHeader(appearance));
  return c.redirect(next, 302);
});

function getCookieValue(c: Context<{ Bindings: Env }> | any, name: string): string | null {
  const cookieHeader = c.req.header("cookie") ?? "";
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  const prefix = `${name}=`;
  for (const part of parts) {
    const v = part.trim();
    if (v.startsWith(prefix)) {
      const raw = v.slice(prefix.length);
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}

function getAdminToken(c: { env: Env; req: { header(name: string): string | undefined; query(name: string): string | undefined } }): string | null {
  // Prefer cookie-based login to avoid leaking token in URL query params.
  const fromCookie = getCookieValue(c as any, ADMIN_COOKIE_NAME);
  if (fromCookie) return fromCookie;
  return c.req.header("x-admin-token") ?? c.req.query("token") ?? null;
}

function isAdminAuthorized(c: { env: Env; req: { header(name: string): string | undefined; query(name: string): string | undefined } }): boolean {
  const token = getAdminToken(c);
  return Boolean(token && token === c.env.ADMIN_REFRESH_TOKEN);
}

app.on(["GET", "HEAD"], "/", async (c) => {
  if (c.req.method === "HEAD") {
    const headers = new Headers();
    headers.set("cache-control", htmlCacheControl());
    headers.set("content-language", "vi");
    appendHomepageAgentLinkHeaders(headers);
    return new Response(null, { status: 200, headers });
  }

  // Stream HTML so RFC 8288 `Link` headers are sent immediately; slow DB work runs after
  // the response is returned (avoids scanners aborting before headers on cold GET /).
  const outHeaders = new Headers({
    "cache-control": htmlCacheControl(),
    "content-language": "vi",
    "content-type": "text/html; charset=UTF-8"
  });
  appendHomepageAgentLinkHeaders(outHeaders);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        const encoder = new TextEncoder();
        try {
          const source = clampText(c.req.query("source"), 80);
          const sentiment = (c.req.query("sentiment") ?? "").trim().toLowerCase();
          const date = (c.req.query("date") ?? "").trim();
          const q = clampText(c.req.query("q"), 120);
          const page = clampInt(c.req.query("page"), 1, 1, 200);
          const reportDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : getTodayDateKey();
          const feed = await getFeedByDate(c.env, reportDate, {
            sourceFilter: source || undefined,
            page,
            pageSize: 50,
            q: q || undefined
          });
          const availableSources = Array.from(new Set(feed.articles.map((article) => article.sourceName))).sort();
          const previousSentiment = feed.reportHistory?.[1]?.sentiment ?? null;
          const charts = buildChartsForToday(feed.articles, previousSentiment);
          const views = await getViewsMap(c.env, feed.reportDate);
          const hsxSymbols = (feed.hsxMarketSnapshot?.topVolume ?? []).map((item) => item.symbol).filter(Boolean);
          const hotKeywords = withPriorityKeywords(extractHotKeywords(feed.articles, 12), hsxSymbols, 12);

          const pinCandidateFeed = await getFeedByDate(c.env, reportDate, {
            sourceFilter: source || undefined,
            page: 1,
            pageSize: 200,
            q: q || undefined
          });
          const withViewsAll = pinCandidateFeed.articles.map((a) => ({
            article: a,
            views: views[a.url] ?? 0,
            score: hotScore(a),
            sentiment: classifySentimentText(`${a.title}\n${a.summaryVi ?? ""}\n${a.snippet}`).label
          }));
          const withViews =
            sentiment === "positive" || sentiment === "neutral" || sentiment === "negative"
              ? withViewsAll.filter((x) => x.sentiment === sentiment)
              : withViewsAll;

          withViews.sort((a, b) => b.views - a.views || b.score - a.score || b.article.publishedAt.localeCompare(a.article.publishedAt));
          const pinned = withViews.slice(0, 3).map((x) => x.article);
          const pinnedUrls = new Set(pinned.map((p) => p.url));
          const remaining = withViews.filter((x) => !pinnedUrls.has(x.article.url)).map((x) => x.article);

          const maxVisible = 12;
          const pinnedMax = Math.min(3, pinned.length);
          const restLimit = Math.max(0, maxVisible - pinnedMax);

          const currentPage = Number.isFinite(page) && page > 0 ? page : 1;
          const isFirstPage = currentPage === 1;
          const pageSize = maxVisible;
          const pageOffset = (currentPage - 1) * pageSize;
          const pageSlice = remaining.slice(pageOffset, pageOffset + pageSize);
          const visibleRemaining = isFirstPage ? pageSlice.slice(0, restLimit) : pageSlice.slice(0, maxVisible);

          const redirectify = (url: string) => `/go?d=${encodeURIComponent(feed.reportDate)}&u=${encodeURIComponent(url)}`;
          const detailify = (url: string) => `/article?d=${encodeURIComponent(feed.reportDate)}&u=${encodeURIComponent(url)}`;
          const withSentiment = <T extends { title: string; summaryVi: string | null; snippet: string }>(a: T) => ({
            ...a,
            sentimentLabel: classifySentimentText(`${a.title}\n${a.summaryVi ?? ""}\n${a.snippet}`).label
          });
          const pinnedForUi = isFirstPage
            ? pinned.slice(0, pinnedMax).map((a) =>
                withSentiment({
                  ...a,
                  sourceUrl: redirectify(a.url),
                  detailUrl: detailify(a.url)
                })
              )
            : [];
          const remainingForUi = visibleRemaining.map((a) =>
            withSentiment({
              ...a,
              sourceUrl: redirectify(a.url),
              detailUrl: detailify(a.url)
            })
          );

          const canonicalUrl = new URL(c.req.url);
          canonicalUrl.searchParams.sort();
          const miniCalendarEvents = buildMarketCalendarFromArticles(pinCandidateFeed.articles, reportDate, 30).slice(0, 6);
          const html = renderHomePage({
            dateLabel: formatVietnamDateDisplay(`${feed.reportDate}T12:00:00+07:00`),
            report: feed.report,
            pinnedArticles: pinnedForUi,
            articles: remainingForUi,
            mediaItems: feed.mediaItems,
            marketSnapshot: feed.marketSnapshot,
            hsxMarketSnapshot: feed.hsxMarketSnapshot,
            fxMarketSnapshot: feed.fxMarketSnapshot,
            goldMarketSnapshot: feed.goldMarketSnapshot,
            availableSources,
            selectedSource: source || undefined,
            selectedSentiment: sentiment === "positive" || sentiment === "neutral" || sentiment === "negative" ? sentiment : undefined,
            chartsHtml: charts.html,
            hotKeywords,
            canonicalUrl: canonicalUrl.toString(),
            reportDate,
            q,
            page,
            total: pinCandidateFeed.total,
            pageSize: 12,
            updatedAt: feed.cachedAt,
            reportHistory: feed.reportHistory,
            cacheStatus: feed.cacheHit ? "hit" : "miss",
            calendarEvents: miniCalendarEvents,
            appearance: readAppearance(c)
          });
          controller.enqueue(encoder.encode(html));
          controller.close();
        } catch (error) {
          console.error("GET / failed:", error);
          controller.error(error instanceof Error ? error : new Error(String(error)));
        }
      })();
    }
  });

  return new Response(stream, { status: 200, headers: outHeaders });
});

app.get("/search", (c) => {
  const qp = new URL(c.req.url).searchParams;
  return c.redirect(`/?${qp.toString()}`, 302);
});

const PORTFOLIO_COOKIE = "vnwatch";
const PORTFOLIO_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
/** Đã xem onboarding Portfolio hoặc đã lưu ≥1 mã */
const PORTFOLIO_ONBOARDING_COOKIE = "sn_pf_onboard";

function deskReportDate(c: Context<{ Bindings: Env }>): string {
  const date = (c.req.query("date") ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : getTodayDateKey();
}

function portfolioSymbolsFromCookie(c: Context<{ Bindings: Env }>): string[] {
  const raw = getCookieValue(c, PORTFOLIO_COOKIE);
  if (!raw) return [];
  try {
    return parsePortfolioSymbols(decodeURIComponent(raw));
  } catch {
    return parsePortfolioSymbols(raw);
  }
}

async function buildDeskSnapshotForDate(env: Env, reportDate: string) {
  const feed = await getFeedByDate(env, reportDate, { page: 1, pageSize: 200 });
  const sentiment = analyzeSentimentForArticles(feed.articles);
  const hsx = await getHSXMarketSnapshot(env);
  return {
    feed,
    snap: buildDailyInvestorSnapshot({
      reportDate,
      articles: feed.articles,
      sentiment,
      report: feed.report,
      hsx,
      hotScoreFn: hotScore
    })
  };
}

app.get("/desk", async (c) => {
  try {
    const reportDate = deskReportDate(c);
    const { feed, snap } = await buildDeskSnapshotForDate(c.env, reportDate);
    return c.html(renderInvestorHub({ reportDate, snap, report: feed.report, appearance: readAppearance(c) }), 200, {
      "cache-control": htmlCacheControl(),
      "content-language": "vi"
    });
  } catch (error) {
    console.error("GET /desk failed:", error);
    return c.text("Internal Server Error", 500);
  }
});

app.get("/briefing", async (c) => {
  try {
    const reportDate = deskReportDate(c);
    const { feed, snap } = await buildDeskSnapshotForDate(c.env, reportDate);
    return c.html(renderMorningBriefing({ reportDate, report: feed.report, snap, appearance: readAppearance(c) }), 200, {
      "cache-control": htmlCacheControl(),
      "content-language": "vi"
    });
  } catch (error) {
    console.error("GET /briefing failed:", error);
    return c.text("Internal Server Error", 500);
  }
});

app.get("/markets", async (c) => {
  try {
    const reportDate = deskReportDate(c);
    const { snap } = await buildDeskSnapshotForDate(c.env, reportDate);
    return c.html(renderMarketsDesk({ reportDate, snap, appearance: readAppearance(c) }), 200, {
      "cache-control": htmlCacheControl(),
      "content-language": "vi"
    });
  } catch (error) {
    console.error("GET /markets failed:", error);
    return c.text("Internal Server Error", 500);
  }
});

app.get("/portfolio", async (c) => {
  try {
    if (c.req.query("dismiss_onboarding") === "1") {
      c.header(
        "Set-Cookie",
        `${PORTFOLIO_ONBOARDING_COOKIE}=1; Path=/; Max-Age=${PORTFOLIO_COOKIE_MAX_AGE}; SameSite=Lax`
      );
      const u = new URL(c.req.url);
      u.searchParams.delete("dismiss_onboarding");
      const dest = `${u.pathname}${u.search}` || "/portfolio";
      return c.redirect(dest, 302);
    }
    const reportDate = deskReportDate(c);
    const symbols = portfolioSymbolsFromCookie(c);
    const feed = await getFeedByDate(c.env, reportDate, { page: 1, pageSize: 200 });
    const filtered = symbols.length ? filterArticlesForPortfolio(feed.articles, symbols) : feed.articles;
    const flash = c.req.query("saved") === "1" ? "Đã lưu danh sách theo dõi." : undefined;
    const prefillRaw = clampText(c.req.query("prefill"), 200);
    const prefillSymbols = prefillRaw ? parsePortfolioSymbols(prefillRaw) : [];
    const formInputValue = symbols.length ? symbols.join(", ") : prefillSymbols.join(", ");
    const portfolioOnboardingDone = getCookieValue(c, PORTFOLIO_ONBOARDING_COOKIE) === "1";
    const showOnboarding = !portfolioOnboardingDone && symbols.length === 0;
    return c.html(
      renderPortfolioDesk({
        reportDate,
        symbols,
        articles: filtered,
        impactFn: (a) => computeNewsImpactScore(a, hotScore(a)),
        flash,
        appearance: readAppearance(c),
        showOnboarding,
        formInputValue
      }),
      200,
      { "cache-control": htmlCacheControl(), "content-language": "vi" }
    );
  } catch (error) {
    console.error("GET /portfolio failed:", error);
    return c.text("Internal Server Error", 500);
  }
});

app.post("/portfolio", async (c) => {
  try {
    const fd = await c.req.formData();
    const raw = String(fd.get("symbols") ?? "");
    const symbols = parsePortfolioSymbols(raw);
    const val = encodeURIComponent(symbols.join(","));
    c.header(
      "Set-Cookie",
      `${PORTFOLIO_COOKIE}=${val}; Path=/; Max-Age=${PORTFOLIO_COOKIE_MAX_AGE}; SameSite=Lax`
    );
    if (symbols.length > 0) {
      c.header(
        "Set-Cookie",
        `${PORTFOLIO_ONBOARDING_COOKIE}=1; Path=/; Max-Age=${PORTFOLIO_COOKIE_MAX_AGE}; SameSite=Lax`,
        { append: true }
      );
    }
    return c.redirect("/portfolio?saved=1", 302);
  } catch (error) {
    console.error("POST /portfolio failed:", error);
    return c.text("Bad Request", 400);
  }
});

app.get("/intel", async (c) => {
  try {
    const dates = await listIntelArchiveDates(c.env);
    return c.html(renderIntelArchive({ dates, appearance: readAppearance(c) }), 200, {
      "cache-control": htmlCacheControl(),
      "content-language": "vi"
    });
  } catch (error) {
    console.error("GET /intel failed:", error);
    return c.text("Internal Server Error", 500);
  }
});

app.get("/api/intel/daily", async (c) => {
  const date = (c.req.query("date") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: "invalid_date" }, 400);
  }
  return loadInvestorSnapshotFromR2(c.env, date).then((snap) => {
    if (!snap) return c.json({ error: "not_found" }, 404);
    return c.json(snap);
  });
});

app.get("/go", async (c) => {
  try {
    const url = c.req.query("u") ?? "";
    const reportDate = c.req.query("d") ?? getTodayDateKey();
    const target = new URL(url);
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return c.text("Invalid URL", 400);
    }
    if (url.length > 1800) {
      return c.text("URL too long", 400);
    }

    // Fire-and-forget view tracking.
    c.executionCtx.waitUntil(incrementView(c.env, reportDate, url));
    return c.redirect(url, 302);
  } catch {
    return c.text("Invalid URL", 400);
  }
});

app.get("/assets/*", async (c) => {
  const key = (c.req.path.replace(/^\/assets\//, "") ?? "").trim();
  if (!key || key.includes("..") || key.startsWith("/")) {
    return c.text("Not found", 404);
  }
  if (!c.env.ASSETS) {
    return c.text("Assets not configured", 500);
  }

  const obj = await c.env.ASSETS.get(key);
  if (!obj) {
    // Friendly fallback for brand logo during rollout.
    if (key === LOGO_ASSET_KEY) {
      return c.text("Logo not uploaded", 404);
    }
    return c.text("Not found", 404);
  }

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  const immutable = /\.(?:avif|webp|png|jpg|jpeg|gif|svg|woff2|css|js)$/i.test(key);
  headers.set("cache-control", immutable ? "public, max-age=31536000, immutable" : "public, max-age=86400");
  if (!headers.get("content-type")) {
    if (key.endsWith(".png")) headers.set("content-type", "image/png");
    else if (key.endsWith(".jpg") || key.endsWith(".jpeg")) headers.set("content-type", "image/jpeg");
    else if (key.endsWith(".webp")) headers.set("content-type", "image/webp");
    else headers.set("content-type", "application/octet-stream");
  }
  return new Response(obj.body, { headers });
});

app.get("/img", async (c) => {
  const raw = clampText(c.req.query("u"), 1800);
  if (!raw) return c.text("Missing image URL", 400);
  try {
    const target = new URL(raw);
    if (!/^https?:$/.test(target.protocol)) return c.text("Invalid URL", 400);
    const width = clampInt(c.req.query("w"), 1200, 16, 4096);
    const quality = clampInt(c.req.query("q"), 82, 40, 100);
    const resp = await fetchOptimizedRemoteImage(
      target.toString(),
      { width, quality, accept: c.req.header("Accept") ?? undefined },
      c.env
    );

    const contentType = resp.headers.get("content-type") ?? "application/octet-stream";
    if (!resp.ok || !contentType.toLowerCase().startsWith("image/")) {
      return c.redirect(`/assets/${LOGO_ASSET_KEY}`, 302);
    }
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        "content-type": contentType,
        vary: resp.headers.get("vary") ?? "Accept",
        "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800"
      }
    });
  } catch {
    return c.redirect(`/assets/${LOGO_ASSET_KEY}`, 302);
  }
});

app.get("/article", async (c) => {
  const url = clampText(c.req.query("u"), 1800);
  if (!url) return c.text("Missing article URL", 400);
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return c.text("Invalid URL", 400);
    const article = await getArticleByUrl(c.env.DB, parsed.toString());
    const extracted = await fetchAndExtractSource(parsed.toString());
    const title = article?.title ?? parsed.toString();
    const summary = article?.summaryVi ?? extracted?.text?.slice(0, 360) ?? "Chưa có tóm tắt.";
    const snippet = article?.snippet ?? extracted?.text?.slice(0, 800) ?? "";
    const sentimentLabel = classifySentimentText(`${title}\n${summary}\n${snippet}`).label;
    return c.html(
      renderArticleDetailPage({
        title,
        sourceName: article?.sourceName ?? parsed.hostname,
        publishedAt: article?.publishedAt ?? new Date().toISOString(),
        summaryVi: summary,
        snippet,
        imageUrl: article?.imageUrl ?? extracted?.imageUrl ?? null,
        sourceUrl: `/go?d=${encodeURIComponent(getTodayDateKey())}&u=${encodeURIComponent(parsed.toString())}`,
        sentimentLabel,
        cacheStatus: "miss",
        appearance: readAppearance(c),
        returnPath: `/article?u=${encodeURIComponent(url)}`
      }),
      200,
      {
        "cache-control": htmlCacheControl(),
        "content-language": "vi"
      }
    );
  } catch {
    return c.text("Invalid URL", 400);
  }
});

app.get("/stocks/:symbol", async (c) => {
  try {
    const symbol = clampText(c.req.param("symbol"), 8) ?? "";
    if (!symbol) return c.text("Missing symbol", 400);
    const date = (c.req.query("date") ?? "").trim();
    const reportDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : getTodayDateKey();
    const insight = await buildStockInsight(c.env, symbol, reportDate);
    return c.html(renderStockPage(insight, readAppearance(c)), 200, {
      "cache-control": "public, s-maxage=120, stale-while-revalidate=600, stale-if-error=1800",
      "content-language": "vi"
    });
  } catch (error) {
    console.error("GET /stocks/:symbol failed:", error);
    return c.text("Failed to render stock page", 500);
  }
});

app.get("/api/stocks/:symbol", async (c) => {
  try {
    const symbol = clampText(c.req.param("symbol"), 8) ?? "";
    if (!symbol) return c.json({ error: "Missing symbol" }, 400);
    const date = (c.req.query("date") ?? "").trim();
    const reportDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : getTodayDateKey();
    const insight = await buildStockInsight(c.env, symbol, reportDate);
    return c.json(insight, 200, {
      "cache-control": "public, s-maxage=120, stale-while-revalidate=600, stale-if-error=1800"
    });
  } catch (error) {
    console.error("GET /api/stocks/:symbol failed:", error);
    return c.json({ error: "Failed to build stock insight" }, 500);
  }
});

app.get("/api/news/today", async (c) => {
  try {
    const source = clampText(c.req.query("source"), 80);
    const date = (c.req.query("date") ?? "").trim();
    const page = clampInt(c.req.query("page"), 1, 1, 200);
    const pageSize = clampInt(c.req.query("pageSize"), 50, 1, 200);
    const reportDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : getTodayDateKey();
    const feed = await getFeedByDate(c.env, reportDate, { sourceFilter: source || undefined, page, pageSize });
    return c.json({
      date: feed.reportDate,
      sourceFilter: source || null,
      report: feed.report,
      count: feed.articles.length,
      total: feed.total,
      cacheHit: feed.cacheHit,
      cachedAt: feed.cachedAt,
      articles: feed.articles
    }, 200, {
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300, stale-if-error=3600"
    });
  } catch (error) {
    console.error("GET /api/news/today failed:", error);
    return c.json({ error: "Failed to retrieve today's feed" }, 500);
  }
});

/** Realtime nhẹ cho web: tin có published_at sau mốc client (polling ~48s); mode=portfolio lọc theo cookie vnwatch */
app.get("/api/live/poll", async (c) => {
  try {
    const dateRaw = (c.req.query("date") ?? "").trim();
    const reportDate = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : getTodayDateKey();
    let since = (c.req.query("since") ?? "").trim();
    if (since.length < 12 || since.length > 44) since = reportDayStartIso(reportDate);
    const portfolioMode = (c.req.query("mode") ?? "").trim() === "portfolio";
    const symbols = portfolioMode ? portfolioSymbolsFromCookie(c) : [];
    const body = await buildLivePollJson(c.env, reportDate, since, symbols);
    return c.json(body, 200, {
      "cache-control": "no-store"
    });
  } catch (error) {
    console.error("GET /api/live/poll failed:", error);
    return c.json({ error: "poll_failed" }, 500);
  }
});

app.get("/api/news/explain", async (c) => {
  try {
    const url = clampText(c.req.query("u"), 1800);
    if (!url) return c.json({ error: "Missing article URL" }, 400);
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return c.json({ error: "Invalid URL" }, 400);
    const canonicalUrl = parsed.toString();
    const article = await getArticleByUrl(c.env.DB, canonicalUrl);
    const explainPayload = article
      ? article
      : await (async () => {
          const media = await getMediaItemByUrl(c.env.DB, canonicalUrl);
          if (!media) return null;
          return {
            title: media.title,
            sourceName: media.sourceName,
            url: media.url,
            summaryVi: media.summaryVi,
            snippet: media.summaryVi?.trim() ? media.summaryVi : media.title
          };
        })();
    if (!explainPayload) return c.json({ error: "Article not found" }, 404);
    const explanation = await getOrCreateCachedExplanation(c.env, explainPayload);
    return c.json({ ok: true, explanation }, 200, {
      "cache-control": "public, s-maxage=300, stale-while-revalidate=900, stale-if-error=3600"
    });
  } catch (error) {
    console.error("GET /api/news/explain failed:", error);
    return c.json({ error: "Failed to explain news" }, 500);
  }
});

app.get("/api/hsx/vnindex-chart", async (c) => {
  try {
    const range = clampText(c.req.query("range"), 2);
    if (!range || (range !== "1w" && range !== "1m" && range !== "1y")) {
      return c.text("Invalid range", 400);
    }

    const snapshot = await getHSXMarketSnapshot(c.env);
    if (!snapshot) {
      return c.text("No HSX data", 404);
    }

    const points = range === "1w" ? snapshot.vnindex1W : range === "1m" ? snapshot.vnindex1M : snapshot.vnindex1Y;
    const label = range === "1w" ? "Tuần" : range === "1m" ? "Tháng" : "Năm";

    const html = renderVNIndexChart(points, label);
    return c.html(html, 200, {
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300, stale-if-error=3600"
    });
  } catch (error) {
    console.error("GET /api/hsx/vnindex-chart failed:", error);
    return c.text("Failed to render chart", 500);
  }
});

app.get("/rss/today", async (c) => {
  try {
    const source = clampText(c.req.query("source"), 80);
    const feed = await getTodayFeed(c.env, source || undefined);
    const url = new URL(c.req.url);
    const xml = generateTodayRssXml({
      baseUrl: url.origin,
      reportDate: feed.reportDate,
      report: feed.report,
      articles: feed.articles,
      sourceFilter: source || undefined
    });
    return c.text(xml, 200, {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=900, stale-if-error=3600"
    });
  } catch (error) {
    console.error("GET /rss/today failed:", error);
    return c.text("RSS generation failed", 500);
  }
});

app.post("/api/rum", async (c) => {
  try {
    const payload = await c.req.json();
    const routeTemplate = clampText(payload?.routeTemplate, 32) ?? "unknown";
    const metric = clampText(payload?.metric, 16) ?? "unknown";
    const value = Number(payload?.value ?? 0);
    const deviceClass = clampText(payload?.deviceClass, 16) ?? "unknown";
    const path = clampText(payload?.path, 200) ?? "";
    const cacheStatus = clampText(payload?.cacheStatus, 16) ?? "unknown";
    console.log("rum_metric", JSON.stringify({ routeTemplate, metric, value, deviceClass, path, cacheStatus, at: new Date().toISOString() }));
    return c.json({ ok: true }, 202);
  } catch {
    return c.json({ error: "invalid rum payload" }, 400);
  }
});

app.get("/health", (c) =>
  c.json(
    {
      ok: true,
      service: "vn-market-daily-worker",
      at: new Date().toISOString()
    },
    200,
    {
      "cache-control": "no-store"
    }
  )
);

app.get("/robots.txt", (c) => {
  const origin = new URL(c.req.url).origin;
  return c.text(buildRobotsTxt(origin), 200, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400"
  });
});

app.get("/docs/api", (c) => {
  const origin = new URL(c.req.url).origin;
  return c.html(renderApiDocsHtml(origin), 200, {
    "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
    "content-language": "vi"
  });
});

app.get("/openapi.json", (c) => {
  const origin = new URL(c.req.url).origin;
  const body = JSON.stringify(buildOpenApiDocument(origin));
  return c.body(body, 200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800"
  });
});

app.on(["GET", "HEAD"], "/.well-known/api-catalog", (c) => {
  const origin = new URL(c.req.url).origin;
  const headers: Record<string, string> = {
    "content-type": apiCatalogContentType(),
    "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    Link: buildApiCatalogHeadLinkHeader(origin)
  };
  if (c.req.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }
  const payload = buildApiCatalogLinkset(origin, PUBLIC_API_CATALOG_ENTRIES);
  return c.body(JSON.stringify(payload), 200, headers);
});

const oauthDiscoveryCacheHeaders = {
  "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "content-type": "application/json; charset=utf-8"
};

app.on(["GET", "HEAD"], "/.well-known/openid-configuration", (c) => {
  const origin = new URL(c.req.url).origin;
  if (c.req.method === "HEAD") {
    return new Response(null, { status: 200, headers: oauthDiscoveryCacheHeaders });
  }
  return c.json(buildOpenIdConnectDiscoveryDocument(origin), 200, oauthDiscoveryCacheHeaders);
});

app.on(["GET", "HEAD"], "/.well-known/oauth-authorization-server", (c) => {
  const origin = new URL(c.req.url).origin;
  if (c.req.method === "HEAD") {
    return new Response(null, { status: 200, headers: oauthDiscoveryCacheHeaders });
  }
  return c.json(buildOAuthAuthorizationServerMetadata(origin), 200, oauthDiscoveryCacheHeaders);
});

app.on(["GET", "HEAD"], "/.well-known/jwks.json", (c) => {
  const jwksHeaders = {
    "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
    "content-type": "application/json; charset=utf-8"
  };
  if (c.req.method === "HEAD") {
    return new Response(null, { status: 200, headers: jwksHeaders });
  }
  return c.json(buildJwksDocument(), 200, jwksHeaders);
});

/** Web Bot Auth — JWKS directory with HTTP message signatures on the response (Cloudflare / IETF draft). */
app.on(["GET", "HEAD"], "/.well-known/http-message-signatures-directory", async (c) => {
  return serveHttpMessageSignaturesDirectory(c.env, c.req.raw);
});

const agentSkillsDiscoveryHeaders = {
  "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "content-type": "application/json; charset=utf-8"
};

app.on(["GET", "HEAD"], "/.well-known/agent-skills/index.json", async (c) => {
  const origin = new URL(c.req.url).origin;
  if (c.req.method === "HEAD") {
    return new Response(null, { status: 200, headers: agentSkillsDiscoveryHeaders });
  }
  const payload = await buildAgentSkillsDiscoveryIndex(origin);
  return c.json(payload, 200, agentSkillsDiscoveryHeaders);
});

const agentSkillsMarkdownHeaders = {
  "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "content-type": "text/markdown; charset=utf-8"
};

app.on(["GET", "HEAD"], "/.well-known/agent-skills/agent-skills/SKILL.md", (c) => {
  if (c.req.method === "HEAD") {
    return new Response(null, { status: 200, headers: agentSkillsMarkdownHeaders });
  }
  return c.body(AGENT_SKILLS_SKILL_MD_BODY, 200, agentSkillsMarkdownHeaders);
});

/** RFC 9728 — OAuth 2.0 Protected Resource Metadata (https://www.rfc-editor.org/rfc/rfc9728) */
app.on(["GET", "HEAD"], "/.well-known/oauth-protected-resource", (c) => {
  const origin = new URL(c.req.url).origin;
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": oauthProtectedResourceCacheControl()
  };
  if (c.req.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }
  const body = JSON.stringify(buildOAuthProtectedResourceMetadata(origin, c.env));
  return c.body(body, 200, headers);
});

/** SEP-1649 / PR #2127 — MCP Server Card + CORS for agent discovery. */
const mcpServerCardCorsHeaders: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-max-age": "86400"
};

app.on(["GET", "HEAD", "OPTIONS"], "/.well-known/mcp/server-card.json", (c) => {
  const origin = new URL(c.req.url).origin;
  const headers: Record<string, string> = {
    ...mcpServerCardCorsHeaders,
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400"
  };
  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (c.req.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }
  return c.json(buildMcpServerCard(origin), 200, headers);
});

/** Reserved streamable MCP URL from server-card; returns 501 until a real MCP transport is implemented. */
const mcpTransportCorsHeaders: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, mcp-protocol-version, mcp-session-id, Accept",
  "access-control-max-age": "86400"
};

app.all("/mcp", (c) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: mcpTransportCorsHeaders });
  }
  return c.json(
    {
      error: "mcp_not_enabled",
      message:
        "Streamable MCP is not implemented on this worker. Use HTTP JSON APIs: /openapi.json and /.well-known/api-catalog (see /.well-known/mcp/server-card.json)."
    },
    501,
    { ...mcpTransportCorsHeaders, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  );
});

/** Stubs: metadata describes endpoints; this worker does not run a browser OAuth server (public APIs are anonymous; admin uses operator token). */
app.get("/oauth/authorize", (c) =>
  c.json(
    {
      error: "unsupported_operation",
      error_description:
        "OAuth 2.0 authorization is not enabled on this deployment. Public read APIs require no auth; operator JSON routes use the admin token (see /docs/api)."
    },
    501,
    { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  )
);

app.post("/oauth/token", (c) =>
  c.json(
    {
      error: "unsupported_grant_type",
      error_description:
        "Token issuance is not enabled. Use public endpoints without OAuth, or X-Admin-Token / admin session for /admin/* (see /docs/api)."
    },
    400,
    { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  )
);

app.get("/sitemap.xml", async (c) => {
  try {
    const origin = new URL(c.req.url).origin;
    const [articleRows, hsxSnap] = await Promise.all([
      listRecentArticlesForSitemap(c.env.DB, 2000),
      getHSXMarketSnapshot(c.env).catch(() => null)
    ]);

    const entries: SitemapUrlEntry[] = [];

    entries.push({ loc: `${origin}/`, changefreq: "hourly", priority: 1 });
    entries.push({ loc: `${origin}/calendar`, changefreq: "daily", priority: 0.75 });
    entries.push({ loc: `${origin}/notify`, changefreq: "monthly", priority: 0.5 });
    entries.push({ loc: `${origin}/status`, changefreq: "hourly", priority: 0.45 });
    entries.push({ loc: `${origin}/rss/today`, changefreq: "hourly", priority: 0.8 });

    const seenStock = new Set<string>();
    for (const row of hsxSnap?.topVolume ?? []) {
      const sym = normalizeStockSymbol(row.symbol ?? "");
      if (!sym || seenStock.has(sym)) continue;
      seenStock.add(sym);
      entries.push({
        loc: `${origin}/stocks/${encodeURIComponent(sym)}`,
        changefreq: "hourly",
        priority: 0.65
      });
    }

    for (const row of articleRows) {
      const u = row.url?.trim() ?? "";
      if (!u || u.length > 1800) continue;
      const reportDate = formatCalendarDateVietnam(row.publishedAt);
      const path = buildArticleDetailPath(reportDate, u);
      const loc = `${origin}${path}`;
      if (loc.length > 2048) continue;
      entries.push({
        loc,
        lastmod: w3cDateFromIso(row.publishedAt),
        changefreq: "hourly",
        priority: 0.7
      });
    }

    const xml = generateSitemapXml(entries);
    return c.body(xml, 200, {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=1800, stale-if-error=86400"
    });
  } catch (error) {
    console.error("GET /sitemap.xml failed:", error);
    return c.text("Failed to build sitemap", 500);
  }
});

app.get("/notify", async (c) => {
  const url = new URL(c.req.url);
  const configured = isTelegramNotifyConfigured(c.env);
  const subscriberCount = await getTelegramSubscriberCount(c.env);
  return c.html(
    renderNotifyPage({
      botUsername: c.env.TELEGRAM_BOT_USERNAME?.trim() ?? null,
      configured,
      subscriberCount,
      baseUrl: `${url.origin}`,
      appearance: readAppearance(c)
    }),
    200,
    {
      "cache-control": "public, s-maxage=120, stale-while-revalidate=600, stale-if-error=3600",
      "content-language": "vi"
    }
  );
});

app.get("/calendar", async (c) => {
  try {
    const date = (c.req.query("date") ?? "").trim();
    const reportDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : getTodayDateKey();
    const events = await buildMarketCalendar(c.env, reportDate, 45);
    return c.html(renderCalendarPage(events, reportDate, readAppearance(c)), 200, {
      "cache-control": "public, s-maxage=180, stale-while-revalidate=600, stale-if-error=1800",
      "content-language": "vi"
    });
  } catch (error) {
    console.error("GET /calendar failed:", error);
    return c.text("Calendar unavailable", 500);
  }
});

app.get("/api/notify/status", async (c) => {
  try {
    const configured = isTelegramNotifyConfigured(c.env);
    const subscriberCount = await getTelegramSubscriberCount(c.env);
    return c.json(
      {
        telegramConfigured: configured,
        subscriberCount,
        webhookPath: "/webhooks/telegram"
      },
      200,
      { "cache-control": "public, s-maxage=60" }
    );
  } catch (e) {
    console.error("GET /api/notify/status failed:", e);
    return c.json({ error: "status failed" }, 500);
  }
});

app.post("/webhooks/telegram", async (c) => {
  if (!c.env.TELEGRAM_WEBHOOK_SECRET?.trim()) {
    return c.text("Webhook secret not configured", 503);
  }
  if (!verifyTelegramWebhookSecret(c.env, c.req.header("X-Telegram-Bot-Api-Secret-Token"))) {
    return c.text("Unauthorized", 401);
  }
  if (!c.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return c.text("Bot token not configured", 503);
  }
  try {
    const body = (await c.req.json()) as unknown;
    await handleTelegramWebhookUpdate(c.env, body);
    return c.json({ ok: true });
  } catch (error) {
    console.error("POST /webhooks/telegram failed:", error);
    return c.json({ ok: false }, 500);
  }
});

app.post("/admin/notify", async (c) => {
  if (!isAdminAuthorized(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (!c.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return c.json({ error: "TELEGRAM_BOT_TOKEN not set" }, 503);
  }
  try {
    const payload = await c.req.json();
    const raw = typeof payload?.message === "string" ? payload.message : String(payload?.message ?? "");
    const message = raw.trim().slice(0, 4000);
    if (!message) {
      return c.json({ error: "message required" }, 400);
    }
    const result = await broadcastTelegramMessage(c.env, message);
    return c.json({ ok: true, sent: result.ok, failed: result.fail });
  } catch (error) {
    console.error("POST /admin/notify failed:", error);
    return c.json({ error: "broadcast failed" }, 500);
  }
});

app.get("/status", async (c) => {
  try {
    const [feedHealth, snapshot] = await Promise.all([listLatestFeedHealth(c.env.DB), getLatestSystemStatusSnapshot(c.env.DB)]);
    const latestUpdateAt =
      feedHealth
        .map((x) => x.checkedAt)
        .filter((x): x is string => Boolean(x))
        .sort((a, b) => b.localeCompare(a))[0] ?? null;
    const avgUpdateMinutes = snapshot ? 5 : null;
    return c.html(
      renderStatusPage({
        nowIso: new Date().toISOString(),
        workerVersion: c.env.WORKER_VERSION ?? "unknown",
        latestUpdateAt,
        avgUpdateMinutes,
        aiStatus: snapshot?.aiOk ? "ok" : "degraded",
        feedHealth,
        appearance: readAppearance(c)
      }),
      200,
      {
        "cache-control": "public, s-maxage=120, stale-while-revalidate=600, stale-if-error=1800",
        "content-language": "vi"
      }
    );
  } catch (error) {
    console.error("GET /status failed:", error);
    return c.text("Status unavailable", 500);
  }
});

app.get("/admin/login", (c) => {
  return c.html(renderAdminLoginPage({ message: c.req.query("message") ?? undefined, appearance: readAppearance(c) }), 200, {
    "cache-control": "no-store"
  });
});

app.post("/admin/login", async (c) => {
  try {
    const form = await c.req.formData();
    const token = String(form.get("token") ?? "").trim();
    if (!token) return c.redirect(`/admin/login?message=${encodeURIComponent("Token không được để trống")}`, 302);
    if (token !== c.env.ADMIN_REFRESH_TOKEN) {
      return c.redirect(`/admin/login?message=${encodeURIComponent("Token không đúng")}`, 302);
    }

    const secure = c.req.url.startsWith("https://");
    const cookie = `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/admin; Max-Age=${ADMIN_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${
      secure ? "; Secure" : ""
    }`;
    c.header("Set-Cookie", cookie);
    return c.redirect(`/admin?message=${encodeURIComponent("Đăng nhập admin thành công")}`, 302);
  } catch (error) {
    console.error("POST /admin/login failed:", error);
    return c.redirect(`/admin/login?message=${encodeURIComponent("Đăng nhập thất bại")}`, 302);
  }
});

app.get("/admin", async (c) => {
  if (!isAdminAuthorized(c)) {
    return c.html(renderUnauthorizedAdmin(readAppearance(c)), 200, { "cache-control": "no-store" });
  }

  try {
    const [sources, runs, manualArticles, subscriberCount] = await Promise.all([
      listSources(c.env.DB),
      listRecentCrawlRuns(c.env.DB, 10),
      listRecentManualArticles(c.env.DB, 50),
      getTelegramSubscriberCount(c.env)
    ]);

    return c.html(
      renderAdminDashboardPage({
        sourceCount: sources.length,
        enabledSourceCount: sources.filter((item) => item.enabled).length,
        manualArticleCount: manualArticles.length,
        recentRunCount: runs.length,
        subscriberCount,
        telegramConfigured: isTelegramNotifyConfigured(c.env),
        imagesHostedConfigured: Boolean(c.env.CF_IMAGES_ACCOUNT_HASH?.trim()),
        imagesVariant: c.env.CF_IMAGES_VARIANT?.trim() || "public",
        message: c.req.query("message") ?? undefined,
        appearance: readAppearance(c)
      }),
      200,
      { "cache-control": "no-store" }
    );
  } catch (error) {
    console.error("GET /admin failed:", error);
    return c.text("Failed to load admin dashboard", 500);
  }
});

app.post("/admin/refresh", async (c) => {
  if (!isAdminAuthorized(c)) {
    return jsonUnauthorizedWithResourceMetadata(c);
  }

  try {
    const result = await refreshDailyNews(c.env);
    return c.json({
      ok: true,
      reportDate: result.reportDate,
      fetchedCount: result.fetchedCount,
      storedCount: result.storedCount,
      summarizedCount: result.summarizedCount,
      report: result.report
    });
  } catch (error) {
    console.error("POST /admin/refresh failed:", error);
    return c.json({ error: "Refresh failed" }, 500);
  }
});

app.get("/admin/sources", async (c) => {
  if (!isAdminAuthorized(c)) {
    return c.html(renderUnauthorizedAdmin(readAppearance(c)), 200, { "cache-control": "no-store" });
  }

  try {
    const [sources, runs, manualArticles] = await Promise.all([
      listSources(c.env.DB),
      listRecentCrawlRuns(c.env.DB, 20),
      listRecentManualArticles(c.env.DB, 12)
    ]);
    return c.html(
      renderAdminSourcesPage({
        sources,
        runs,
        manualArticles,
        message: c.req.query("message") ?? undefined,
        appearance: readAppearance(c)
      }),
      200,
      { "cache-control": "no-store" }
    );
  } catch (error) {
    console.error("GET /admin/sources failed:", error);
    return c.text("Failed to load admin sources", 500);
  }
});

app.post("/admin/sources", async (c) => {
  if (!isAdminAuthorized(c)) {
    return c.text("Unauthorized", 401);
  }

  try {
    const form = await c.req.formData();
    const name = String(form.get("name") ?? "").trim();
    const type = normalizeSourceType(String(form.get("type") ?? "rss"));
    const feedUrl = cleanOptional(String(form.get("feedUrl") ?? ""));
    const listUrl = cleanOptional(String(form.get("listUrl") ?? ""));
    const baseUrl = cleanOptional(String(form.get("baseUrl") ?? ""));
    const extractorKey = cleanOptional(String(form.get("extractorKey") ?? ""));
    const notes = cleanOptional(String(form.get("notes") ?? ""));
    const enabled = String(form.get("enabled") ?? "true") === "true";
    const allowCrawl = String(form.get("allowCrawl") ?? "false") === "true";

    if (!name) {
      return redirectAdmin(c, "Tên nguồn là bắt buộc");
    }
    if (type === "rss" && !feedUrl) {
      return redirectAdmin(c, "RSS source cần feed URL");
    }
    if (type === "html_list" && !listUrl) {
      return redirectAdmin(c, "HTML list source cần list URL");
    }

    const sourceId = slugify(name);
    const source: Omit<NewsSourceRecord, "lastRunStatus" | "lastRunAt" | "lastRunMessage" | "createdAt" | "updatedAt"> = {
      id: sourceId,
      name,
      type,
      baseUrl,
      feedUrl,
      listUrl,
      enabled,
      allowCrawl,
      respectRobots: true,
      extractorKey,
      notes,
      isDefault: false
    };

    await createSource(c.env.DB, source);
    return redirectAdmin(c, `Đã lưu source ${name}`);
  } catch (error) {
    console.error("POST /admin/sources failed:", error);
    return redirectAdmin(c, "Không thể lưu source");
  }
});

app.post("/admin/rss", async (c) => {
  if (!isAdminAuthorized(c)) {
    return c.text("Unauthorized", 401);
  }
  try {
    const form = await c.req.formData();
    const name = String(form.get("name") ?? "").trim();
    const feedUrl = cleanOptional(String(form.get("feedUrl") ?? ""));
    const baseUrl = cleanOptional(String(form.get("baseUrl") ?? ""));
    const enabled = String(form.get("enabled") ?? "true") === "true";
    if (!name || !feedUrl) {
      return redirectAdmin(c, "Tên nguồn và feed_url là bắt buộc");
    }
    const sourceId = slugify(name);
    await createSource(c.env.DB, {
      id: sourceId,
      name,
      type: "rss",
      baseUrl,
      feedUrl,
      listUrl: null,
      enabled,
      allowCrawl: false,
      respectRobots: true,
      extractorKey: null,
      notes: "Added from CMS RSS form",
      isDefault: false
    });
    return redirectAdmin(c, `Đã thêm RSS feed ${name}`);
  } catch (error) {
    console.error("POST /admin/rss failed:", error);
    return redirectAdmin(c, "Không thể thêm RSS feed");
  }
});

app.post("/admin/articles/manual", async (c) => {
  if (!isAdminAuthorized(c)) {
    return c.text("Unauthorized", 401);
  }
  try {
    const form = await c.req.formData();
    const title = String(form.get("title") ?? "").trim();
    const url = String(form.get("url") ?? "").trim();
    const sourceName = String(form.get("sourceName") ?? "CMS Manual").trim() || "CMS Manual";
    const summaryVi = cleanOptional(String(form.get("summaryVi") ?? ""));
    const snippet = String(form.get("snippet") ?? "").trim() || summaryVi || title;
    const imageUrl = cleanOptional(String(form.get("imageUrl") ?? ""));
    const publishedAtRaw = cleanOptional(String(form.get("publishedAt") ?? ""));

    if (!title || !url) {
      return redirectAdmin(c, "Bài viết thủ công cần title và URL");
    }
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) {
      return redirectAdmin(c, "URL bài viết không hợp lệ");
    }

    const publishedAt = publishedAtRaw ? new Date(publishedAtRaw) : new Date();
    if (Number.isNaN(publishedAt.getTime())) {
      return redirectAdmin(c, "Ngày giờ xuất bản không hợp lệ");
    }

    await createManualArticle(c.env.DB, {
      sourceId: "cms-manual",
      sourceName,
      title,
      url: parsed.toString(),
      publishedAt: publishedAt.toISOString(),
      snippet,
      contentLimited: false,
      summaryVi,
      imageUrl
    });
    return redirectAdmin(c, `Đã thêm bài viết thủ công: ${title}`);
  } catch (error) {
    console.error("POST /admin/articles/manual failed:", error);
    return redirectAdmin(c, "Không thể thêm bài viết thủ công");
  }
});

app.post("/admin/articles/manual/:id", async (c) => {
  if (!isAdminAuthorized(c)) {
    return c.text("Unauthorized", 401);
  }
  try {
    const articleId = Number(c.req.param("id"));
    if (!Number.isInteger(articleId) || articleId <= 0) {
      return redirectAdmin(c, "ID bài viết không hợp lệ");
    }

    const form = await c.req.formData();
    const title = String(form.get("title") ?? "").trim();
    const url = String(form.get("url") ?? "").trim();
    const sourceName = String(form.get("sourceName") ?? "CMS Manual").trim() || "CMS Manual";
    const snippet = String(form.get("snippet") ?? "").trim();
    const summaryVi = cleanOptional(String(form.get("summaryVi") ?? ""));
    const imageUrl = cleanOptional(String(form.get("imageUrl") ?? ""));
    const publishedAtRaw = String(form.get("publishedAt") ?? "").trim();

    if (!title || !url || !publishedAtRaw) {
      return redirectAdmin(c, "Thiếu dữ liệu để cập nhật bài viết");
    }

    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) {
      return redirectAdmin(c, "URL bài viết không hợp lệ");
    }
    const publishedAt = new Date(publishedAtRaw);
    if (Number.isNaN(publishedAt.getTime())) {
      return redirectAdmin(c, "Ngày giờ xuất bản không hợp lệ");
    }

    await updateManualArticle(c.env.DB, articleId, {
      title,
      url: parsed.toString(),
      publishedAt: publishedAt.toISOString(),
      snippet: snippet || summaryVi || title,
      summaryVi,
      imageUrl,
      sourceName
    });
    return redirectAdmin(c, `Đã cập nhật bài viết #${articleId}`);
  } catch (error) {
    console.error("POST /admin/articles/manual/:id failed:", error);
    return redirectAdmin(c, "Không thể cập nhật bài viết thủ công");
  }
});

app.post("/admin/articles/manual/:id/delete", async (c) => {
  if (!isAdminAuthorized(c)) {
    return c.text("Unauthorized", 401);
  }
  try {
    const articleId = Number(c.req.param("id"));
    if (!Number.isInteger(articleId) || articleId <= 0) {
      return redirectAdmin(c, "ID bài viết không hợp lệ");
    }
    await deleteManualArticle(c.env.DB, articleId);
    return redirectAdmin(c, `Đã xóa bài viết #${articleId}`);
  } catch (error) {
    console.error("POST /admin/articles/manual/:id/delete failed:", error);
    return redirectAdmin(c, "Không thể xóa bài viết thủ công");
  }
});

app.post("/admin/sources/:id/toggle", async (c) => {
  if (!isAdminAuthorized(c)) {
    return c.text("Unauthorized", 401);
  }
  try {
    await toggleSource(c.env.DB, c.req.param("id"));
    return redirectAdmin(c, "Đã cập nhật trạng thái source");
  } catch (error) {
    console.error("POST /admin/sources/:id/toggle failed:", error);
    return redirectAdmin(c, "Không thể cập nhật trạng thái source");
  }
});

app.post("/admin/sources/:id/delete", async (c) => {
  if (!isAdminAuthorized(c)) {
    return c.text("Unauthorized", 401);
  }
  try {
    await deleteSource(c.env.DB, c.req.param("id"));
    return redirectAdmin(c, "Đã xóa source custom");
  } catch (error) {
    console.error("POST /admin/sources/:id/delete failed:", error);
    return redirectAdmin(c, "Không thể xóa source");
  }
});

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const dayKey = getTodayDateKey();
    console.log(`Scheduled refresh started for ${dayKey}`);
    ctx.waitUntil(
      refreshDailyNews(env)
        .then((result) => {
          console.log("Scheduled refresh complete:", JSON.stringify(result));
        })
        .catch((error) => {
          console.error("Scheduled refresh failed:", error);
        })
    );
  }
};

console.log(
  `Active sources: ${NEWS_SOURCES.filter((item) => item.enabled)
    .map((item) => item.name)
    .join(", ")}`
);

function redirectAdmin(c: Context<{ Bindings: Env }>, message: string) {
  const qs = new URLSearchParams();
  qs.set("message", message);
  return c.redirect(`/admin/sources?${qs.toString()}`, 302);
}

function normalizeSourceType(input: string): NewsSourceType {
  return input === "html_list" ? "html_list" : "rss";
}

function cleanOptional(input: string): string | null {
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function renderUnauthorizedAdmin(appearance: Appearance): string {
  const sw = themeAppearanceSwitcher(appearance, "/admin/login");
  return `<!doctype html>
  <html lang="vi" data-theme="${appearance}"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Đăng nhập quản trị</title>
  ${themeFontLinks()}
  <style>${themeSemanticVariablesBlock()}
  body.appBody{font-family:var(--font-body);background:var(--bg);margin:0;padding:16px;color:var(--text)}
  .topNavRow{display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap}
  .card{max-width:520px;margin:48px auto;background:var(--surface);border-radius:16px;padding:18px;box-shadow:var(--shadow);border:1px solid var(--border)}input,button{width:100%;padding:12px;border-radius:12px;font:inherit}input{border:1px solid var(--border);margin:10px 0 12px;background:var(--surface);color:var(--text)}button{border:0;background:var(--primary);color:#fff;font-weight:700}</style></head>
  <body class="appBody"><div class="topNavRow">${sw}</div><main class="card"><h1>Cần token quản trị</h1><p>Nhập token để truy cập trang quản trị.</p><form method="GET" action="/admin/login"><input name="token" type="password" placeholder="ADMIN_REFRESH_TOKEN" required /><button type="submit">Mở đăng nhập</button></form></main></body></html>`;
}

function clampText(input: string | undefined, maxLen: number): string | undefined {
  if (!input) return undefined;
  const v = input.trim();
  if (!v) return undefined;
  return v.slice(0, maxLen);
}

function clampInt(input: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt((input ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function htmlCacheControl(): string {
  return "public, s-maxage=300, stale-while-revalidate=900, stale-if-error=3600";
}

function withPriorityKeywords(base: string[], priority: string[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (item: string) => {
    const v = item.trim();
    if (!v) return;
    const k = v.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(v);
  };
  for (const p of priority) push(p);
  for (const b of base) push(b);
  return out.slice(0, max);
}
