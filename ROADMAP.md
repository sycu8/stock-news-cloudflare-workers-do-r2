# Product Roadmap

Vision: **stocknews.orangecloud.vn** as a mobile-first Vietnam market news terminal — curated feeds, investor desk, personalized watchlists, and alerts. Informational only; not investment advice.

A separate experimental project lives in [`OneManCompany/`](OneManCompany/) (AI company simulator); deploy separately from the main Worker.

## Status legend

| Status | Meaning |
|--------|---------|
| Shipped | Live in production |
| In progress | Partially implemented |
| Planned | Scoped, not started |
| Blocked | Needs external dependency (e.g. licensed data) |

---

## VN Market Daily Worker

### Phase 0 — Engineering foundation

| Feature | Status | Notes |
|---------|--------|-------|
| TypeScript check in CI | Shipped | `npm run check` |
| Unit tests in CI | Shipped | `npm run test:article` |
| Lighthouse + Pa11y smoke | Shipped | `.github/workflows/perf-a11y-ci.yml` |
| OpenAPI catalog expansion | Shipped | Desk, watchlist, live poll, clusters, push, RUM |
| Remove `ALLOW_ADMIN_QUERY_TOKEN` escape hatch | Shipped | Query-string admin token removed |

### Phase 1 — Terminal MVP

| Feature | Status | Notes |
|---------|--------|-------|
| Investor Desk (`/desk`, `/briefing`, `/markets`, `/portfolio`, `/intel`) | Shipped | [`src/ui/investor-desk.ts`](src/ui/investor-desk.ts) |
| Cookie watchlist (`vnwatch`) | Shipped | Up to 18 symbols |
| KV-backed watchlist (`sn_watch_id`) | Shipped | [`src/services/watchlist.ts`](src/services/watchlist.ts) |
| CSV export/import on portfolio | Shipped | `/api/watchlist/export`, `POST /portfolio/import` |
| Personalized Telegram alerts | Shipped | [`src/services/telegram-prefs.ts`](src/services/telegram-prefs.ts) |
| AI morning brief (cached) | Shipped | [`src/services/morning-brief.ts`](src/services/morning-brief.ts) |
| Multi-source news clusters on `/intel` | Shipped | D1 + in-memory fallback |
| Live poll (home + portfolio) | Shipped | `/api/live/poll` |

### Phase 2 — Market data & intelligence

| Feature | Status | Notes |
|---------|--------|-------|
| Licensed foreign flow / proprietary volume | Blocked | Requires feed contract before UI |
| Stock detail depth | Shipped | Disclaimers, watchlist CTA on [`src/ui/stocks.ts`](src/ui/stocks.ts) |
| Fear/greed transparency (methodology inputs) | Shipped | `FearGreedResult.inputs` in [`src/services/investor-intel.ts`](src/services/investor-intel.ts) |
| D1-backed cluster persistence | Shipped | [`src/services/news-cluster-persist.ts`](src/services/news-cluster-persist.ts), `GET /api/clusters` |
| Fear/greed with licensed index | Blocked | Needs licensed market data |

### Phase 3 — Platform & agents

| Feature | Status | Notes |
|---------|--------|-------|
| JSON-RPC MCP (`POST /mcp`) | Shipped | [`src/services/mcp-handler.ts`](src/services/mcp-handler.ts) — tools/list, tools/call |
| OAuth `client_credentials` | Shipped | `OAUTH_CLIENT_ID` + `OAUTH_CLIENT_SECRET` → `POST /oauth/token` |
| OAuth authorization code + user login | Planned | `/oauth/authorize` still 501 |
| Web Push | Shipped (partial) | Subscribe + `/sw.js`; needs VAPID secrets for delivery |
| Email digests | Planned | No mail provider wired |
| User accounts | Planned | KV watchlists sufficient for now |
| RUM observability | Shipped (partial) | KV aggregates on `/status`, `GET /api/rum/summary` |

### Out of scope

- Investment recommendations or guaranteed returns
- Real-time order book or foreign-flow UI without licensed feeds
- Replacing professional terminal products (Bloomberg, etc.)

---

## OneManCompany

### OMC Phase 1 — MVP completion

| Feature | Status | Notes |
|---------|--------|-------|
| EA → COO → CSO → QA pipeline | Shipped | [`CompanyOrchestrator.ts`](OneManCompany/apps/api/src/core/orchestration/CompanyOrchestrator.ts) |
| CEO chat wired to API | Shipped | Chat tab triggers objective pipeline |
| Agent tool descriptions | Shipped | No longer stub-only labels |
| Workflow create/run API | Shipped | `POST /api/workflows/company/:id`, `POST /api/workflows/:id/run` |

### OMC Phase 2 — Live simulation

| Feature | Status | Notes |
|---------|--------|-------|
| Durable Object WebSockets + alarms | Planned | [`CompanyRoom.ts`](OneManCompany/apps/api/src/durable-objects/CompanyRoom.ts) |
| Agent telemetry persistence | Planned | V2 stub in executor |
| Live pixel office from DO events | Planned | [`PixelOffice.tsx`](OneManCompany/apps/web/src/components/PixelOffice.tsx) |

### OMC Phase 3 — Production split

| Feature | Status | Notes |
|---------|--------|-------|
| Separate deploy + README | Shipped | [`OneManCompany/README.md`](OneManCompany/README.md) |
| Vitest for orchestrator | Planned | JSON fallback coverage |

---

## Key modules

| Area | Path |
|------|------|
| HTTP routes | [`src/index.ts`](src/index.ts) |
| Refresh cron | [`src/services/refresh.ts`](src/services/refresh.ts) |
| Cluster persistence | [`src/services/news-cluster-persist.ts`](src/services/news-cluster-persist.ts) |
| MCP | [`src/services/mcp-handler.ts`](src/services/mcp-handler.ts) |
| OAuth tokens | [`src/services/oauth-token.ts`](src/services/oauth-token.ts) |
| Web Push | [`src/services/web-push.ts`](src/services/web-push.ts) |
| RUM | [`src/services/rum-metrics.ts`](src/services/rum-metrics.ts) |

## Deploy

Main site: `npx wrangler deploy` from repo root.

Optional secrets: `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.
