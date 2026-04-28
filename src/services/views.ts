import type { Env } from "../types";

export type ViewsMap = Record<string, number>;

export function viewsKeyForDate(reportDate: string): string {
  return `views:${reportDate}`;
}

export async function getViewsMap(env: Env, reportDate: string): Promise<ViewsMap> {
  const key = viewsKeyForDate(reportDate);
  const val = await env.CACHE.get(key, "json");
  if (val && typeof val === "object") {
    return val as ViewsMap;
  }
  return {};
}

export async function incrementView(env: Env, reportDate: string, url: string): Promise<number> {
  const key = viewsKeyForDate(reportDate);
  const map = await getViewsMap(env, reportDate);
  const next = (map[url] ?? 0) + 1;
  map[url] = next;
  await env.CACHE.put(key, JSON.stringify(map), { expirationTtl: 60 * 60 * 24 * 7 });
  return next;
}

