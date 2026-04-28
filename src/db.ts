import { NEWS_SOURCES } from "./config/sources";
import type { CrawlRunRecord, DailyReport, MediaItemRecord, NewsSourceRecord, NormalizedArticle, StoredArticle } from "./types";
import { formatDateOnly } from "./utils/date";

interface D1ResultRow {
  id: number;
  source_id: string;
  source_name: string;
  title: string;
  url: string;
  published_at: string;
  snippet: string;
  content_limited: number;
  summary_vi: string | null;
  image_url?: string | null;
}

interface DailyReportRow {
  report_date: string;
  overview_vi: string;
  outlook_vi: string;
  assumptions_vi: string | null;
  article_count: number;
}

interface NewsSourceRow {
  id: string;
  name: string;
  type: "rss" | "html_list";
  base_url: string | null;
  feed_url: string | null;
  list_url: string | null;
  enabled: number;
  allow_crawl: number;
  respect_robots: number;
  extractor_key: string | null;
  notes: string | null;
  is_default: number;
  created_at: string;
  updated_at: string;
  last_run_status?: string | null;
  last_run_at?: string | null;
  last_run_message?: string | null;
}

interface CrawlRunRow {
  id: number;
  source_id: string;
  status: "success" | "error";
  message: string | null;
  fetched_count: number;
  created_at: string;
}

interface MediaItemRow {
  id: number;
  kind: "youtube" | "news_image";
  source_id: string;
  source_name: string;
  title: string;
  url: string;
  published_at: string;
  report_date: string;
  summary_vi: string | null;
  image_url: string | null;
}

export async function upsertArticle(db: D1Database, article: NormalizedArticle): Promise<void> {
  await db
    .prepare(
      `INSERT INTO articles (source_id, source_name, title, url, published_at, snippet, content_limited)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT(url) DO UPDATE SET
         source_id = excluded.source_id,
         source_name = excluded.source_name,
         title = excluded.title,
         published_at = excluded.published_at,
         snippet = excluded.snippet,
         content_limited = excluded.content_limited,
         updated_at = datetime('now')`
    )
    .bind(
      article.sourceId,
      article.sourceName,
      article.title,
      article.url,
      article.publishedAt,
      article.snippet,
      article.contentLimited ? 1 : 0
    )
    .run();
}

export async function getArticlesByDate(db: D1Database, reportDate: string): Promise<StoredArticle[]> {
  const start = `${reportDate}T00:00:00.000Z`;
  const end = `${reportDate}T23:59:59.999Z`;
  const { results } = await db
    .prepare(
      `SELECT id, source_id, source_name, title, url, published_at, snippet, content_limited, summary_vi, image_url
       FROM articles
       WHERE published_at BETWEEN ?1 AND ?2
       ORDER BY published_at DESC`
    )
    .bind(start, end)
    .all<D1ResultRow>();

  return results.map((row) => ({
    id: row.id,
    sourceId: row.source_id,
    sourceName: row.source_name,
    title: row.title,
    url: row.url,
    publishedAt: row.published_at,
    snippet: row.snippet ?? "",
    contentLimited: row.content_limited === 1,
    summaryVi: row.summary_vi,
    imageUrl: row.image_url ?? null
  }));
}

export async function getArticleByUrl(db: D1Database, url: string): Promise<StoredArticle | null> {
  const row = await db
    .prepare(
      `SELECT id, source_id, source_name, title, url, published_at, snippet, content_limited, summary_vi, image_url
       FROM articles
       WHERE url = ?1
       LIMIT 1`
    )
    .bind(url)
    .first<D1ResultRow>();
  if (!row) return null;
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceName: row.source_name,
    title: row.title,
    url: row.url,
    publishedAt: row.published_at,
    snippet: row.snippet ?? "",
    contentLimited: row.content_limited === 1,
    summaryVi: row.summary_vi,
    imageUrl: row.image_url ?? null
  };
}

