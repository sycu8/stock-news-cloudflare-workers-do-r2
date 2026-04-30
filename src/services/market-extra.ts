import type { Env, FxMarketSnapshot, FxRatePoint, GoldMarketSnapshot, GoldPriceRow } from "../types";

const FX_CACHE_KEY = "market:fx:v2";
const GOLD_CACHE_KEY = "market:gold:v3";

type FxRange = "1d" | "1w" | "1m" | "1y";

export async function getFxMarketSnapshot(env: Env): Promise<FxMarketSnapshot | null> {
  const cached = await env.CACHE.get(FX_CACHE_KEY, "json");
  if (cached && typeof cached === "object") {
    return normalizeFxSnapshot(cached as Partial<FxMarketSnapshot>);
  }

  try {
    const [
      usdVnd1D,
      usdVnd1W,
      usdVnd1M,
      usdVnd1Y,
      sgdVnd1D,
      sgdVnd1W,
      sgdVnd1M,
      sgdVnd1Y,
      jpyVnd1D,
      jpyVnd1W,
      jpyVnd1M,
      jpyVnd1Y,
      cnyVnd1D,
      cnyVnd1W,
      cnyVnd1M,
      cnyVnd1Y
    ] = await Promise.all([
      fetchFxRange("usd_vnd", "1d"),
      fetchFxRange("usd_vnd", "1w"),
      fetchFxRange("usd_vnd", "1m"),
      fetchFxRange("usd_vnd", "1y"),
      fetchFxRange("sgd_vnd", "1d"),
      fetchFxRange("sgd_vnd", "1w"),
      fetchFxRange("sgd_vnd", "1m"),
      fetchFxRange("sgd_vnd", "1y"),
      fetchFxRange("jpy_vnd", "1d"),
      fetchFxRange("jpy_vnd", "1w"),
      fetchFxRange("jpy_vnd", "1m"),
      fetchFxRange("jpy_vnd", "1y"),
      fetchFxRange("cny_vnd", "1d"),
      fetchFxRange("cny_vnd", "1w"),
      fetchFxRange("cny_vnd", "1m"),
      fetchFxRange("cny_vnd", "1y")
    ]);

    const snapshot: FxMarketSnapshot = {
      fetchedAt: new Date().toISOString(),
      sourceUrl: "https://github.com/fawazahmed0/exchange-api",
      usdVnd1D,
      usdVnd1W,
      usdVnd1M,
      usdVnd1Y,
      sgdVnd1D,
      sgdVnd1W,
      sgdVnd1M,
      sgdVnd1Y,
      jpyVnd1D,
      jpyVnd1W,
      jpyVnd1M,
      jpyVnd1Y,
      cnyVnd1D,
      cnyVnd1W,
      cnyVnd1M,
      cnyVnd1Y
    };
    await env.CACHE.put(FX_CACHE_KEY, JSON.stringify(snapshot), { expirationTtl: 60 * 30 });
    return snapshot;
  } catch (error) {
    console.error("getFxMarketSnapshot failed:", error);
    return null;
  }
}

function normalizeFxSnapshot(raw: Partial<FxMarketSnapshot>): FxMarketSnapshot {
  const safe = (v: unknown): FxRatePoint[] => (Array.isArray(v) ? (v as FxRatePoint[]) : []);
  return {
    fetchedAt: raw.fetchedAt ?? new Date().toISOString(),
    sourceUrl: raw.sourceUrl ?? "https://github.com/fawazahmed0/exchange-api",
    usdVnd1D: safe(raw.usdVnd1D),
    usdVnd1W: safe(raw.usdVnd1W),
    usdVnd1M: safe(raw.usdVnd1M),
    usdVnd1Y: safe(raw.usdVnd1Y),
    sgdVnd1D: safe(raw.sgdVnd1D),
    sgdVnd1W: safe(raw.sgdVnd1W),
    sgdVnd1M: safe(raw.sgdVnd1M),
    sgdVnd1Y: safe(raw.sgdVnd1Y),
    jpyVnd1D: safe(raw.jpyVnd1D),
    jpyVnd1W: safe(raw.jpyVnd1W),
    jpyVnd1M: safe(raw.jpyVnd1M),
    jpyVnd1Y: safe(raw.jpyVnd1Y),
    cnyVnd1D: safe(raw.cnyVnd1D),
    cnyVnd1W: safe(raw.cnyVnd1W),
    cnyVnd1M: safe(raw.cnyVnd1M),
    cnyVnd1Y: safe(raw.cnyVnd1Y)
  };
}

