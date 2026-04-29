import type { Env, HSXMarketSnapshot, HSXTopVolumeItem, HSXVNIndexPoint } from "../types";
import { formatDateOnly } from "../utils/date";

const TOP_CACHE_KEY = "hsx:top-volume";
const CHART_CACHE_KEY_PREFIX = "hsx:vnindex";

export async function getHSXMarketSnapshot(env: Env): Promise<HSXMarketSnapshot | null> {
  const [topVolume, vnindex1W, vnindex1M, vnindex1Y] = await Promise.all([
    getTopVolume(env),
    getVNIndexRange(env, "1w"),
    getVNIndexRange(env, "1m"),
    getVNIndexRange(env, "1y")
  ]);
  if (!topVolume.length && !vnindex1W.length && !vnindex1M.length && !vnindex1Y.length) return null;
  return {
    fetchedAt: new Date().toISOString(),
    topVolume,
    vnindex1W,
    vnindex1M,
    vnindex1Y,
    statsUrl: "https://www.hsx.vn/vi/du-lieu-giao-dich/thong-ke/top-trong-ngay",
    chartUrl: "https://www.hsx.vn/vi/du-lieu-giao-dich/bieu-do"
  };
}

async function getTopVolume(env: Env): Promise<HSXTopVolumeItem[]> {
  const cached = await env.CACHE.get(TOP_CACHE_KEY, "json");
  if (Array.isArray(cached)) return cached as HSXTopVolumeItem[];

  try {
    const resp = await fetch("https://api.hsx.vn/mk/api/v1/market/top/main-volume", {
      headers: hsxHeaders()
    });
    if (!resp.ok) throw new Error(`HSX top volume failed: ${resp.status}`);
    const data = (await resp.json()) as {
      success?: boolean;
      data?: Array<{ id?: string; cell?: string[] }>;
    };
    const rows = Array.isArray(data.data)
      ? data.data
          .map((row) => toTopVolumeRow(row))
          .filter((row): row is HSXTopVolumeItem => row !== null)
      : [];
    await env.CACHE.put(TOP_CACHE_KEY, JSON.stringify(rows), { expirationTtl: 60 * 10 });
    return rows;
  } catch (error) {
    console.error("HSX top volume fetch failed:", error);
    return [];
  }
}

async function getVNIndexRange(env: Env, range: "1w" | "1m" | "1y"): Promise<HSXVNIndexPoint[]> {
  const cached = await env.CACHE.get(`${CHART_CACHE_KEY_PREFIX}:${range}`, "json");
  if (Array.isArray(cached)) return cached as HSXVNIndexPoint[];

  try {
    const today = new Date();
    const from = new Date(today);
    if (range === "1w") from.setUTCDate(from.getUTCDate() - 7);
    else if (range === "1m") from.setUTCMonth(from.getUTCMonth() - 1);
    else from.setUTCFullYear(from.getUTCFullYear() - 1);
    const qs = new URLSearchParams({
      fromDate: formatDateOnly(from),
      toDate: formatDateOnly(today),
      symbolString: "VNINDEX|"
    });
    const resp = await fetch(`https://api.hsx.vn/mk/api/v1/market/basic-chart?${qs.toString()}`, {
      headers: hsxHeaders()
    });
    if (!resp.ok) throw new Error(`HSX VNINDEX ${range} failed: ${resp.status}`);
    const body = (await resp.json()) as {
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
      ? body.data[0]!.chartPoints!
          .map((p) => toChartPoint(p))
          .filter((p): p is HSXVNIndexPoint => p !== null)
      : [];
    await env.CACHE.put(`${CHART_CACHE_KEY_PREFIX}:${range}`, JSON.stringify(points), {
      expirationTtl: range === "1w" ? 60 * 15 : range === "1m" ? 60 * 30 : 60 * 60 * 4
    });
    return points;
  } catch (error) {
    console.error(`HSX VNINDEX ${range} fetch failed:`, error);
    return [];
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
