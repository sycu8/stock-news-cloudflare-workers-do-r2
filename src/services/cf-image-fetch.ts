/**
 * Remote image optimization:
 * 1) Prefer Cloudflare Images binding (`env.IMAGES`) when configured — same pipeline as imagedelivery.net variants.
 * 2) Fallback: Workers fetch + `cf.image` (Image Resizing) with format chosen from the client `Accept` header.
 *
 * Quota error 9422 (free transformation limit) skips further transforms for this run and serves the original image.
 * If neither path produces a valid image, callers get a plain fetch of the source.
 */

import type { Env } from "../types";
import {
  discardResponseBody,
  isImageTransformErrorResponse,
  isImageTransformQuotaError,
  isImageTransformQuotaResponse,
  isImageTransformSkipped,
  noteImageTransformFailureOnce,
  noteImageTransformQuotaExhausted
} from "./image-transform-guard";

export type FetchImageOpts = {
  width?: number;
  quality?: number;
  /** Client `Accept` (e.g. from /img request) for AVIF/WebP/JPEG choice */
  accept?: string;
};

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const PLAIN_IMAGE_HEADERS = {
  "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
  Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8"
};

export async function fetchOptimizedRemoteImage(
  upstreamUrl: string,
  opts: FetchImageOpts,
  env: Env
): Promise<Response> {
  const width = clampNumber(opts.width ?? 1200, 16, 4096);
  const quality = clampNumber(opts.quality ?? 82, 1, 100);
  const accept = opts.accept;

  if (isImageTransformSkipped()) return plainImageFetch(upstreamUrl);

  if (env.IMAGES) {
    try {
      const routed = await tryImagesBindingFetch(upstreamUrl, { width, quality, accept }, env.IMAGES);
      if (routed) return routed;
      if (isImageTransformSkipped()) return plainImageFetch(upstreamUrl);
    } catch (err) {
      if (isImageTransformQuotaError(err)) {
        noteImageTransformQuotaExhausted();
        return plainImageFetch(upstreamUrl);
      }
      noteImageTransformFailureOnce(err);
    }
  }

  try {
    return await fetchViaCfImageResize(upstreamUrl, width, quality, accept);
  } catch (error) {
    if (isImageTransformQuotaError(error)) noteImageTransformQuotaExhausted();
    else noteImageTransformFailureOnce(error);
    return plainImageFetch(upstreamUrl);
  }
}

function plainImageFetch(upstreamUrl: string): Promise<Response> {
  return fetch(upstreamUrl, {
    headers: PLAIN_IMAGE_HEADERS,
    redirect: "follow"
  });
}

async function tryImagesBindingFetch(
  upstreamUrl: string,
  opts: { width: number; quality: number; accept?: string },
  images: NonNullable<Env["IMAGES"]>
): Promise<Response | null> {
  if (isImageTransformSkipped()) return null;

  const plain = await fetch(upstreamUrl, {
    headers: PLAIN_IMAGE_HEADERS,
    redirect: "follow"
  });

  if (!plain.ok || !plain.body) {
    await discardResponseBody(plain);
    return null;
  }

  const ct = (plain.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("svg")) {
    await discardResponseBody(plain);
    return null;
  }

  const length = plain.headers.get("content-length");
  if (length && Number.parseInt(length, 10) > MAX_IMAGE_BYTES) {
    await discardResponseBody(plain);
    return null;
  }

  const buffer = await plain.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES || buffer.byteLength < 128) return null;

  const originalResponse = () =>
    new Response(buffer, {
      status: 200,
      headers: { "content-type": ct.split(";")[0]?.trim() || "image/jpeg" }
    });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(buffer));
      controller.close();
    }
  });

  try {
    const format = pickImagesOutputFormat(opts.accept);
    const result = await images
      // Workers ReadableStream type differs from DOM lib; runtime stream is valid.
      .input(stream as Parameters<NonNullable<Env["IMAGES"]>["input"]>[0])
      .transform({ width: opts.width, fit: "scale-down" })
      .output({ format, quality: opts.quality, anim: false });

    const resp = result.response();
    if (isImageTransformQuotaResponse(resp)) {
      noteImageTransformQuotaExhausted();
      await discardResponseBody(resp);
      return originalResponse();
    }
    if (isImageTransformErrorResponse(resp)) {
      noteImageTransformFailureOnce(resp.headers.get("cf-resized"));
      await discardResponseBody(resp);
      return originalResponse();
    }
    if (looksLikeImage(resp)) return resp as unknown as Response;
    await discardResponseBody(resp);
    return null;
  } catch (error) {
    if (isImageTransformQuotaError(error)) {
      noteImageTransformQuotaExhausted();
      return originalResponse();
    }
    noteImageTransformFailureOnce(error);
    return null;
  }
}

function pickImagesOutputFormat(acceptHeader: string | undefined): "image/avif" | "image/webp" | "image/jpeg" {
  const a = (acceptHeader ?? "").toLowerCase();
  if (a.includes("image/avif")) return "image/avif";
  if (a.includes("image/webp")) return "image/webp";
  return "image/jpeg";
}

function pickCfResizeFormat(acceptHeader: string | undefined): "avif" | "webp" | "jpeg" {
  const a = (acceptHeader ?? "").toLowerCase();
  if (a.includes("image/avif")) return "avif";
  if (a.includes("image/webp")) return "webp";
  return "jpeg";
}

async function fetchViaCfImageResize(
  upstreamUrl: string,
  width: number,
  quality: number,
  accept: string | undefined
): Promise<Response> {
  if (isImageTransformSkipped()) return plainImageFetch(upstreamUrl);
  const format = pickCfResizeFormat(accept);

  const cfRequestInit: RequestInit = {
    headers: PLAIN_IMAGE_HEADERS,
    cf: {
      image: {
        width,
        fit: "scale-down",
        quality,
        format,
        metadata: "none",
        anim: false
      }
    }
  };

  const primary = await fetch(upstreamUrl, cfRequestInit);
  if (isImageTransformQuotaResponse(primary)) {
    noteImageTransformQuotaExhausted();
    await discardResponseBody(primary);
    return plainImageFetch(upstreamUrl);
  }
  if (isImageTransformErrorResponse(primary)) {
    noteImageTransformFailureOnce(primary.headers.get("cf-resized"));
    await discardResponseBody(primary);
    return plainImageFetch(upstreamUrl);
  }
  if (looksLikeImage(primary)) return primary;
  await discardResponseBody(primary);

  return plainImageFetch(upstreamUrl);
}

function looksLikeImage(resp: { ok: boolean; status: number; headers: { get(name: string): string | null } }): boolean {
  if (!resp.ok) return false;
  const ct = (resp.headers.get("content-type") ?? "").toLowerCase();
  if (!ct.startsWith("image/")) return false;
  const status = resp.status;
  if (status < 200 || status >= 300) return false;
  return true;
}

function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}
