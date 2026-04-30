import type { Env } from "../types";

/** High-level text tasks — each can map to a different Workers AI / OpenAI model. */
export type TextAiPurpose = "summary" | "explain" | "translate";

const DEFAULT_WORKERS_SUMMARY = "@cf/meta/llama-3.1-8b-instruct-fast";
const DEFAULT_WORKERS_IMAGE = "@cf/bytedance/stable-diffusion-xl-lightning";

/** Options for `env.AI.run(..., ..., options)` when AI Gateway is configured. */
export function workersAiGatewayOptions(env: Env): { gateway: { id: string; skipCache: boolean } } | undefined {
  const id = env.AI_GATEWAY_ID?.trim();
  if (!id) return undefined;
  const skipCache = env.AI_GATEWAY_SKIP_CACHE !== "false";
  return { gateway: { id, skipCache } };
}

/** Workers AI text model: explain can use a larger / slower model than batch summaries. */
export function workersAiTextModel(env: Env, purpose: TextAiPurpose): string {
  if (purpose === "explain") {
    return (
      env.WORKERS_AI_MODEL_EXPLAIN?.trim() ||
      env.WORKERS_AI_MODEL_SUMMARY?.trim() ||
      DEFAULT_WORKERS_SUMMARY
    );
  }
  return env.WORKERS_AI_MODEL_SUMMARY?.trim() || DEFAULT_WORKERS_SUMMARY;
}

/** Workers AI image model (SD, flux, etc. — depends on account availability). */
export function workersAiImageModel(env: Env): string {
  return env.WORKERS_AI_MODEL_IMAGE?.trim() || DEFAULT_WORKERS_IMAGE;
}

/**
 * OpenAI chat model per task. Falls back to `OPENAI_MODEL` for all when overrides unset.
 */
export function openAiChatModel(env: Env, purpose: TextAiPurpose): string {
  const base = env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  if (purpose === "explain") return env.OPENAI_MODEL_EXPLAIN?.trim() || base;
  if (purpose === "translate") return env.OPENAI_MODEL_TRANSLATE?.trim() || base;
  return env.OPENAI_MODEL_SUMMARY?.trim() || base;
}

export function maxTokensForTextPurpose(purpose: TextAiPurpose): number {
  if (purpose === "explain") return 640;
  if (purpose === "translate") return 4096;
  return 420;
}

export type TextInferenceBackend = "workers" | "openai";

function envFlagTrue(v: string | undefined): boolean {
  const t = v?.trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes";
}

/**
 * Which backend to try first for a text task. Explain can prefer OpenAI when
 * `AI_EXPLAIN_OPENAI_FIRST` is set and an API key exists (e.g. stronger model via Gateway).
 */
export function textInferenceOrder(env: Env, purpose: TextAiPurpose): TextInferenceBackend[] {
  if (purpose === "explain" && envFlagTrue(env.AI_EXPLAIN_OPENAI_FIRST) && env.OPENAI_API_KEY?.trim()) {
    return ["openai", "workers"];
  }
  return ["workers", "openai"];
}

/**
 * OpenAI-compatible chat completions URL — via AI Gateway when account + gateway IDs are set.
 * @see https://developers.cloudflare.com/ai-gateway/get-started/connecting-applications/
 */
export function openAiChatCompletionsUrl(env: Env): string {
  const account = env.AI_GATEWAY_ACCOUNT_ID?.trim();
  const gateway = env.AI_GATEWAY_ID?.trim();
  if (account && gateway) {
    return `https://gateway.ai.cloudflare.com/v1/${account}/${gateway}/openai/chat/completions`;
  }
  return "https://api.openai.com/v1/chat/completions";
}

/**
 * Headers for OpenAI chat requests. When using AI Gateway, optional `cf-aig-authorization`
 * (dashboard token or API token with AI Gateway scope).
 */
export function openAiChatRequestHeaders(env: Env): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  const aig = env.CF_AIG_TOKEN?.trim() || env.AI_GATEWAY_API_TOKEN?.trim();
  if (aig) {
    headers["cf-aig-authorization"] = `Bearer ${aig}`;
  }
  const key = env.OPENAI_API_KEY?.trim();
  if (key) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}
