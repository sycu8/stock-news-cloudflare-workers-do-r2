import type { Env } from "../types";

const TOKEN_PREFIX = "oauth:access:";
const TOKEN_TTL_SEC = 3600;

export interface OAuthTokenRecord {
  clientId: string;
  scopes: string[];
  expiresAt: number;
}

export function isOAuthClientConfigured(env: Env): boolean {
  return Boolean(env.OAUTH_CLIENT_ID?.trim() && env.OAUTH_CLIENT_SECRET?.trim());
}

export async function issueClientCredentialsToken(env: Env, clientId: string, clientSecret: string): Promise<string | null> {
  if (!isOAuthClientConfigured(env)) return null;
  if (clientId !== env.OAUTH_CLIENT_ID?.trim() || clientSecret !== env.OAUTH_CLIENT_SECRET?.trim()) {
    return null;
  }
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const record: OAuthTokenRecord = {
    clientId,
    scopes: ["news.read"],
    expiresAt: Date.now() + TOKEN_TTL_SEC * 1000
  };
  await env.CACHE.put(`${TOKEN_PREFIX}${token}`, JSON.stringify(record), { expirationTtl: TOKEN_TTL_SEC });
  return token;
}

export async function verifyOAuthAccessToken(env: Env, headerAuth: string | undefined): Promise<OAuthTokenRecord | null> {
  if (!headerAuth?.startsWith("Bearer ")) return null;
  const token = headerAuth.slice(7).trim();
  if (!token) return null;
  const raw = await env.CACHE.get(`${TOKEN_PREFIX}${token}`, "json");
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as OAuthTokenRecord;
  if (rec.expiresAt < Date.now()) return null;
  return rec;
}

export function tokenHasScope(rec: OAuthTokenRecord, scope: string): boolean {
  return rec.scopes.includes(scope) || rec.scopes.includes("admin");
}
