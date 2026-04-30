/** RFC 8288 / RFC 9727 / RFC 9264 agent discovery (Link headers, API catalog linkset). */

const RFC9727_PROFILE = "https://www.rfc-editor.org/info/rfc9727";

/**
 * Static signing JWK for discovery metadata only (`jwks_uri`).
 * This deployment does not issue OIDC id_tokens; the key satisfies agent/scanner expectations for a non-empty JWKS document.
 */
const OAUTH_METADATA_JWKS: Record<string, unknown> = {
  keys: [
    {
      kty: "RSA",
      n: "0BF8pDK5Ytblw3KRH6eCbZdjWeQqAix8S-f5Rx_xgDZN9WBrZDrSe2ik8vNa9Py7EypdzUIpW1YnBUEK9DEE0QMsZFZ1TEqZDy5F3hSABuyY9CGzkgDY6JOOGR-G5Q1Bb22QAod1KUDfReejqzn-YC1Wn6-aXA0Tuv3e91bDezgrVgBBP66v25wjLAht-UmD5tpYC-tVcq74FhIiS-aJdtnNKx1XKQUjOzuXQQFz0fvep2Mi47aFHcu-zek4bB3VUY3TpiLNad0blJOXZHIpe7A6Ogf5hRQroLrw3-ADQpJFiASNUVfdPzqiGPa3Fo8J_iV_B1-UEk7hmhLEFXfshQ",
      e: "AQAB",
      use: "sig",
      alg: "RS256",
      kid: "vn-market-metadata-1"
    }
  ]
};

export function buildJwksDocument(): Record<string, unknown> {
  return OAUTH_METADATA_JWKS;
}

/** OpenID Connect Discovery 1.0 — https://openid.net/specs/openid-connect-discovery-1_0.html */
export function buildOpenIdConnectDiscoveryDocument(origin: string): Record<string, unknown> {
  const o = normalizeOrigin(origin);
  return {
    issuer: o,
    authorization_endpoint: `${o}/oauth/authorize`,
    token_endpoint: `${o}/oauth/token`,
    jwks_uri: `${o}/.well-known/jwks.json`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "client_credentials"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    scopes_supported: ["openid", "news.read", "admin"],
    code_challenge_methods_supported: ["S256"]
  };
}

/** RFC 8414 OAuth 2.0 Authorization Server Metadata — https://www.rfc-editor.org/rfc/rfc8414 */
export function buildOAuthAuthorizationServerMetadata(origin: string): Record<string, unknown> {
  const o = normalizeOrigin(origin);
  return {
    issuer: o,
    authorization_endpoint: `${o}/oauth/authorize`,
    token_endpoint: `${o}/oauth/token`,
    jwks_uri: `${o}/.well-known/jwks.json`,
    grant_types_supported: ["authorization_code", "client_credentials"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    scopes_supported: ["openid", "news.read", "admin"],
    code_challenge_methods_supported: ["S256"],
    response_types_supported: ["code"],
    /** RFC 9728 §4 — cross-reference for clients pairing AS metadata with protected resource metadata. */
    protected_resources: [o]
  };
}

/** SEP-1649 MCP Server Card — https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127 */
const MCP_SERVER_CARD_SCHEMA = "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json";

export function buildMcpServerCard(origin: string): Record<string, unknown> {
  const o = normalizeOrigin(origin);
  return {
    $schema: MCP_SERVER_CARD_SCHEMA,
    version: "1.0",
    protocolVersion: "2025-06-18",
    serverInfo: {
      name: "vn-market-daily-worker",
      title: "VN Market News",
      version: "1.0.0"
    },
    description:
      "Vietnam market news and data worker. Primary machine interface is HTTP JSON and RSS per OpenAPI; streamable MCP is not yet implemented on this deployment.",
    documentationUrl: `${o}/docs/api`,
    transport: {
      type: "streamable-http",
      endpoint: "/mcp"
    },
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    },
    instructions:
      "Use GET /openapi.json and /.well-known/api-catalog for HTTP APIs. The /mcp path is reserved for a future streamable MCP transport and currently returns HTTP 501."
  };
}

export function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function absoluteUrl(origin: string, pathOrUrl: string): string {
  const o = normalizeOrigin(origin);
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  return `${o}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * RFC 8288 `Link` targets for the homepage — relative references (shorter, same resolution as absolute).
 * One string per header field; callers should `append` each as its own `Link` response header.
 */
export function buildHomepageAgentLinkParts(): string[] {
  return [
    `</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
    `</.well-known/oauth-protected-resource>; rel="https://www.rfc-editor.org/rfc/rfc9728"; type="application/json"`,
    `</.well-known/openid-configuration>; rel="openid-configuration"; type="application/json"`,
    `</.well-known/oauth-authorization-server>; rel="oauth-authorization-server"; type="application/json"`,
    `</.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"`,
    `</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"`,
    `</docs/api>; rel="service-doc"; type="text/html; charset=utf-8"`,
    `</openapi.json>; rel="service-desc describedby"; type="application/json"`
  ];
}

