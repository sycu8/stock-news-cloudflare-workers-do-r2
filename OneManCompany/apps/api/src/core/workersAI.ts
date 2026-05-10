import type { Env } from "../env";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export interface RunChatOptions {
  model?: string;
  max_tokens?: number;
}

/**
 * All model traffic goes through Workers AI; when AI_GATEWAY_ID is set, requests are routed via AI Gateway.
 */
export async function runWorkersAIChat(
  env: Env,
  messages: ChatMessage[],
  opts: RunChatOptions = {}
): Promise<{ text: string; raw: unknown }> {
  const model = opts.model ?? env.DEFAULT_WORKERS_AI_MODEL;
  const gatewayId = env.AI_GATEWAY_ID?.trim();
  const gatewayOpts =
    gatewayId && gatewayId.length > 0
      ? { gateway: { id: gatewayId, skipCache: false } as const }
      : {};

  const input = {
    messages,
    max_tokens: opts.max_tokens ?? 1024,
  };

  const raw = await env.AI.run(model, input, gatewayOpts);
  const text = extractAssistantText(raw);
  return { text, raw };
}

function extractAssistantText(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && "response" in (raw as Record<string, unknown>)) {
    const r = (raw as { response?: unknown }).response;
    if (typeof r === "string") return r;
  }
  if (typeof raw === "object" && "text" in (raw as Record<string, unknown>)) {
    const t = (raw as { text?: unknown }).text;
    if (typeof t === "string") return t;
  }
  try {
    return JSON.stringify(raw);
  } catch {
    return String(raw);
  }
}
