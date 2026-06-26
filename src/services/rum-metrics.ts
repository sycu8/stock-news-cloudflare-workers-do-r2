import type { Env } from "../types";

const RUM_KV_PREFIX = "rum:agg:";
const RUM_MAX_SAMPLES = 500;

export interface RumAggregate {
  metric: string;
  path: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  lastAt: string;
}

export interface RumPayload {
  metric?: string;
  path?: string;
  value?: number;
  at?: string;
}

export function parseRumPayload(body: unknown): RumPayload | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const metric = typeof o.metric === "string" ? o.metric.trim().slice(0, 32) : "";
  const path = typeof o.path === "string" ? o.path.trim().slice(0, 180) : "/";
  const value = Number(o.value);
  if (!metric || !Number.isFinite(value)) return null;
  return { metric, path, value, at: typeof o.at === "string" ? o.at : new Date().toISOString() };
}

function aggKey(metric: string, path: string): string {
  return `${RUM_KV_PREFIX}${metric}::${path}`;
}

export async function recordRumSample(env: Env, sample: RumPayload): Promise<void> {
  const metric = sample.metric!;
  const path = sample.path ?? "/";
  const value = sample.value!;
  const key = aggKey(metric, path);
  const raw = await env.CACHE.get(key, "json");
  const prev = (raw && typeof raw === "object" ? raw : null) as RumAggregate | null;
  const next: RumAggregate = prev
    ? {
        metric,
        path,
        count: Math.min(RUM_MAX_SAMPLES, prev.count + 1),
        sum: prev.sum + value,
        min: Math.min(prev.min, value),
        max: Math.max(prev.max, value),
        lastAt: sample.at ?? new Date().toISOString()
      }
    : {
        metric,
        path,
        count: 1,
        sum: value,
        min: value,
        max: value,
        lastAt: sample.at ?? new Date().toISOString()
      };
  await env.CACHE.put(key, JSON.stringify(next), { expirationTtl: 60 * 60 * 24 * 14 });
}

export async function listRumAggregates(env: Env, limit = 24): Promise<RumAggregate[]> {
  const listed = await env.CACHE.list({ prefix: RUM_KV_PREFIX, limit: 200 });
  const out: RumAggregate[] = [];
  for (const k of listed.keys) {
    const raw = await env.CACHE.get(k.name, "json");
    if (raw && typeof raw === "object") out.push(raw as RumAggregate);
  }
  return out
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    .slice(0, limit)
    .map((r) => ({
      ...r,
      sum: Math.round(r.sum * 100) / 100,
      min: Math.round(r.min * 100) / 100,
      max: Math.round(r.max * 100) / 100
    }));
}

export function rumAverage(agg: RumAggregate): number {
  return agg.count ? Math.round((agg.sum / agg.count) * 100) / 100 : 0;
}