/** RFC 8288: multiple `Link` header fields (one link-value each). */
export function appendHomepageAgentLinkHeaders(headers: Headers): void {
  for (const part of buildHomepageAgentLinkParts()) {
    headers.append("Link", part);
  }
}

/** Single comma-separated `Link` header (legacy); prefer multiple `Link` headers via `buildHomepageAgentLinkParts`. */
export function buildHomepageAgentLinkHeader(_origin: string): string {
  return buildHomepageAgentLinkParts().join(", ");
}

/** One published API = one linkset object (RFC 9727 Appendix A style). */
export interface ApiCatalogEntry {
  /** Path or absolute URL of the API resource (used as linkset `anchor`). */
  apiPath: string;
  /** HTML fragment id under `/docs/api#…`. */
  docSlug: string;
  title?: string;
}

/**
 * RFC 9727 API catalog: `linkset` is an array; each element has `anchor` for that API
 * plus `service-desc`, `service-doc`, and `status` (health) relations.
 */
export function buildApiCatalogLinkset(origin: string, apis: ApiCatalogEntry[]): Record<string, unknown> {
  const o = normalizeOrigin(origin);
  const openApiHref = `${o}/openapi.json`;
  const docsBase = `${o}/docs/api`;
  const healthHref = `${o}/health`;

  const linkset = apis.map((api) => {
    const anchor = absoluteUrl(origin, api.apiPath);
    const docHref = `${docsBase}#${api.docSlug}`;
    const serviceDocLink: Record<string, string> = {
      href: docHref,
      type: "text/html; charset=utf-8"
    };
    if (api.title) serviceDocLink.title = api.title;
    return {
      anchor,
      "service-desc": [{ href: openApiHref, type: "application/json" }],
      "service-doc": [serviceDocLink],
      status: [{ href: healthHref, type: "application/json" }]
    };
  });

  return { linkset };
}

export function apiCatalogContentType(): string {
  return `application/linkset+json; profile="${RFC9727_PROFILE}"`;
}

