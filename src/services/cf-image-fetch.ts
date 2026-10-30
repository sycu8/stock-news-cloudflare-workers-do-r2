/**
 * Remote image proxy for `/img`.
 *
 * Cloudflare Images transformations are no longer used (the free monthly quota
 * kept returning 9422). Every request is served from the original upstream bytes;
 * the `/img` route still caches the response at the edge.
 *
 * `width`, `quality` and `accept` are accepted for call-site compatibility and
 * the edge cache key, but they no longer change the bytes that are returned.
 */

import type { Env } from "../types";

export type FetchImageOpts = {
  width?: number;
  quality?: number;
  /** Client `Accept` header (kept for the cache key / compatibility). */
  accept?: string;
};

const PLAIN_IMAGE_HEADERS = {
  "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
  Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8"
};

export async function fetchOptimizedRemoteImage(
  upstreamUrl: string,
  _opts: FetchImageOpts,
  _env: Env
): Promise<Response> {
  return fetch(upstreamUrl, {
    headers: PLAIN_IMAGE_HEADERS,
    redirect: "follow"
  });
}
