import type { Env, HSXMarketSnapshot, HSXTopVolumeItem, HSXVNIndexPoint } from "../types";
import { formatDateOnly } from "../utils/date";
import { isRetryableUpstreamStatus, withRetry } from "../utils/resilience";

const TOP_CACHE_KEY = "hsx:top-volume";
const CHART_CACHE_KEY_PREFIX = "hsx:vnindex";
const STOCK_CHART_CACHE_KEY_PREFIX = "hsx:stock-chart";
const LAST_GOOD_SNAPSHOT_KEY = "hsx:snapshot:last-good";
const LAST_GOOD_TTL_SECONDS = 60 * 60 * 24 * 7;

/** Per-request timeout for HSX chart, top-volume, and snapshot fetches. */
export const HSX_REQUEST_TIMEOUT_MS = 12_000;

export type HSXSnapshotRange = "1w" | "1m" | "1y";

const STATS_URL = "https://www.hsx.vn/vi/du-lieu-giao-dich/thong-ke/top-trong-ngay";
const CHART_URL = "https://www.hsx.vn/vi/du-lieu-giao-dich/bieu-do";

interface SeriesLoad<T> {
  rows: T[];
  /** Live upstream response or its short-lived cache. Last-good fallback is not fresh. */
  fresh: boolean;
  fetchedAt: string | null;
}

export async function getVNIndexChartPoints(env: Env, range: HSXSnapshotRange): Promise<HSXVNIndexPoint[]> {
  const loaded = await getVNIndexRange(env, range);
  return loaded.rows;
}

export async function getHSXMarketSnapshot(
  env: Env,
  options?: { ranges?: HSXSnapshotRange[] }
): Promise<HSXMarketSnapshot | null> {
  try {
    return await loadHSXMarketSnapshot(env, options);
  } catch (error) {
    console.error("getHSXMarketSnapshot failed:", error);
    return readLastGoodSnapshot(env);
  }
}

async function loadHSXMarketSnapshot(
  env: Env,
  options?: { ranges?: HSXSnapshotRange[] }
): Promise<HSXMarketSnapshot | null> {
  const ranges = options?.ranges ?? (["1w", "1m", "1y"] as HSXSnapshotRange[]);
  const want = new Set(ranges);
  const [topResult, weekResult, monthResult, yearResult] = await Promise.allSettled([
    getTopVolume(env),
    want.has("1w") ? getVNIndexRange(env, "1w") : Promise.resolve(emptySeries<HSXVNIndexPoint>()),
    want.has("1m") ? getVNIndexRange(env, "1m") : Promise.resolve(emptySeries<HSXVNIndexPoint>()),
    want.has("1y") ? getVNIndexRange(env, "1y") : Promise.resolve(emptySeries<HSXVNIndexPoint>())
  ]);

  let lastGood: HSXMarketSnapshot | null | undefined;
  const previous = async (): Promise<HSXMarketSnapshot | null> => {
    if (lastGood === undefined) lastGood = await readLastGoodSnapshot(env);
    return lastGood;
  };

  const top = await takeSeries(true, topResult, previous, (snap) => snap.topVolume);
  const vnindex1W = await takeSeries(want.has("1w"), weekResult, previous, (snap) => snap.vnindex1W);
  const vnindex1M = await takeSeries(want.has("1m"), monthResult, previous, (snap) => snap.vnindex1M);
  const vnindex1Y = await takeSeries(want.has("1y"), yearResult, previous, (snap) => snap.vnindex1Y);
  const included = [top, vnindex1W, vnindex1M, vnindex1Y].filter((part) => part.rows.length > 0);

  if (!included.length) {
    const prev = await previous();
    if (!prev) return null;
    return {
      ...prev,
      vnindex1W: want.has("1w") ? prev.vnindex1W : [],
      vnindex1M: want.has("1m") ? prev.vnindex1M : [],
      vnindex1Y: want.has("1y") ? prev.vnindex1Y : []
    };
  }

  const stale = included.filter((part) => !part.fresh);
  const prev = await previous();
  const fetchedAt = stale.length
    ? oldestStamp(stale.map((part) => part.fetchedAt)) ?? prev?.fetchedAt ?? new Date(0).toISOString()
    : new Date().toISOString();

  const snapshot: HSXMarketSnapshot = {
    fetchedAt,
    topVolume: top.rows,
    vnindex1W: vnindex1W.rows,
    vnindex1M: vnindex1M.rows,
    vnindex1Y: vnindex1Y.rows,
    statsUrl: STATS_URL,
    chartUrl: CHART_URL
  };

  const stored: HSXMarketSnapshot = {
    ...snapshot,
    topVolume: snapshot.topVolume.length ? snapshot.topVolume : (prev?.topVolume ?? []),
    vnindex1W: want.has("1w") ? snapshot.vnindex1W : (prev?.vnindex1W ?? []),
    vnindex1M: want.has("1m") ? snapshot.vnindex1M : (prev?.vnindex1M ?? []),
    vnindex1Y: want.has("1y") ? snapshot.vnindex1Y : (prev?.vnindex1Y ?? [])
  };
  if (stored.topVolume.length || stored.vnindex1W.length || stored.vnindex1M.length || stored.vnindex1Y.length) {
    await writeJson(env, LAST_GOOD_SNAPSHOT_KEY, stored, LAST_GOOD_TTL_SECONDS);
  }
  return snapshot;
}

