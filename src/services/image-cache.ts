import type { Env } from "../types";
import { sha256Hex } from "../utils/sha256";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export async function ensureOptimizedImageAsset(params: {
  env: Env;
  sourceUrl: string;
  namespace: "article-thumb" | "media-thumb";
}): Promise<string | null> {
  const { env, sourceUrl, namespace } = params;
  if (!env.ASSETS) return null;
  if (!/^https?:\/\//i.test(sourceUrl)) return sourceUrl;

  const hash = await sha256Hex(sourceUrl);
  const key = `optimized/${namespace}/${hash}.webp`;
  const publicPath = `/assets/${key}`;
  const hostedDeliveryUrl = getHostedDeliveryUrl(env, hash);
  if (!hostedDeliveryUrl) {
    const existing = await env.ASSETS.head(key);
    if (existing) return publicPath;
  }

  try {
    const optimized = await fetchOptimizedImageBytes(env, sourceUrl);
    if (!optimized || optimized.byteLength < 128) return null;
    const hostedUrl = await tryStoreInHostedImages(env, optimized, hash, sourceUrl, namespace);
    if (hostedUrl) return hostedUrl;
    const existing = await env.ASSETS.head(key);
    if (existing) return publicPath;
    await env.ASSETS.put(key, optimized, {
      httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: {
        kind: "optimized_remote_image",
        sourceUrl: sourceUrl.slice(0, 512),
        namespace
      }
    });
    return publicPath;
  } catch (error) {
    console.error("Failed to cache optimized remote image:", error);
    return null;
  }
}

async function tryStoreInHostedImages(
  env: Env,
  bytes: ArrayBuffer,
  hash: string,
  sourceUrl: string,
  namespace: "article-thumb" | "media-thumb"
): Promise<string | null> {
  const accountHash = env.CF_IMAGES_ACCOUNT_HASH?.trim();
  if (!env.IMAGES?.hosted || !accountHash) return null;
  try {
    const meta = await env.IMAGES.hosted.upload(bytes, {
      id: hash,
      filename: `${namespace}-${hash}.webp`,
      requireSignedURLs: false,
      metadata: {
        kind: "optimized_remote_image",
        namespace,
        sourceUrl: sourceUrl.slice(0, 512)
      }
    });
    return getHostedDeliveryUrl(env, meta.id);
  } catch (error) {
    const msg = error instanceof Error ? error.message.toLowerCase() : "";
    // If the image already exists with the same deterministic id, reuse its delivery URL.
    if (msg.includes("already") || msg.includes("exists") || msg.includes("conflict")) {
      return getHostedDeliveryUrl(env, hash);
    }
    console.warn("Hosted Images upload failed, falling back to R2:", error);
    return null;
  }
}

function getHostedDeliveryUrl(env: Env, imageId: string): string | null {
  const accountHash = env.CF_IMAGES_ACCOUNT_HASH?.trim();
  if (!accountHash) return null;
  const variant = env.CF_IMAGES_VARIANT?.trim() || "public";
  return `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`;
}

async function fetchOptimizedImageBytes(env: Env, sourceUrl: string): Promise<ArrayBuffer | null> {
  if (env.IMAGES) {
    const viaImages = await tryViaImagesBinding(env, sourceUrl);
    if (viaImages) return viaImages;
  }
  return await tryViaCfImageResize(sourceUrl);
}

async function tryViaImagesBinding(env: Env, sourceUrl: string): Promise<ArrayBuffer | null> {
  const plain = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
      Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8"
    },
    redirect: "follow"
  });
  if (!plain.ok || !plain.body) return null;
  const ct = (plain.headers.get("content-type") ?? "").toLowerCase();
  if (!ct.startsWith("image/") || ct.includes("svg")) return null;
  const length = plain.headers.get("content-length");
  if (length && Number.parseInt(length, 10) > MAX_IMAGE_BYTES) return null;

  const buffer = await plain.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES) return null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(buffer));
      controller.close();
    }
  });

  const result = await env.IMAGES!
    .input(stream as Parameters<NonNullable<Env["IMAGES"]>["input"]>[0])
    .transform({ width: 1200, fit: "scale-down" })
    .output({ format: "image/webp", quality: 82, anim: false });

  const response = result.response() as unknown as Response;
  if (!response.ok) return null;
  return await response.arrayBuffer();
}

async function tryViaCfImageResize(sourceUrl: string): Promise<ArrayBuffer | null> {
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
      Accept: "image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8"
    },
    cf: {
      image: {
        width: 1200,
        fit: "scale-down",
        quality: 82,
        format: "webp",
        metadata: "none",
        anim: false
      }
    }
  });
  if (!response.ok) return null;
  const ct = (response.headers.get("content-type") ?? "").toLowerCase();
  if (!ct.startsWith("image/")) return null;
  return await response.arrayBuffer();
}
