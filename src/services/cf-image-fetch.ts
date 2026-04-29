/**
 * Optimizes arbitrary remote images through Cloudflare (Workers fetch + cf.image).
 * Uses Image Resizing / Images transforms when enabled on your account and zone.
 * Falls back to a plain upstream fetch when cf.image does not produce a usable image response.
 */

export async function fetchOptimizedRemoteImage(upstreamUrl: string, opts: { width?: number; quality?: number }): Promise<Response> {
  const width = clampNumber(opts.width ?? 1200, 16, 4096);
  const quality = clampNumber(opts.quality ?? 82, 1, 100);

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
        metadata: "none"
      }
    }
  };

  const primary = await fetch(upstreamUrl, cfRequestInit);
  if (looksLikeImage(primary)) return primary;

  const fallback = await fetch(upstreamUrl, {
    headers: {
      "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
      Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8"
    }
  });
  return fallback;
}

function looksLikeImage(resp: Response): boolean {
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
