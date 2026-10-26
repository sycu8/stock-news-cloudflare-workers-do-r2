import type { Env } from "../types";
import { r2ObjectExists } from "../utils/resilience";
import { sha256Hex } from "../utils/sha256";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const PLAIN_IMAGE_HEADERS = {
  "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
  Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8"
};

type RemoteImage = { bytes: ArrayBuffer; contentType: string };
type Namespace = "article-thumb" | "media-thumb";

/**
 * Mirror a remote image into R2 and return its `/assets/...` path.
 *
 * Cloudflare Images transformations are no longer used: the original bytes are
 * stored under `original/<namespace>/<hash>`. WebP files written earlier under
 * `optimized/<namespace>/<hash>.webp` are still reused when present.
 *
 * Existence checks use `r2ObjectExists` (a 1-item list) instead of `head`, so a
 * normal cache miss is not recorded as an `r2_head` error span.
 */
export async function ensureOptimizedImageAsset(params: {
  env: Env;
  sourceUrl: string;
  namespace: Namespace;
}): Promise<string | null> {
  const { env, sourceUrl, namespace } = params;
  if (!env.ASSETS) return null;
  if (!/^https?:\/\//i.test(sourceUrl)) return sourceUrl;

  const hash = await sha256Hex(sourceUrl);
  const optimizedKey = `optimized/${namespace}/${hash}.webp`;
  const originalKey = `original/${namespace}/${hash}`;

  try {
    if (await r2ObjectExists(env.ASSETS, optimizedKey)) return `/assets/${optimizedKey}`;
    if (await r2ObjectExists(env.ASSETS, originalKey)) return `/assets/${originalKey}`;

    const plain = await fetchPlainImage(sourceUrl);
    if (!plain) return sourceUrl;
    return (await storeOriginal(env, originalKey, plain, sourceUrl, namespace)) ?? sourceUrl;
  } catch (error) {
    console.warn("Image cache failed; using the source URL:", error);
    return sourceUrl;
  }
}

async function storeOriginal(
  env: Env,
  key: string,
  image: RemoteImage,
  sourceUrl: string,
  namespace: Namespace
): Promise<string | null> {
  await env.ASSETS!.put(key, image.bytes, {
    httpMetadata: { contentType: image.contentType, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: {
      kind: "original_remote_image",
      sourceUrl: sourceUrl.slice(0, 512),
      namespace
    }
  });
  return `/assets/${key}`;
}

async function fetchPlainImage(sourceUrl: string): Promise<RemoteImage | null> {
  const plain = await fetch(sourceUrl, {
    headers: PLAIN_IMAGE_HEADERS,
    redirect: "follow"
  });
  if (!plain.ok) {
    await discardResponseBody(plain);
    return null;
  }
  const contentType = imageContentType(plain.headers.get("content-type"));
  if (!contentType) {
    await discardResponseBody(plain);
    return null;
  }
  const length = plain.headers.get("content-length");
  if (length && Number.parseInt(length, 10) > MAX_IMAGE_BYTES) {
    await discardResponseBody(plain);
    return null;
  }
  const bytes = await plain.arrayBuffer();
  if (bytes.byteLength < 128 || bytes.byteLength > MAX_IMAGE_BYTES) return null;
  return { bytes, contentType };
}

async function discardResponseBody(response: { body?: { cancel?: () => Promise<void> | void } | null }): Promise<void> {
  try {
    await response.body?.cancel?.();
  } catch {
    // The caller is not reading this body.
  }
}

function imageContentType(header: string | null): string | null {
  const raw = (header ?? "").toLowerCase();
  if (!raw.startsWith("image/") || raw.includes("svg")) return null;
  const base = raw.split(";")[0]?.trim() ?? "";
  return base.startsWith("image/") ? base : null;
}
