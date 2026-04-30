import type { Env } from "../types";
import { normalizeOrigin } from "./agent-discovery";

/** RFC 9728 OAuth 2.0 Protected Resource Metadata (application/json). */

function parseHttpsIssuerList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const u = part.trim();
    if (!u) continue;
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "https:") continue;
      if (parsed.hash) continue;
      out.push(parsed.toString().replace(/\/$/, "") || parsed.toString());
    } catch {
      continue;
    }
  }
  return [...new Set(out)];
}

function parseScopeList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw?.trim()) return fallback;
  const scopes = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return scopes.length ? [...new Set(scopes)] : fallback;
}

/**
 * Build metadata document. `resource` MUST match the resource identifier used to
 * form the metadata URL (RFC 9728 §3.3) — here the request origin with no path.
 */
export function buildOAuthProtectedResourceMetadata(origin: string, env: Env): Record<string, unknown> {
  const o = normalizeOrigin(origin);
  const configured = parseHttpsIssuerList(env.OAUTH_AUTHORIZATION_SERVERS);
  /** Same-host issuer matches `/.well-known/oauth-authorization-server` on this worker (RFC 8414). */
  const authorizationServers = configured.length > 0 ? configured : [o];
  const scopesSupported = parseScopeList(env.OAUTH_SCOPES_SUPPORTED, ["openid", "news.read", "admin"]);

  return {
    resource: o,
    authorization_servers: authorizationServers,
    scopes_supported: scopesSupported,
    bearer_methods_supported: ["header"],
    resource_name: "VN Market News",
    resource_documentation: `${o}/docs/api`
  };
}

export function oauthProtectedResourceCacheControl(): string {
  return "public, s-maxage=3600, stale-while-revalidate=86400";
}

/** RFC 9728 §5 — optional hint on 401 for OAuth clients. */
export function wwwAuthenticateResourceMetadata(origin: string): string {
  const o = normalizeOrigin(origin);
  return `Bearer resource_metadata="${o}/.well-known/oauth-protected-resource"`;
}
