import type { Env } from "../types";
import { headR2Object } from "../utils/resilience";
import { sha256Hex } from "../utils/sha256";
import {
  discardResponseBody,
  isImageTransformErrorResponse,
  isImageTransformQuotaError,
  isImageTransformQuotaResponse,
  isImageTransformSkipped,
  noteImageTransformFailureOnce,
  noteImageTransformQuotaExhausted
} from "./image-transform-guard";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const PLAIN_IMAGE_HEADERS = {
  "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
  Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8"
};

type RemoteImage = { bytes: ArrayBuffer; contentType: string };

export async function ensureOptimizedImageAsset(params: {
  env: Env;
  sourceUrl: string;
  namespace: "article-thumb" | "media-thumb";
}): Promise<string | null> {
  const { env, sourceUrl, namespace } = params;
  if (!env.ASSETS) return null;
  if (!/^https?:\/\//i.test(sourceUrl)) return sourceUrl;

  const hash = await sha256Hex(sourceUrl);
  const optimizedKey = `optimized/${namespace}/${hash}.webp`;
  const originalKey = `original/${namespace}/${hash}`;

  const optimizedHit = await headR2Object(env.ASSETS, optimizedKey);
  if (optimizedHit) return `/assets/${optimizedKey}`;

  try {
    if (isImageTransformSkipped()) {
      return (await readOrStoreOriginal(env, sourceUrl, namespace, originalKey)) ?? sourceUrl;
    }

    const stored = await cacheRemoteImage(env, sourceUrl, namespace, optimizedKey, originalKey);
    return stored ?? sourceUrl;
  } catch (error) {
    if (isImageTransformQuotaError(error)) noteImageTransformQuotaExhausted();
    else noteImageTransformFailureOnce(error);
    return sourceUrl;
  }
}

async function readOrStoreOriginal(
  env: Env,
  sourceUrl: string,
  namespace: "article-thumb" | "media-thumb",
  originalKey: string
): Promise<string | null> {
  const existing = await headR2Object(env.ASSETS!, originalKey);
  if (existing) return `/assets/${originalKey}`;
  const plain = await fetchPlainImage(sourceUrl);
  if (!plain) return null;
  return storeOriginal(env, originalKey, plain, sourceUrl, namespace);
}

async function cacheRemoteImage(
  env: Env,
  sourceUrl: string,
  namespace: "article-thumb" | "media-thumb",
  optimizedKey: string,
  originalKey: string
): Promise<string | null> {
  let plain: RemoteImage | null = null;

  if (env.IMAGES && !isImageTransformSkipped()) {
    plain = await fetchPlainImage(sourceUrl);
    if (plain) {
      const webp = await transformWithImagesBinding(env, plain.bytes);
      if (webp) {
        const path = await storeWebp(env, optimizedKey, webp, sourceUrl, namespace);
        if (path) return path;
      }
      if (isImageTransformSkipped()) {
        return storeOriginal(env, originalKey, plain, sourceUrl, namespace);
      }
    }
  }

  if (!isImageTransformSkipped()) {
    const viaCf = await fetchViaCfImageResize(sourceUrl);
    if (viaCf) {
      const path = await storeWebp(env, optimizedKey, viaCf, sourceUrl, namespace);
      if (path) return path;
    }
  }

  if (plain) return storeOriginal(env, originalKey, plain, sourceUrl, namespace);
  // The Images binding path already downloaded the origin. A second plain fetch
  // would only repeat a miss.
  if (env.IMAGES) return null;

  const fallback = await fetchPlainImage(sourceUrl);
  if (!fallback) return null;
  return storeOriginal(env, originalKey, fallback, sourceUrl, namespace);
}

async function storeWebp(
  env: Env,
  key: string,
  bytes: ArrayBuffer,
  sourceUrl: string,
  namespace: "article-thumb" | "media-thumb"
): Promise<string | null> {
  await env.ASSETS!.put(key, bytes, {
    httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: {
      kind: "optimized_remote_image",
      sourceUrl: sourceUrl.slice(0, 512),
      namespace
    }
  });
  void tryStoreInHostedImages(env, bytes, key.split("/").pop()?.replace(/\.webp$/, "") ?? key, sourceUrl, namespace).catch(
    () => {}
  );
  return `/assets/${key}`;
}

async function storeOriginal(
  env: Env,
  key: string,
  image: RemoteImage,
  sourceUrl: string,
  namespace: "article-thumb" | "media-thumb"
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
    return meta.id;
  } catch (error) {
    const msg = error instanceof Error ? error.message.toLowerCase() : "";
    if (msg.includes("already") || msg.includes("exists") || msg.includes("conflict")) {
      return hash;
    }
    console.warn("Hosted Images upload failed:", error);
    return null;
  }
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

async function transformWithImagesBinding(env: Env, bytes: ArrayBuffer): Promise<ArrayBuffer | null> {
  if (!env.IMAGES || isImageTransformSkipped()) return null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    }
  });

  try {
    const result = await env.IMAGES
      .input(stream as Parameters<NonNullable<Env["IMAGES"]>["input"]>[0])
      .transform({ width: 1200, fit: "scale-down" })
      .output({ format: "image/webp", quality: 82, anim: false });
    const response = result.response() as unknown as Response;
    if (isImageTransformQuotaResponse(response)) {
      noteImageTransformQuotaExhausted();
      await discardResponseBody(response);
      return null;
    }
    if (isImageTransformErrorResponse(response)) {
      noteImageTransformFailureOnce(response.headers.get("cf-resized"));
      await discardResponseBody(response);
      return null;
    }
    if (!response.ok) {
      await discardResponseBody(response);
      return null;
    }
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.startsWith("image/")) {
      await discardResponseBody(response);
      return null;
    }
    const optimized = await response.arrayBuffer();
    if (optimized.byteLength < 128 || optimized.byteLength > MAX_IMAGE_BYTES) return null;
    return optimized;
  } catch (error) {
    if (isImageTransformQuotaError(error)) noteImageTransformQuotaExhausted();
    else noteImageTransformFailureOnce(error);
    return null;
  }
}

async function fetchViaCfImageResize(sourceUrl: string): Promise<ArrayBuffer | null> {
  if (isImageTransformSkipped()) return null;
  try {
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
    if (isImageTransformQuotaResponse(response)) {
      noteImageTransformQuotaExhausted();
      await discardResponseBody(response);
      return null;
    }
    if (isImageTransformErrorResponse(response)) {
      noteImageTransformFailureOnce(response.headers.get("cf-resized"));
      await discardResponseBody(response);
      return null;
    }
    if (!response.ok) {
      await discardResponseBody(response);
      return null;
    }
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.startsWith("image/")) {
      await discardResponseBody(response);
      return null;
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 128 || bytes.byteLength > MAX_IMAGE_BYTES) return null;
    return bytes;
  } catch (error) {
    if (isImageTransformQuotaError(error)) noteImageTransformQuotaExhausted();
    else noteImageTransformFailureOnce(error);
    return null;
  }
}

function imageContentType(header: string | null): string | null {
  const raw = (header ?? "").toLowerCase();
  if (!raw.startsWith("image/") || raw.includes("svg")) return null;
  const base = raw.split(";")[0]?.trim() ?? "";
  return base.startsWith("image/") ? base : null;
}