/** RFC 9727 §2 HEAD hints + item discovery. */
export function buildApiCatalogHeadLinkHeader(origin: string): string {
  const o = normalizeOrigin(origin);
  return [
    `<${o}/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
    `<${o}/api/news/today>; rel="item"`,
    `<${o}/openapi.json>; rel="service-desc"; type="application/json"`,
    `<${o}/docs/api>; rel="service-doc"; type="text/html; charset=utf-8"`,
    `<${o}/health>; rel="status"; type="application/json"`
  ].join(", ");
}

/** Public read APIs — one catalog row each (anchor = entry URL). */
export const PUBLIC_API_CATALOG_ENTRIES: ApiCatalogEntry[] = [
  { apiPath: "/api/news/today", docSlug: "api-news-today", title: "News feed (JSON) for a report day" },
  { apiPath: "/api/stocks/FPT", docSlug: "api-stocks-symbol", title: "Stock insight (JSON); replace path ticker" },
  { apiPath: "/api/news/explain", docSlug: "api-news-explain", title: "AI news impact explanation (JSON)" },
  { apiPath: "/api/hsx/vnindex-chart", docSlug: "api-hsx-vnindex-chart", title: "VNINDEX chart HTML fragment" },
  { apiPath: "/api/notify/status", docSlug: "api-notify-status", title: "Telegram notify status (JSON)" },
  { apiPath: "/rss/today", docSlug: "rss-today", title: "RSS 2.0 for today" },
  { apiPath: "/sitemap.xml", docSlug: "sitemap-xml", title: "XML sitemap" },
  { apiPath: "/robots.txt", docSlug: "robots-txt", title: "robots.txt" },
  { apiPath: "/health", docSlug: "health", title: "Liveness probe (JSON)" },
  { apiPath: "/api/intel/daily", docSlug: "api-intel-daily", title: "Investor desk daily snapshot JSON (R2)" }
];

export function buildOpenApiDocument(origin: string): Record<string, unknown> {
  const o = normalizeOrigin(origin);
  return {
    openapi: "3.1.0",
    info: {
      title: "VN Market News — public HTTP API",
      version: "1.0.0",
      description: "Machine-readable overview of public read endpoints (no authentication)."
    },
    servers: [{ url: o }],
    paths: {
      "/api/news/today": {
        get: {
          summary: "JSON feed for a report day",
          parameters: [
            { name: "date", in: "query", schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" } },
            { name: "source", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 200 } },
            { name: "q", in: "query", schema: { type: "string" } }
          ]
        }
      },
      "/api/stocks/{symbol}": {
        get: {
          summary: "Stock insight JSON",
          parameters: [
            { name: "symbol", in: "path", required: true, schema: { type: "string" } },
            { name: "date", in: "query", schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" } }
          ]
        }
      },
      "/api/news/explain": {
        get: {
          summary: "AI impact explanation for an article URL",
          parameters: [{ name: "u", in: "query", required: true, schema: { type: "string", format: "uri" } }]
        }
      },
      "/api/hsx/vnindex-chart": {
        get: {
          summary: "VNINDEX chart HTML fragment",
          parameters: [
            {
              name: "range",
              in: "query",
              required: true,
              schema: { type: "string", enum: ["1w", "1m", "1y"] }
            }
          ]
        }
      },
      "/api/notify/status": {
        get: { summary: "Telegram notify configuration status (non-secret)" }
      },
      "/rss/today": {
        get: {
          summary: "RSS 2.0 for today",
          parameters: [{ name: "source", in: "query", schema: { type: "string" } }]
        }
      },
      "/sitemap.xml": { get: { summary: "XML sitemap" } },
      "/robots.txt": { get: { summary: "robots.txt" } },
      "/health": { get: { summary: "Liveness JSON" } },
      "/api/intel/daily": {
        get: {
          summary: "Investor desk snapshot (Fear/Greed, sectors, smart-money proxy)",
          parameters: [{ name: "date", in: "query", required: true, schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" } }]
        }
      }
    }
  };
}

export function renderApiDocsHtml(origin: string): string {
  const o = normalizeOrigin(origin);
  const section = (id: string, title: string, body: string) =>
    `<section id="${id}" style="margin-top:1.25rem">\n  <h2>${title}</h2>\n  ${body}\n</section>`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API — VN Market News</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 52rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #0f172a; }
    a { color: #2563eb; }
    code { background: #f1f5f9; padding: 0.1em 0.35em; border-radius: 4px; }
    ul { padding-left: 1.2rem; }
  </style>
</head>
<body>
  <h1>Public API (read-only)</h1>
  <p>OpenAPI: <a href="${o}/openapi.json"><code>openapi.json</code></a> — API catalog (RFC 9727):
     <a href="${o}/.well-known/api-catalog"><code>/.well-known/api-catalog</code></a></p>
  <p>OAuth/OIDC discovery (metadata for agents): <a href="${o}/.well-known/oauth-protected-resource"><code>/.well-known/oauth-protected-resource</code></a> (RFC 9728),
     <a href="${o}/.well-known/openid-configuration"><code>/.well-known/openid-configuration</code></a>,
     <a href="${o}/.well-known/oauth-authorization-server"><code>/.well-known/oauth-authorization-server</code></a>,
     <a href="${o}/.well-known/jwks.json"><code>/.well-known/jwks.json</code></a>,
     <a href="${o}/.well-known/http-message-signatures-directory"><code>/.well-known/http-message-signatures-directory</code></a> (Web Bot Auth JWKS + signed directory).</p>
  <p>Public JSON/RSS endpoints need no token; operator routes use the admin token as documented below.</p>
  <p>MCP Server Card (SEP-1649): <a href="${o}/.well-known/mcp/server-card.json"><code>/.well-known/mcp/server-card.json</code></a> — discovery only; streamable MCP is not active yet.</p>
  ${section(
    "api-news-today",
    "GET /api/news/today",
    `<p><a href="${o}/api/news/today">Try</a> — Query: <code>date</code>, <code>source</code>, <code>page</code>, <code>pageSize</code>, <code>q</code></p>`
  )}
  ${section(
    "api-stocks-symbol",
    "GET /api/stocks/:symbol",
    `<p><a href="${o}/api/stocks/FPT">Example (FPT)</a> — Query: <code>date</code></p>`
  )}
  ${section("api-news-explain", "GET /api/news/explain", `<p>Query <code>u</code> = canonical article URL.</p>`)}
  ${section("api-hsx-vnindex-chart", "GET /api/hsx/vnindex-chart", `<p>Query <code>range</code> = <code>1w</code> | <code>1m</code> | <code>1y</code></p>`)}
  ${section("api-notify-status", "GET /api/notify/status", `<p><a href="${o}/api/notify/status">Try</a></p>`)}
  ${section("rss-today", "GET /rss/today", `<p><a href="${o}/rss/today">Try</a> — Query: <code>source</code></p>`)}
  ${section("sitemap-xml", "GET /sitemap.xml", `<p><a href="${o}/sitemap.xml">Try</a></p>`)}
  ${section("robots-txt", "GET /robots.txt", `<p><a href="${o}/robots.txt">Try</a></p>`)}
  ${section("health", "GET /health", `<p><a href="${o}/health">Try</a> — Liveness JSON for all services above.</p>`)}
  ${section("api-intel-daily", "GET /api/intel/daily", `<p>Query <code>date</code> = <code>YYYY-MM-DD</code> (Vietnam report day). Returns JSON snapshot from R2 when available (written each refresh).</p>`)}
  <p style="margin-top:2rem"><a href="${o}/">← Trang chủ</a></p>
</body>
</html>`;
}