function emptySeries<T>(): SeriesLoad<T> {
  return { rows: [], fresh: true, fetchedAt: null };
}

function oldestStamp(stamps: Array<string | null>): string | null {
  const known = stamps.filter((stamp): stamp is string => Boolean(stamp)).sort();
  return known[0] ?? null;
}

async function takeSeries<T>(
  wanted: boolean,
  result: PromiseSettledResult<SeriesLoad<T>>,
  previous: () => Promise<HSXMarketSnapshot | null>,
  pick: (snapshot: HSXMarketSnapshot) => T[]
): Promise<SeriesLoad<T>> {
  if (!wanted) return emptySeries();
  if (result.status === "rejected") {
    console.error("HSX snapshot part failed:", result.reason);
  }
  const part = result.status === "fulfilled" ? result.value : emptySeries<T>();
  if (part.rows.length > 0) return part;
  const prev = await previous();
  const fallback = prev ? pick(prev) : [];
  if (fallback.length > 0) {
    return { rows: fallback, fresh: false, fetchedAt: prev?.fetchedAt ?? null };
  }
  return { rows: [], fresh: false, fetchedAt: null };
}

async function getTopVolume(env: Env): Promise<SeriesLoad<HSXTopVolumeItem>> {
  const cached = await readSeries<HSXTopVolumeItem>(env, TOP_CACHE_KEY);
  if (cached) return { rows: cached.rows, fresh: true, fetchedAt: cached.fetchedAt };

  try {
    const data = (await fetchHsxJson("https://api.hsx.vn/mk/api/v1/market/top/main-volume")) as {
      success?: boolean;
      data?: Array<{ id?: string; cell?: string[] }>;
    };
    const rows = Array.isArray(data.data)
      ? data.data.map((row) => toTopVolumeRow(row)).filter((row): row is HSXTopVolumeItem => row !== null)
      : [];
    const fetchedAt = new Date().toISOString();
    await writeJson(env, TOP_CACHE_KEY, rows, 60 * 10);
    if (rows.length) await writeJson(env, lastGoodKey(TOP_CACHE_KEY), { fetchedAt, rows }, LAST_GOOD_TTL_SECONDS);
    return { rows, fresh: true, fetchedAt };
  } catch (error) {
    const lastGood = await readSeries<HSXTopVolumeItem>(env, lastGoodKey(TOP_CACHE_KEY));
    if (lastGood?.rows.length) {
      console.warn("HSX top volume fetch failed; serving last good snapshot:", error);
      return { rows: lastGood.rows, fresh: false, fetchedAt: lastGood.fetchedAt };
    }
    console.error("HSX top volume fetch failed:", error);
    return { rows: [], fresh: false, fetchedAt: null };
  }
}

