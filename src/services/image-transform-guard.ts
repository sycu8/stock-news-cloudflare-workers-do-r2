/**
 * Cloudflare Images free tier returns 9422 once the monthly unique-transformation
 * quota is exhausted. The first failure opens a circuit for the rest of this
 * isolate so later images in the same run are served from the original bytes.
 */

import { errorMessage } from "../utils/resilience";

type HeaderSource = { get(name: string): string | null };

let quotaExhausted = false;
let transformFailureWarned = false;

export function isImageTransformSkipped(): boolean {
  return quotaExhausted;
}

export function isImageTransformQuotaError(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error && Number((error as { code?: unknown }).code) === 9422) {
    return true;
  }
  const text = errorMessage(error);
  if (/\b9422\b/.test(text)) return true;
  if (/usage limit was reached/i.test(text)) return true;
  return /quota/i.test(text) && /transform/i.test(text);
}

export function isImageTransformQuotaResponse(response: {
  status?: number;
  headers?: HeaderSource;
}): boolean {
  if (response.status === 9422) return true;
  const header = response.headers?.get("cf-resized") ?? "";
  return /\b9422\b/.test(header) || isImageTransformQuotaError(header);
}

export function isImageTransformErrorResponse(response: { headers?: HeaderSource }): boolean {
  const header = response.headers?.get("cf-resized") ?? "";
  return /\berr=\d+/i.test(header);
}

export function noteImageTransformQuotaExhausted(): void {
  const first = !quotaExhausted;
  quotaExhausted = true;
  if (!first) return;
  console.warn(
    "Cloudflare Images transformation quota exhausted (9422); serving original images for the rest of this run"
  );
}

export function noteImageTransformFailureOnce(error: unknown): void {
  if (isImageTransformQuotaError(error)) {
    noteImageTransformQuotaExhausted();
    return;
  }
  if (transformFailureWarned) return;
  transformFailureWarned = true;
  console.warn("Image optimization unavailable; serving the original image instead:", errorMessage(error));
}

export async function discardResponseBody(response: {
  body?: { cancel?: () => Promise<void> | void } | null;
}): Promise<void> {
  try {
    await response.body?.cancel?.();
  } catch {
    // The caller is not reading this body.
  }
}

export function resetImageTransformGuardForTests(): void {
  quotaExhausted = false;
  transformFailureWarned = false;
}
