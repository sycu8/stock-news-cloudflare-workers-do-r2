import { Hono } from "hono";
import type { Context } from "hono";
import {
  createSource,
  deleteSource,
  ensureDefaultSources,
  getArticleByUrl,
  getTodayDateKey,
  listRecentCrawlRuns,
  listSources,
  toggleSource
} from "./db";
import { NEWS_SOURCES } from "./config/sources";
import { getFeedByDate, getTodayFeed, refreshDailyNews } from "./services/refresh";
import type { Env, NewsSourceRecord, NewsSourceType } from "./types";
import { formatVietnamDateDisplay } from "./utils/date";
import { renderArticleDetailPage, renderHomePage } from "./ui/render";
import { generateTodayRssXml } from "./ui/rss";
import { renderAdminSourcesPage } from "./ui/admin";
import { buildChartsForToday } from "./ui/charts";
import { extractHotKeywords } from "./services/hot-keywords";
import { getViewsMap, incrementView } from "./services/views";
import { LOGO_ASSET_KEY } from "./ui/brand";
import { classifySentimentText } from "./services/sentiment";
import { fetchAndExtractSource } from "./services/source-extract";
import { fetchOptimizedRemoteImage } from "./services/cf-image-fetch";

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  await ensureDefaultSources(c.env.DB);
  await next();
});

app.get("/", async (c) => {
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
    const hotKeywords = extractHotKeywords(feed.articles, 12);

    // For pinning, load more items (up to 200) for the day to rank by views/hotness.
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
    return c.html(
      renderHomePage({
        dateLabel: formatVietnamDateDisplay(`${feed.reportDate}T00:00:00.000Z`),
        report: feed.report,
        pinnedArticles: pinnedForUi,
        articles: remainingForUi,
        mediaItems: feed.mediaItems,
        marketSnapshot: feed.marketSnapshot,
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
        cacheStatus: feed.cacheHit ? "hit" : "miss"
      })
      ,
      200,
      {
        "cache-control": htmlCacheControl(),
        "content-language": "vi"
      }
    );
  } catch (error) {
    console.error("GET / failed:", error);
    return c.text("Internal Server Error", 500);
  }
});

app.get("/search", (c) => {
  const qp = new URL(c.req.url).searchParams;
  return c.redirect(`/?${qp.toString()}`, 302);
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
        cacheStatus: "miss"
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
      "cache-control": "public, s-maxage=120, stale-while-revalidate=300, stale-if-error=3600"
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

app.post("/admin/refresh", async (c) => {
  if (!isAdminAuthorized(c)) {
    return c.json({ error: "Unauthorized" }, 401);
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
    return c.html(renderUnauthorizedAdmin());
  }

  try {
    const [sources, runs] = await Promise.all([listSources(c.env.DB), listRecentCrawlRuns(c.env.DB, 20)]);
    return c.html(
      renderAdminSourcesPage({
        token: getAdminToken(c) ?? "",
        sources,
        runs,
        message: c.req.query("message") ?? undefined
      })
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

function getAdminToken(c: { req: { header(name: string): string | undefined; query(name: string): string | undefined } }): string | null {
  return c.req.header("x-admin-token") ?? c.req.query("token") ?? null;
}

function isAdminAuthorized(c: { env: Env; req: { header(name: string): string | undefined; query(name: string): string | undefined } }): boolean {
  const token = getAdminToken(c);
  return Boolean(token && token === c.env.ADMIN_REFRESH_TOKEN);
}

function redirectAdmin(c: Context<{ Bindings: Env }>, message: string) {
  const token = c.req.query("token");
  const qs = new URLSearchParams();
  qs.set("message", message);
  if (token) {
    qs.set("token", token);
  }
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

function renderUnauthorizedAdmin(): string {
  return `<!doctype html>
  <html lang="vi"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Admin Login</title>
  <style>body{font-family:Inter,Arial,sans-serif;background:#f4f6fb;margin:0;padding:16px}.card{max-width:520px;margin:48px auto;background:#fff;border-radius:16px;padding:18px;box-shadow:0 6px 24px rgba(16,24,40,.06)}input,button{width:100%;padding:12px;border-radius:12px;font:inherit}input{border:1px solid #d0d5dd;margin:10px 0 12px}button{border:0;background:#155eef;color:#fff}</style></head>
  <body><main class="card"><h1>Admin token required</h1><p>Nhập token để truy cập trang quản trị nguồn tin.</p><form method="GET" action="/admin/sources"><input name="token" type="password" placeholder="ADMIN_REFRESH_TOKEN" required /><button type="submit">Mở admin</button></form></main></body></html>`;
}

function hotScore(a: { title: string; snippet: string; summaryVi: string | null; sourceName: string }): number {
  const text = `${a.title} ${a.summaryVi ?? ""} ${a.snippet}`.toLowerCase();
  const terms = [
    ["vn-index", 3],
    ["vnindex", 3],
    ["lãi suất", 2],
    ["tỷ giá", 2],
    ["kết quả kinh doanh", 2],
    ["mua ròng", 2],
    ["bán ròng", 2],
    ["khối ngoại", 2],
    ["tăng", 1],
    ["giảm", 1],
    ["điều chỉnh", 1],
    ["đột biến", 2]
  ] as const;
  let s = 0;
  for (const [t, w] of terms) {
    if (text.includes(t)) s += w;
  }
  // Slightly prioritize commentary sources.
  if (a.sourceName.toLowerCase().includes("research")) s += 1;
  return s;
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
  return "public, s-maxage=120, stale-while-revalidate=300, stale-if-error=3600";
}