async function getVNIndexRange(env: Env, range: HSXSnapshotRange): Promise<SeriesLoad<HSXVNIndexPoint>> {
  return getChartRange(env, "VNINDEX", range, CHART_CACHE_KEY_PREFIX);
}

export async function getStockChartRange(
  env: Env,
  symbolRaw: string,
  range: HSXSnapshotRange
): Promise<HSXVNIndexPoint[]> {
  const symbol = symbolRaw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  if (!symbol) return [];
  const loaded = await getChartRange(env, symbol, range, `${STOCK_CHART_CACHE_KEY_PREFIX}:${symbol}`);
  return loaded.rows;
}

async function getChartRange(
  env: Env,
  symbol: string,
  range: HSXSnapshotRange,
  cacheKeyPrefix: string
): Promise<SeriesLoad<HSXVNIndexPoint>> {
  const cacheKey = `${cacheKeyPrefix}:${range}`;
  const cached = await readSeries<HSXVNIndexPoint>(env, cacheKey);
  if (cached) return { rows: cached.rows, fresh: true, fetchedAt: cached.fetchedAt };

  try {
    const today = new Date();
    const from = new Date(today);
    if (range === "1w") from.setUTCDate(from.getUTCDate() - 7);
    else if (range === "1m") from.setUTCMonth(from.getUTCMonth() - 1);
    else from.setUTCFullYear(from.getUTCFullYear() - 1);
    const qs = new URLSearchParams({
      fromDate: formatDateOnly(from),
      toDate: formatDateOnly(today),
      symbolString: `${symbol}|`
    });
    const body = (await fetchHsxJson(`https://api.hsx.vn/mk/api/v1/market/basic-chart?${qs.toString()}`)) as {
      success?: boolean;
      data?: Array<{
        chartPoints?: Array<{
          stockSymbol?: string;
          time?: number;
          openPrice?: number;
          closePrice?: number;
          highPrice?: number;
          lowPrice?: number;
          totalShare?: number;
        }>;
      }>;
    };
    const points = Array.isArray(body.data?.[0]?.chartPoints)
      ? body.data[0]!.chartPoints!.map((p) => toChartPoint(p)).filter((p): p is HSXVNIndexPoint => p !== null)
      : [];
    const fetchedAt = new Date().toISOString();
    await writeJson(env, cacheKey, points, range === "1w" ? 60 * 15 : range === "1m" ? 60 * 30 : 60 * 60 * 4);
    if (points.length) await writeJson(env, lastGoodKey(cacheKey), { fetchedAt, rows: points }, LAST_GOOD_TTL_SECONDS);
    return { rows: points, fresh: true, fetchedAt };
  } catch (error) {
    const lastGood = await readSeries<HSXVNIndexPoint>(env, lastGoodKey(cacheKey));
    if (lastGood?.rows.length) {
      console.warn(`HSX ${symbol} ${range} fetch failed; serving last good snapshot:`, error);
      return { rows: lastGood.rows, fresh: false, fetchedAt: lastGood.fetchedAt };
    }
    console.error(`HSX ${symbol} ${range} fetch failed:`, error);
    return { rows: [], fresh: false, fetchedAt: null };
  }
}

async function fetchHsxJson(url: string): Promise<unknown> {
  const resp = await withRetry(() => fetchHsx(url));
  return resp.json();
}

