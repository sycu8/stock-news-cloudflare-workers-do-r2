# Product Roadmap

Vision: **stocknews.orangecloud.vn** as a mobile-first Vietnam market news terminal — curated feeds, investor desk, personalized watchlists, and alerts. Informational only; not investment advice.

A separate experimental project lives in [`OneManCompany/`](OneManCompany/) (AI company simulator); it is not deployed with the main Worker.

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
| OpenAPI catalog expansion | Planned | Document desk, portfolio, live poll routes |
| Remove `ALLOW_ADMIN_QUERY_TOKEN` escape hatch | Planned | After cookie auth verified |

### Phase 1 — Terminal MVP

| Feature | Status | Notes |
|---------|--------|-------|
| Investor Desk (`/desk`, `/briefing`, `/markets`, `/portfolio`, `/intel`) | Shipped | [`src/ui/investor-desk.ts`](src/ui/investor-desk.ts) |
| Cookie watchlist (`vnwatch`) | Shipped | Up to 18 symbols |
| KV-backed watchlist (`sn_watch_id`) | Shipped | [`src/services/watchlist.ts`](src/services/watchlist.ts), `GET/POST /api/watchlist` |
| CSV export/import on portfolio | Shipped | `/api/watchlist/export`, `POST /portfolio/import` |
| Personalized Telegram alerts | Shipped | `/symbols`, `/impact`, `/breaking`, `/settings` |
| AI morning brief (cached) | Shipped | [`src/services/morning-brief.ts`](src/services/morning-brief.ts), `/briefing` |
| Multi-source news clusters on `/intel` | Shipped | [`src/services/news-cluster.ts`](src/services/news-cluster.ts) |
| Live poll (home + portfolio) | Shipped | `/api/live/poll` |

### Phase 2 — Market data & intelligence

| Feature | Status | Notes |
|---------|--------|-------|
| Licensed foreign flow / proprietary volume | Blocked | Requires feed contract before UI |
| Stock detail depth | Planned | [`src/ui/stocks.ts`](src/ui/stocks.ts) |
| Fear/greed calibration with licensed index | Planned | [`src/services/investor-intel.ts`](src/services/investor-intel.ts) |
| D1-backed cluster persistence | Planned | Migration `0005` tables exist; runtime still in-memory |

### Phase 3 — Platform & agents

| Feature | Status | Notes |
|---------|--------|-------|
| Streamable MCP (`/mcp`) | Planned | Currently HTTP 501 |
| OAuth server (`/oauth/*`) | Planned | Discovery stubs only |
| Web Push / email digests | Planned | Complement Telegram |
| User accounts | Planned | Only if anonymous KV watchlists insufficient |
| RUM → observability dashboard | Planned | `POST /api/rum` |

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
| CEO chat wired to API | Planned | UI is local-only today |
| Real agent tools (not stubs) | Planned | [`registry.ts`](OneManCompany/apps/api/src/core/agents/registry.ts) |
| Workflow create/run API | Planned | Read-only GET today |

### OMC Phase 2 — Live simulation

| Feature | Status | Notes |
|---------|--------|-------|
| Durable Object WebSockets + alarms | Planned | [`CompanyRoom.ts`](OneManCompany/apps/api/src/durable-objects/CompanyRoom.ts) |
| Agent telemetry persistence | Planned | V2 stub in executor |
| Live pixel office from DO events | Planned | [`PixelOffice.tsx`](OneManCompany/apps/web/src/components/PixelOffice.tsx) |

### OMC Phase 3 — Production split

| Feature | Status | Notes |
|---------|--------|-------|
| Separate deploy + README | Planned | Independent `wrangler.toml` |
| Vitest for orchestrator | Planned | JSON fallback coverage |

---

## Key modules

| Area | Path |
|------|------|
| HTTP routes | [`src/index.ts`](src/index.ts) |
| Refresh cron | [`src/services/refresh.ts`](src/services/refresh.ts) |
| Watchlist | [`src/services/watchlist.ts`](src/services/watchlist.ts) |
| Telegram | [`src/services/telegram-bot.ts`](src/services/telegram-bot.ts) |
| Morning brief | [`src/services/morning-brief.ts`](src/services/morning-brief.ts) |
| Investor intel | [`src/services/investor-intel.ts`](src/services/investor-intel.ts) |
| Design system | [`src/ui/theme.ts`](src/ui/theme.ts), [`.cursor/rules/stocknews-design-system.mdc`](.cursor/rules/stocknews-design-system.mdc) |

## Deploy

Main site: `npx wrangler deploy` from repo root (see [`README.md`](README.md)).
