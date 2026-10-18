import type { Env } from "../types";
import { setArticleImageUrl } from "../db";
import { ensureOptimizedImageAsset } from "./image-cache";
import { fetchAndExtractSource } from "./source-extract";

/** Cloudflare Images delivery URLs are stored when upload succeeds but often 403 publicly. */
export function isBrokenHostedImageUrl(imageUrl: string | null | undefined): boolean {
  const raw = imageUrl?.trim() ?? "";
  return /^https?:\/\/imagedelivery\.net\//i.test(raw);
}

/** Prefer R2 `/assets/optimized/...` when we only have a broken delivery URL. */
export function resolveStoredArticleImageUrl(imageUrl: string | null | undefined): string | null {
  const raw = imageUrl?.trim();
  if (!raw) return null;
  if (raw.startsWith("/assets/")) return raw;

  const deliveryMatch = raw.match(/^https?:\/\/imagedelivery\.net\/[^/]+\/([^/]+)\/[^/]+/i);
  if (deliveryMatch?.[1]) {
    return `/assets/optimized/article-thumb/${deliveryMatch[1]}.webp`;
  }

  return raw;
}

export async function persistArticleImageFromSource(params: {
  env: Env;
  articleId: number;
  articleUrl: string;
  currentImageUrl?: string | null;
  namespace?: "article-thumb" | "media-thumb";
}): Promise<string | null> {
  const { env, articleId, articleUrl, namespace = "article-thumb" } = params;
  let current = params.currentImageUrl?.trim() ?? "";
  if (current && !isBrokenHostedImageUrl(current) && current.startsWith("/assets/")) {
    return current;
  }

  let sourceImage: string | null = null;
  if (current && !isBrokenHostedImageUrl(current) && /^https?:\/\//i.test(current)) {
    sourceImage = current;
  } else {
    const extracted = await fetchAndExtractSource(articleUrl);
    sourceImage = extracted?.imageUrl ?? null;
  }

  if (!sourceImage) return null;

  const stored =
    (await ensureOptimizedImageAsset({
      env,
      sourceUrl: sourceImage,
      namespace
    })) ?? sourceImage;

  await setArticleImageUrl(env.DB, articleId, stored);
  return stored;
}
