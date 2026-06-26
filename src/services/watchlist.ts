import type { Env } from "../types";
import { parsePortfolioSymbols, parseWatchId } from "./portfolio-watchlist";

export {
  parseWatchId,
  parseWatchlistCsv,
  watchlistToCsv
} from "./portfolio-watchlist";

export const WATCH_ID_COOKIE = "sn_watch_id";
export const WATCH_ID_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const WATCH_KV_PREFIX = "watchlist:";

export interface WatchlistRecord {
  symbols: string[];
  name?: string;
  updatedAt: string;
}

export function newWatchId(): string {
  return crypto.randomUUID();
}

function watchKey(id: string): string {
  return `${WATCH_KV_PREFIX}${id}`;
}

export async function loadWatchlist(env: Env, watchId: string): Promise<WatchlistRecord | null> {
  const id = parseWatchId(watchId);
  if (!id) return null;
  const raw = await env.CACHE.get(watchKey(id), "json");
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as WatchlistRecord;
  if (!Array.isArray(rec.symbols)) return null;
  return {
    symbols: parsePortfolioSymbols(rec.symbols.join(",")),
    name: typeof rec.name === "string" ? rec.name.slice(0, 80) : undefined,
    updatedAt: typeof rec.updatedAt === "string" ? rec.updatedAt : new Date().toISOString()
  };
}

export async function saveWatchlist(env: Env, watchId: string, input: { symbols: string[]; name?: string }): Promise<WatchlistRecord> {
  const id = parseWatchId(watchId) ?? watchId;
  const record: WatchlistRecord = {
    symbols: parsePortfolioSymbols(input.symbols.join(",")),
    name: input.name?.trim().slice(0, 80) || undefined,
    updatedAt: new Date().toISOString()
  };
  await env.CACHE.put(watchKey(id), JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 400 });
  return record;
}
