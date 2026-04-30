import type { Env, StoredArticle } from "../types";
import { getFxMarketSnapshot, getGoldMarketSnapshot } from "./market-extra";
import { getHSXMarketSnapshot } from "./hsx-market";
import { explainNewsImpact } from "./summarizer";

const EXPLAIN_CACHE_PREFIX = "news-explain:v1";
const EXPLAIN_REFRESH_STATE_KEY = `${EXPLAIN_CACHE_PREFIX}:refresh-state`;
const EXPLAIN_TTL_SECONDS = 60 * 60 * 12;
const EXPLAIN_MAX_AGE_MS = 30 * 60 * 1000;
const EXPLAIN_PRECOMPUTE_LIMIT = 36;
const EXPLAIN_PRECOMPUTE_CONCURRENCY = 4;

interface CachedExplanation {
  explanation: string;
  generatedAt: string;
  marketSignature: string;
}

interface RefreshState {
  generatedAt: string;
  marketSignature: string;
  reportDate: string;
}

export async function getOrCreateCachedExplanation(
  env: Env,
  article: Pick<StoredArticle, "title" | "sourceName" | "snippet" | "summaryVi" | "url">
): Promise<string> {
  const key = cacheKeyForUrl(article.url);
  const cached = await env.CACHE.get(key, "json");
  if (cached && typeof cached === "object" && typeof (cached as CachedExplanation).explanation === "string") {
    return (cached as CachedExplanation).explanation;
  }
  const explanation = await explainNewsImpact(article, env);
  await env.CACHE.put(
    key,
    JSON.stringify({
      explanation,
      generatedAt: new Date().toISOString(),
      marketSignature: "on-demand"
    } satisfies CachedExplanation),
    { expirationTtl: EXPLAIN_TTL_SECONDS }
  );
  return explanation;
}

export async function precomputeExplainCacheIfNeeded(
  env: Env,
  reportDate: string,
  articles: StoredArticle[]
): Promise<{ refreshed: boolean; reason: string; signature: string }> {
  if (!articles.length) {
    return { refreshed: false, reason: "no-articles", signature: "none" };
  }
  const signature = await buildMarketSignature(env);
  const stateRaw = await env.CACHE.get(EXPLAIN_REFRESH_STATE_KEY, "json");
  const state = isRefreshState(stateRaw) ? stateRaw : null;
  const ageMs = state ? Math.max(0, Date.now() - Date.parse(state.generatedAt)) : Number.POSITIVE_INFINITY;
  const reason =
    !state
      ? "first-build"
      : state.marketSignature !== signature
        ? "market-changed"
        : ageMs > EXPLAIN_MAX_AGE_MS
          ? "expired-30m"
          : "";

  if (!reason) {
    return { refreshed: false, reason: "fresh-cache", signature };
  }

  const targetArticles = articles
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, EXPLAIN_PRECOMPUTE_LIMIT);
  const marketContext = buildMarketContextFromSignature(signature);

  for (let i = 0; i < targetArticles.length; i += EXPLAIN_PRECOMPUTE_CONCURRENCY) {
    const batch = targetArticles.slice(i, i + EXPLAIN_PRECOMPUTE_CONCURRENCY);
    await Promise.all(
      batch.map(async (article) => {
        try {
          const explanation = await explainNewsImpact(article, env, marketContext);
          await env.CACHE.put(
            cacheKeyForUrl(article.url),
            JSON.stringify({
              explanation,
              generatedAt: new Date().toISOString(),
              marketSignature: signature
            } satisfies CachedExplanation),
            { expirationTtl: EXPLAIN_TTL_SECONDS }
          );
        } catch (error) {
          console.error("precompute explain cache failed:", article.url, error);
        }
      })
    );
  }

  await env.CACHE.put(
    EXPLAIN_REFRESH_STATE_KEY,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      marketSignature: signature,
      reportDate
    } satisfies RefreshState),
    { expirationTtl: EXPLAIN_TTL_SECONDS }
  );

  return { refreshed: true, reason, signature };
}

function cacheKeyForUrl(url: string): string {
  return `${EXPLAIN_CACHE_PREFIX}:${hashFNV1a(url)}`;
}

async function buildMarketSignature(env: Env): Promise<string> {
  const [hsx, fx, gold] = await Promise.all([getHSXMarketSnapshot(env), getFxMarketSnapshot(env), getGoldMarketSnapshot(env)]);
  const vnLast = hsx?.vnindex1W?.[hsx.vnindex1W.length - 1]?.closePrice;
  const topVolumeLead = hsx?.topVolume?.[0]?.symbol ?? "";
  const usdLast = fx?.usdVnd1D?.[fx.usdVnd1D.length - 1]?.value;
  const sjcRow = gold?.rows?.find((row) => row.brand.toLowerCase() === "sjc");
  const goldPoint = `${sjcRow?.buy ?? ""}/${sjcRow?.sell ?? ""}`;
  return `vn:${safeNum(vnLast)}|lead:${topVolumeLead}|usd:${safeNum(usdLast)}|gold:${goldPoint}`;
}

function buildMarketContextFromSignature(signature: string): string {
  return `Bối cảnh thị trường gần nhất (dùng để hiệu chỉnh sắc thái ngắn hạn): ${signature}`;
}

function safeNum(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "na";
  return value.toFixed(2);
}

function isRefreshState(input: unknown): input is RefreshState {
  if (!input || typeof input !== "object") return false;
  const row = input as Partial<RefreshState>;
  return typeof row.generatedAt === "string" && typeof row.marketSignature === "string" && typeof row.reportDate === "string";
}

function hashFNV1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}
