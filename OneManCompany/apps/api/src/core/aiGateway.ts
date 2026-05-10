/**
 * AI Gateway helpers — Workers AI calls should prefer `gateway` options on `env.AI.run`
 * (see workersAI.ts). Use these URLs if you need raw fetch / custom headers (e.g. CF_AIG_TOKEN).
 */
export function buildWorkersAIGatewayUrl(accountId: string, gatewayId: string, model: string): string {
  const enc = encodeURIComponent(model);
  return `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/workers-ai/${enc}`;
}

export function gatewayHeaders(cfAigToken?: string): HeadersInit {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (cfAigToken) h.Authorization = `Bearer ${cfAigToken}`;
  return h;
}