async function fetchHsx(url: string): Promise<Response> {
  const resp = await fetch(url, {
    headers: hsxHeaders(),
    signal: AbortSignal.timeout(HSX_REQUEST_TIMEOUT_MS)
  });
  if (!resp.ok) {
    await resp.body?.cancel().catch(() => undefined);
    const error = new Error(`HSX upstream ${resp.status}`) as Error & { retryable?: boolean };
    if (!isRetryableUpstreamStatus(resp.status)) error.retryable = false;
    throw error;
  }
  return resp;
}

function lastGoodKey(cacheKey: string): string {
  return `${cacheKey}:last-good`;
}

async function readLastGoodSnapshot(env: Env): Promise<HSXMarketSnapshot | null> {
  try {
    const raw = await env.CACHE.get(LAST_GOOD_SNAPSHOT_KEY, "json");
    if (!raw || typeof raw !== "object") return null;
    const snap = raw as Partial<HSXMarketSnapshot>;
    if (!Array.isArray(snap.topVolume) || !Array.isArray(snap.vnindex1W)) return null;
    return {
      fetchedAt: typeof snap.fetchedAt === "string" ? snap.fetchedAt : new Date(0).toISOString(),
      topVolume: snap.topVolume as HSXTopVolumeItem[],
      vnindex1W: Array.isArray(snap.vnindex1W) ? (snap.vnindex1W as HSXVNIndexPoint[]) : [],
      vnindex1M: Array.isArray(snap.vnindex1M) ? (snap.vnindex1M as HSXVNIndexPoint[]) : [],
      vnindex1Y: Array.isArray(snap.vnindex1Y) ? (snap.vnindex1Y as HSXVNIndexPoint[]) : [],
      statsUrl: snap.statsUrl || STATS_URL,
      chartUrl: snap.chartUrl || CHART_URL
    };
  } catch (error) {
    console.error("HSX last good snapshot read failed:", error);
    return null;
  }
}

async function readSeries<T>(env: Env, key: string): Promise<{ rows: T[]; fetchedAt: string | null } | null> {
  try {
    const cached = await env.CACHE.get(key, "json");
    if (Array.isArray(cached)) return { rows: cached as T[], fetchedAt: null };
    if (cached && typeof cached === "object" && Array.isArray((cached as { rows?: unknown }).rows)) {
      const body = cached as { rows: T[]; fetchedAt?: unknown };
      return { rows: body.rows, fetchedAt: typeof body.fetchedAt === "string" ? body.fetchedAt : null };
    }
  } catch (error) {
    console.error(`HSX cache read failed for ${key}:`, error);
  }
  return null;
}

async function writeJson(env: Env, key: string, value: unknown, expirationTtl: number): Promise<void> {
  try {
    await env.CACHE.put(key, JSON.stringify(value), { expirationTtl });
  } catch (error) {
    console.error(`HSX cache write failed for ${key}:`, error);
  }
}

function toTopVolumeRow(row: { id?: string; cell?: string[] }): HSXTopVolumeItem | null {
  const cell = row.cell ?? [];
  if (!row.id || cell.length < 5) return null;
  return {
    symbol: row.id,
    price: cell[1] ?? "--",
    volume: cell[2] ?? "--",
    ratioPct: cell[3] ?? "--",
    lot: cell[4] ?? "--"
  };
}

function toChartPoint(p: {
  stockSymbol?: string;
  time?: number;
  openPrice?: number;
  closePrice?: number;
  highPrice?: number;
  lowPrice?: number;
  totalShare?: number;
}): HSXVNIndexPoint | null {
  if (!p.stockSymbol || typeof p.time !== "number") return null;
  return {
    symbol: p.stockSymbol,
    time: p.time,
    openPrice: Number(p.openPrice ?? 0),
    closePrice: Number(p.closePrice ?? 0),
    highPrice: Number(p.highPrice ?? 0),
    lowPrice: Number(p.lowPrice ?? 0),
    volume: Number(p.totalShare ?? 0)
  };
}

function hsxHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    type: "HJ2HNS3SKICV4FNE",
    "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)"
  };
}