export async function getGoldMarketSnapshot(env: Env): Promise<GoldMarketSnapshot | null> {
  const cached = await env.CACHE.get(GOLD_CACHE_KEY, "json");
  if (cached && typeof cached === "object") {
    return normalizeGoldSnapshot(cached as Partial<GoldMarketSnapshot>);
  }

  try {
    const sourceUrl = "https://www.24h.com.vn/gia-vang-hom-nay-c425.html";
    const res = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; vn-market-worker/1.0)"
      }
    });
    if (!res.ok) throw new Error(`gold page failed: ${res.status}`);
    const html = await res.text();

    const rows = extractGoldRowsFromHtml(html);

    const updatedAtLabel = (() => {
      const m = html.match(/Cập nhật lúc\s*([0-9]{1,2}:[0-9]{2}[^<\n]*)/i);
      return m?.[1]?.trim() ?? null;
    })();

    const snapshot: GoldMarketSnapshot = {
      fetchedAt: new Date().toISOString(),
      sourceUrl,
      sourceLabel: "24h - Giá vàng hôm nay",
      updatedAtLabel,
      rows
    };
    await env.CACHE.put(GOLD_CACHE_KEY, JSON.stringify(snapshot), { expirationTtl: 60 * 10 });
    return snapshot;
  } catch (error) {
    console.error("getGoldMarketSnapshot failed:", error);
    return null;
  }
}

function normalizeGoldSnapshot(raw: Partial<GoldMarketSnapshot>): GoldMarketSnapshot {
  const wanted = new Set(["SJC", "DOJI HN", "DOJI HCM", "PNJ TP.HCM", "PNJ HÀ NỘI"]);
  const rows = Array.isArray(raw.rows)
    ? raw.rows.filter((row): row is GoldPriceRow => Boolean(row && wanted.has(String(row.brand ?? "").toUpperCase())))
    : [];
  return {
    fetchedAt: raw.fetchedAt ?? new Date().toISOString(),
    sourceUrl: raw.sourceUrl ?? "https://www.24h.com.vn/gia-vang-hom-nay-c425.html",
    sourceLabel: raw.sourceLabel ?? "24h - Giá vàng hôm nay",
    updatedAtLabel: raw.updatedAtLabel ?? null,
    rows
  };
}

async function fetchFxRange(pair: "usd_vnd" | "sgd_vnd" | "jpy_vnd" | "cny_vnd", range: FxRange): Promise<FxRatePoint[]> {
  const dates = buildDates(range);
  const results = (await Promise.all(dates.map((date) => fetchFxPoint(date, pair)))).filter(
    (pt): pt is FxRatePoint => Boolean(pt)
  );
  return results.sort((a, b) => a.date.localeCompare(b.date));
}

function buildDates(range: FxRange): string[] {
  const now = new Date();
  const out: string[] = [];
  const push = (d: Date) => out.push(formatDate(d));
  if (range === "1d") {
    for (let i = 1; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      push(d);
    }
  } else if (range === "1w") {
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      push(d);
    }
  } else if (range === "1m") {
    for (let i = 28; i >= 0; i -= 2) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      push(d);
    }
  } else {
    for (let i = 52; i >= 0; i -= 2) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i * 7);
      push(d);
    }
  }
  return Array.from(new Set(out));
}