export async function getArticlesByDatePaged(params: {
  db: D1Database;
  reportDate: string;
  limit: number;
  offset: number;
  sourceFilter?: string;
  q?: string;
}): Promise<{ total: number; articles: StoredArticle[] }> {
  const { db, reportDate, limit, offset, sourceFilter, q } = params;
  const start = `${reportDate}T00:00:00.000Z`;
  const end = `${reportDate}T23:59:59.999Z`;
  const source = sourceFilter?.trim().toLowerCase() ?? "";
  const query = q?.trim().toLowerCase() ?? "";

  const where: string[] = [];
  const binds: unknown[] = [start, end];
  where.push(`published_at BETWEEN ?${binds.length - 1} AND ?${binds.length}`);

  if (source) {
    binds.push(source);
    const idx = binds.length;
    where.push(`(lower(source_id) = ?${idx} OR lower(source_name) = ?${idx})`);
  }
  if (query) {
    binds.push(`%${query}%`);
    const idx = binds.length;
    where.push(`(lower(title) LIKE ?${idx} OR lower(snippet) LIKE ?${idx} OR lower(summary_vi) LIKE ?${idx})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countStmt = `SELECT COUNT(*) as cnt FROM articles ${whereSql}`;
  const countRes = await db.prepare(countStmt).bind(...binds).first<{ cnt: number }>();
  const total = countRes?.cnt ?? 0;

  const listStmt = `SELECT id, source_id, source_name, title, url, published_at, snippet, content_limited, summary_vi, image_url
    FROM articles
    ${whereSql}
    ORDER BY published_at DESC
    LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`;

  const { results } = await db
    .prepare(listStmt)
    .bind(...binds, limit, offset)
    .all<D1ResultRow>();

  return {
    total,
    articles: results.map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      sourceName: row.source_name,
      title: row.title,
      url: row.url,
      publishedAt: row.published_at,
      snippet: row.snippet ?? "",
      contentLimited: row.content_limited === 1,
      summaryVi: row.summary_vi,
      imageUrl: row.image_url ?? null
    }))
  };
}

export async function setArticleImageUrl(db: D1Database, articleId: number, imageUrl: string | null): Promise<void> {
  await db
    .prepare(`UPDATE articles SET image_url = ?1, updated_at = datetime('now') WHERE id = ?2`)
    .bind(imageUrl, articleId)
    .run();
}

export async function listArticlesNeedingEnrichment(
  db: D1Database,
  reportDate: string,
  limit = 12
): Promise<StoredArticle[]> {
  const start = `${reportDate}T00:00:00.000Z`;
  const end = `${reportDate}T23:59:59.999Z`;
  const { results } = await db
    .prepare(
      `SELECT id, source_id, source_name, title, url, published_at, snippet, content_limited, summary_vi, image_url
       FROM articles
       WHERE published_at BETWEEN ?1 AND ?2
         AND (summary_vi IS NULL OR summary_vi = '' OR image_url IS NULL OR image_url = '')
       ORDER BY published_at DESC
       LIMIT ?3`
    )
    .bind(start, end, limit)
    .all<D1ResultRow>();

  return results.map((row) => ({
    id: row.id,
    sourceId: row.source_id,
    sourceName: row.source_name,
    title: row.title,
    url: row.url,
    publishedAt: row.published_at,
    snippet: row.snippet ?? "",
    contentLimited: row.content_limited === 1,
    summaryVi: row.summary_vi,
    imageUrl: row.image_url ?? null
  }));
}

export async function setArticleSummary(db: D1Database, articleId: number, summaryVi: string): Promise<void> {
  await db
    .prepare(`UPDATE articles SET summary_vi = ?1, updated_at = datetime('now') WHERE id = ?2`)
    .bind(summaryVi, articleId)
    .run();
}

export async function upsertDailyReport(db: D1Database, report: DailyReport): Promise<void> {
  await db
    .prepare(
      `INSERT INTO daily_reports (report_date, overview_vi, outlook_vi, assumptions_vi, article_count)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(report_date) DO UPDATE SET
         overview_vi = excluded.overview_vi,
         outlook_vi = excluded.outlook_vi,
         assumptions_vi = excluded.assumptions_vi,
         article_count = excluded.article_count,
         updated_at = datetime('now')`
    )
    .bind(report.reportDate, report.overviewVi, report.outlookVi, report.assumptionsVi, report.articleCount)
    .run();
}

export async function getDailyReport(db: D1Database, reportDate: string): Promise<DailyReport | null> {
  const { results } = await db
    .prepare(
      `SELECT report_date, overview_vi, outlook_vi, assumptions_vi, article_count
       FROM daily_reports
       WHERE report_date = ?1`
    )
    .bind(reportDate)
    .all<DailyReportRow>();

  if (!results.length) {
    return null;
  }

  const row = results[0];
  return {
    reportDate: row.report_date,
    overviewVi: row.overview_vi,
    outlookVi: row.outlook_vi,
    assumptionsVi: row.assumptions_vi ?? "",
    articleCount: row.article_count
  };
}

export function getTodayDateKey(): string {
  return formatDateOnly(new Date());
}

export async function ensureDefaultSources(db: D1Database): Promise<void> {
  for (const source of NEWS_SOURCES) {
    await db
      .prepare(
        `INSERT INTO news_sources
          (id, name, type, base_url, feed_url, list_url, enabled, allow_crawl, respect_robots, extractor_key, notes, is_default)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           type = excluded.type,
           base_url = excluded.base_url,
           feed_url = excluded.feed_url,
           list_url = excluded.list_url,
           allow_crawl = excluded.allow_crawl,
           respect_robots = excluded.respect_robots,
           extractor_key = excluded.extractor_key,
           notes = excluded.notes,
           is_default = excluded.is_default,
           updated_at = datetime('now')`
      )
      .bind(
        source.id,
        source.name,
        source.type,
        source.baseUrl ?? null,
        source.feedUrl ?? source.url ?? null,
        source.listUrl ?? null,
        source.enabled ? 1 : 0,
        source.allowCrawl ? 1 : 0,
        source.respectRobots === false ? 0 : 1,
        source.extractorKey ?? null,
        source.notes ?? null,
        source.isDefault ? 1 : 0
      )
      .run();
  }
}

export async function listSources(db: D1Database): Promise<NewsSourceRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT
         ns.id, ns.name, ns.type, ns.base_url, ns.feed_url, ns.list_url, ns.enabled,
         ns.allow_crawl, ns.respect_robots, ns.extractor_key, ns.notes, ns.is_default,
         ns.created_at, ns.updated_at,
         cr.status AS last_run_status,
         cr.created_at AS last_run_at,
         cr.message AS last_run_message
       FROM news_sources ns
       LEFT JOIN crawl_runs cr
         ON cr.id = (
           SELECT id FROM crawl_runs
           WHERE source_id = ns.id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         )
       ORDER BY ns.enabled DESC, ns.name ASC`
    )
    .all<NewsSourceRow>();

  return results.map(mapNewsSourceRow);
}

export async function listEnabledSources(db: D1Database): Promise<NewsSourceRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT id, name, type, base_url, feed_url, list_url, enabled, allow_crawl, respect_robots, extractor_key, notes, is_default,
              created_at, updated_at
       FROM news_sources
       WHERE enabled = 1
       ORDER BY name ASC`
    )
    .all<NewsSourceRow>();
  return results.map(mapNewsSourceRow);
}

export async function createSource(
  db: D1Database,
  source: Omit<NewsSourceRecord, "lastRunStatus" | "lastRunAt" | "lastRunMessage" | "createdAt" | "updatedAt">
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO news_sources
        (id, name, type, base_url, feed_url, list_url, enabled, allow_crawl, respect_robots, extractor_key, notes, is_default)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`
    )
    .bind(
      source.id,
      source.name,
      source.type,
      source.baseUrl,
      source.feedUrl,
      source.listUrl,
      source.enabled ? 1 : 0,
      source.allowCrawl ? 1 : 0,
      source.respectRobots ? 1 : 0,
      source.extractorKey,
      source.notes,
      source.isDefault ? 1 : 0
    )
    .run();
}

