/**
 * Remote image optimization:
 * 1) Prefer Cloudflare Images binding (`env.IMAGES`) when configured — same pipeline as imagedelivery.net variants.
 * 2) Fallback: Workers fetch + `cf.image` (Image Resizing) with format chosen from the client `Accept` header.
 *
 * If neither produces a valid image, callers may retry with a plain fetch.
 */

import type { Env } from "../types";

export type FetchImageOpts = {
  width?: number;
  quality?: number;
  /** Client `Accept` (e.g. from /img request) for AVIF/WebP/JPEG choice */
  accept?: string;
};

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export async function fetchOptimizedRemoteImage(
  upstreamUrl: string,
  opts: FetchImageOpts,
  env: Env
): Promise<Response> {
  const width = clampNumber(opts.width ?? 1200, 16, 4096);
  const quality = clampNumber(opts.quality ?? 82, 1, 100);
  const accept = opts.accept;

  if (env.IMAGES) {
    try {
      const routed = await tryImagesBindingFetch(upstreamUrl, { width, quality, accept }, env.IMAGES);
      if (routed) return routed;
    } catch (err) {
      console.warn("Cloudflare Images binding failed, using cf.image fallback:", err);
    }
  }

  return fetchViaCfImageResize(upstreamUrl, width, quality, accept);
}

async function tryImagesBindingFetch(
  upstreamUrl: string,
  opts: { width: number; quality: number; accept?: string },
  images: NonNullable<Env["IMAGES"]>
): Promise<Response | null> {
  const plain = await fetch(upstreamUrl, {
    headers: {
      "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
      Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8"
    },
    redirect: "follow"
  });

  if (!plain.ok || !plain.body) return null;

  const ct = (plain.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("svg")) return null;

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

  const format = pickImagesOutputFormat(opts.accept);
  const result = await images
    // Workers ReadableStream type differs from DOM lib; runtime stream is valid.
    .input(stream as Parameters<NonNullable<Env["IMAGES"]>["input"]>[0])
    .transform({ width: opts.width, fit: "scale-down" })
    .output({ format, quality: opts.quality, anim: false });

  const resp = result.response();
  return looksLikeImage(resp) ? (resp as unknown as Response) : null;
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
  const format = pickCfResizeFormat(accept);

  const cfRequestInit: RequestInit = {
    headers: {
      "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
      Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8"
    },
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
  if (looksLikeImage(primary)) return primary;

  return fetch(upstreamUrl, {
    headers: {
      "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
      Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8"
    }
  });
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