async function fetchFxPoint(date: string, pair: "usd_vnd" | "sgd_vnd" | "jpy_vnd" | "cny_vnd"): Promise<FxRatePoint | null> {
  try {
    // Per exchange-api docs: prefer jsDelivr package URL and keep a fallback on currency-api.pages.dev.
    const body = await fetchFxBodyWithFallback(date);
    if (!body) return null;
    const usd = body.usd ?? {};
    const usdVnd = Number(usd.vnd ?? 0);
    const usdSgd = Number(usd.sgd ?? 0);
    const usdJpy = Number(usd.jpy ?? 0);
    const usdCny = Number(usd.cny ?? 0);
    if (!Number.isFinite(usdVnd) || usdVnd <= 0) return null;
    let value = usdVnd;
    if (pair === "sgd_vnd") {
      if (!Number.isFinite(usdSgd) || usdSgd <= 0) return null;
      value = usdVnd / usdSgd;
    } else if (pair === "jpy_vnd") {
      if (!Number.isFinite(usdJpy) || usdJpy <= 0) return null;
      value = usdVnd / usdJpy;
    } else if (pair === "cny_vnd") {
      if (!Number.isFinite(usdCny) || usdCny <= 0) return null;
      value = usdVnd / usdCny;
    }
    return { date: body.date ?? date, value };
  } catch {
    return null;
  }
}

async function fetchFxBodyWithFallback(date: string): Promise<{ date?: string; usd?: Record<string, number> } | null> {
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.json`,
    `https://${date}.currency-api.pages.dev/v1/currencies/usd.json`
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      return (await res.json()) as { date?: string; usd?: Record<string, number> };
    } catch {
      // continue to fallback
    }
  }
  return null;
}

function extractGoldRowsFromHtml(html: string): GoldPriceRow[] {
  const parsed = new Map<
    string,
    { buy: string; sell: string; yesterdayBuy: string | null; yesterdaySell: string | null; label: string }
  >();
  const rowRe =
    /<tr[^>]*data-seach="([^"]+)"[\s\S]*?<h2>([^<]+)<\/h2>[\s\S]*?<span class="fixW">([0-9.,]+)<\/span>[\s\S]*?<span class="fixW">([0-9.,]+)<\/span>[\s\S]*?<td[^>]*class="colorBlur">([0-9.,]+)<\/td>[\s\S]*?<td[^>]*class="colorBlur">([0-9.,]+)<\/td>[\s\S]*?<\/tr>/gi;
  for (const m of html.matchAll(rowRe)) {
    const key = String(m[1] ?? "").toLowerCase().trim();
    if (!key) continue;
    parsed.set(key, {
      label: String(m[2] ?? "").trim(),
      buy: normalizePrice(m[3] ?? ""),
      sell: normalizePrice(m[4] ?? ""),
      yesterdayBuy: normalizePrice(m[5] ?? ""),
      yesterdaySell: normalizePrice(m[6] ?? "")
    });
  }
  const targets: Array<{ brand: string; keys: string[] }> = [
    { brand: "SJC", keys: ["sjc"] },
    { brand: "DOJI HN", keys: ["doji_hn"] },
    { brand: "DOJI HCM", keys: ["doji_sg", "doji_hcm"] },
    { brand: "PNJ TP.HCM", keys: ["pnj_tp_hcml", "pnj_tp_hcm"] },
    { brand: "PNJ Hà Nội", keys: ["pnj_hn"] }
  ];
  const rows: GoldPriceRow[] = [];
  for (const t of targets) {
    let found:
      | { buy: string; sell: string; yesterdayBuy: string | null; yesterdaySell: string | null; label: string }
      | undefined;
    for (const key of t.keys) {
      found = parsed.get(key);
      if (found) break;
    }
    if (!found) continue;
    rows.push({
      brand: t.brand,
      buy: found.buy,
      sell: found.sell,
      yesterdayBuy: found.yesterdayBuy,
      yesterdaySell: found.yesterdaySell
    });
  }
  return rows;
}

function extractGoldRowByBrand(
  html: string,
  brand: string
): { buy: string; sell: string; yesterdayBuy: string | null; yesterdaySell: string | null } | null {
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}[\\s\\S]{0,420}`, "i");
  const m = html.match(re);
  if (!m) return null;
  const chunk = m[0] ?? "";
  const nums = Array.from(chunk.matchAll(/([0-9]{2,3}[\\.,][0-9]{3})/g)).map((x) => normalizePrice(x[1] ?? ""));
  if (nums.length < 2) return null;
  return {
    buy: nums[0] ?? "",
    sell: nums[1] ?? "",
    yesterdayBuy: nums[2] ?? null,
    yesterdaySell: nums[3] ?? null
  };
}

function normalizePrice(input: string): string {
  return input.replace(/\./g, ",").trim();
}

function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