export async function toggleSource(db: D1Database, sourceId: string): Promise<void> {
  await db
    .prepare(`UPDATE news_sources SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?1`)
    .bind(sourceId)
    .run();
}

export async function deleteSource(db: D1Database, sourceId: string): Promise<void> {
  await db.prepare(`DELETE FROM news_sources WHERE id = ?1 AND is_default = 0`).bind(sourceId).run();
}

export async function logCrawlRun(
  db: D1Database,
  params: { sourceId: string; status: "success" | "error"; message: string; fetchedCount: number }
): Promise<void> {
  await db
    .prepare(`INSERT INTO crawl_runs (source_id, status, message, fetched_count) VALUES (?1, ?2, ?3, ?4)`)
    .bind(params.sourceId, params.status, params.message, params.fetchedCount)
    .run();
}

export async function listRecentCrawlRuns(db: D1Database, limit = 20): Promise<CrawlRunRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT id, source_id, status, message, fetched_count, created_at
       FROM crawl_runs
       ORDER BY created_at DESC, id DESC
       LIMIT ?1`
    )
    .bind(limit)
    .all<CrawlRunRow>();
  return results.map((row) => ({
    id: row.id,
    sourceId: row.source_id,
    status: row.status,
    message: row.message ?? "",
    fetchedCount: row.fetched_count,
    createdAt: row.created_at
  }));
}

export async function upsertMediaItem(db: D1Database, item: MediaItemRecord): Promise<void> {
  await db
    .prepare(
      `INSERT INTO media_items (kind, source_id, source_name, title, url, published_at, report_date, summary_vi, image_url)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
       ON CONFLICT(url) DO UPDATE SET
         title = excluded.title,
         published_at = excluded.published_at,
         report_date = excluded.report_date,
         summary_vi = excluded.summary_vi,
         image_url = excluded.image_url,
         updated_at = datetime('now')`
    )
    .bind(
      item.kind,
      item.sourceId,
      item.sourceName,
      item.title,
      item.url,
      item.publishedAt,
      item.reportDate,
      item.summaryVi,
      item.imageUrl
    )
    .run();
}

export async function getMediaItemsByDate(db: D1Database, reportDate: string, limit = 12): Promise<MediaItemRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT id, kind, source_id, source_name, title, url, published_at, report_date, summary_vi, image_url
       FROM media_items
       WHERE report_date = ?1
       ORDER BY published_at DESC, id DESC
       LIMIT ?2`
    )
    .bind(reportDate, limit)
    .all<MediaItemRow>();

  return results.map((row) => ({
    id: row.id,
    kind: row.kind,
    sourceId: row.source_id,
    sourceName: row.source_name,
    title: row.title,
    url: row.url,
    publishedAt: row.published_at,
    reportDate: row.report_date,
    summaryVi: row.summary_vi ?? "",
    imageUrl: row.image_url
  }));
}

function mapNewsSourceRow(row: NewsSourceRow): NewsSourceRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    baseUrl: row.base_url,
    feedUrl: row.feed_url,
    listUrl: row.list_url,
    enabled: row.enabled === 1,
    allowCrawl: row.allow_crawl === 1,
    respectRobots: row.respect_robots === 1,
    extractorKey: row.extractor_key,
    notes: row.notes,
    isDefault: row.is_default === 1,
    lastRunStatus: row.last_run_status ?? null,
    lastRunAt: row.last_run_at ?? null,
    lastRunMessage: row.last_run_message ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
