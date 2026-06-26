import type { Env } from "../types";
import { parsePortfolioSymbols } from "./portfolio-watchlist";
import { filterArticlesForTelegramSubscriber, normalizeTelegramPrefs } from "./telegram-prefs";

const PUSH_SUB_KEY = "notify:push:subscribers";
const PUSH_PREFS_PREFIX = "notify:push:prefs:";
const MAX_PUSH_SUBS = 2000;

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  subscribedAt: string;
}

export interface PushSubscriberPrefs {
  symbols: string[];
  minImpact: number;
  breakingOnly: boolean;
}

type PushStore = { subs: PushSubscriptionRecord[] };

export function isWebPushConfigured(env: Env): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY?.trim() && env.VAPID_PRIVATE_KEY?.trim());
}

export async function getPushSubscriberCount(env: Env): Promise<number> {
  const subs = await loadPushSubscriptions(env);
  return subs.length;
}

async function loadPushSubscriptions(env: Env): Promise<PushSubscriptionRecord[]> {
  const raw = await env.CACHE.get(PUSH_SUB_KEY, "text");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PushStore;
    return Array.isArray(parsed.subs) ? parsed.subs : [];
  } catch {
    return [];
  }
}

async function savePushSubscriptions(env: Env, subs: PushSubscriptionRecord[]): Promise<void> {
  await env.CACHE.put(PUSH_SUB_KEY, JSON.stringify({ subs: subs.slice(-MAX_PUSH_SUBS) }), {
    expirationTtl: 60 * 60 * 24 * 365
  });
}

export async function addPushSubscription(env: Env, sub: PushSubscriptionRecord): Promise<void> {
  const subs = await loadPushSubscriptions(env);
  const next = subs.filter((s) => s.endpoint !== sub.endpoint);
  next.push(sub);
  await savePushSubscriptions(env, next);
}

export async function removePushSubscription(env: Env, endpoint: string): Promise<void> {
  const subs = (await loadPushSubscriptions(env)).filter((s) => s.endpoint !== endpoint);
  await savePushSubscriptions(env, subs);
}

export async function getPushPrefs(env: Env, endpoint: string): Promise<PushSubscriberPrefs> {
  const raw = await env.CACHE.get(`${PUSH_PREFS_PREFIX}${hashEndpoint(endpoint)}`, "json");
  if (!raw || typeof raw !== "object") {
    return { symbols: [], minImpact: 0, breakingOnly: false };
  }
  const p = raw as PushSubscriberPrefs;
  return {
    symbols: parsePortfolioSymbols((p.symbols ?? []).join(",")),
    minImpact: Math.max(0, Math.min(100, Number(p.minImpact) || 0)),
    breakingOnly: Boolean(p.breakingOnly)
  };
}

export async function setPushPrefs(env: Env, endpoint: string, prefs: Partial<PushSubscriberPrefs>): Promise<void> {
  const cur = await getPushPrefs(env, endpoint);
  const next = {
    symbols: prefs.symbols ? parsePortfolioSymbols(prefs.symbols.join(",")) : cur.symbols,
    minImpact: prefs.minImpact != null ? Math.max(0, Math.min(100, prefs.minImpact)) : cur.minImpact,
    breakingOnly: prefs.breakingOnly != null ? prefs.breakingOnly : cur.breakingOnly
  };
  await env.CACHE.put(`${PUSH_PREFS_PREFIX}${hashEndpoint(endpoint)}`, JSON.stringify(next), {
    expirationTtl: 60 * 60 * 24 * 365
  });
}

function hashEndpoint(endpoint: string): string {
  let h = 0;
  for (let i = 0; i < endpoint.length; i += 1) h = (h * 31 + endpoint.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

/** Best-effort Web Push via subscription endpoint (requires VAPID keys). */
export async function sendWebPush(env: Env, sub: PushSubscriptionRecord, payload: string): Promise<boolean> {
  if (!isWebPushConfigured(env)) return false;
  try {
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        TTL: "120",
        Urgency: "normal"
      },
      body: payload
    });
    return res.ok || res.status === 201;
  } catch {
    return false;
  }
}

export async function notifyPushSubscribersOfArticles(
  env: Env,
  articles: import("./news-cluster").ClusteredArticle[]
): Promise<{ ok: number; fail: number }> {
  if (!isWebPushConfigured(env)) return { ok: 0, fail: 0 };
  const subs = await loadPushSubscriptions(env);
  let ok = 0;
  let fail = 0;
  for (const sub of subs) {
    const prefs = await getPushPrefs(env, sub.endpoint);
    const matched = filterArticlesForTelegramSubscriber(articles, normalizeTelegramPrefs(prefs));
    if (!matched.length) continue;
    const title = matched[0]!.title.slice(0, 120);
    const body = `Có ${matched.length} tin mới phù hợp danh mục của bạn.`;
    const sent = await sendWebPush(env, sub, JSON.stringify({ title, body, url: "/" }));
    if (sent) ok += 1;
    else fail += 1;
  }
  return { ok, fail };
}
