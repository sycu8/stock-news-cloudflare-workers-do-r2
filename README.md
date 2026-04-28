# VN Market Daily Worker

A production-ready Vietnam stock market news website running on Cloudflare Workers (TypeScript + Hono), with a 5-minute automated refresh cycle, curated sources, and a mobile-friendly dashboard.

## Current Features

- Automatically crawls news from `RSS` and approved `html_list` sources (with `robots.txt` checks where applicable).
- Dynamic source management in D1 (`news_sources`) via admin UI (create/toggle/delete).
- Scheduled refresh via Cloudflare Cron every 5 minutes (`*/5 * * * *`).
- Stores articles, daily reports, media briefs, and crawl run logs in D1.
- Caches homepage/API payloads in KV for faster responses.
- Serves assets from R2 (`/assets/*`) and stores AI-generated thumbnails.
- Article enrichment pipeline:
  - extracts source image (`og:image`) when available,
  - summarizes content with Workers AI (OpenAI fallback),
  - generates representative images when needed.
- Unified UI:
  - featured/hot articles and hot keywords,
  - filter by date/keyword/source/sentiment,
  - pagination,
  - daily briefs & media section,
  - market board from CafeF data,
  - smart intraday history timeline with sentiment/change highlights.
- SEO/UX:
  - metadata, Open Graph, JSON-LD,
  - logo + favicon,
  - Google Font Montserrat,
  - mobile navigation, back-to-top, and client auto-refresh every 5 minutes when data changes.

## Architecture

- Runtime: Cloudflare Workers
- Framework: Hono
- Storage:
  - D1: articles, reports, media items, source config, crawl runs
  - KV: cached payload, view counters, report history snapshots
  - R2: logo/fallback assets/AI-generated thumbnails
- AI:
  - Workers AI (`env.AI`) for summarization/image generation
  - OpenAI as fallback when `OPENAI_API_KEY` is provided

## Main Project Structure

```text
.
├─ migrations/
│  ├─ 0001_init.sql
│  ├─ 0002_sources.sql
│  ├─ 0003_media_items.sql
│  └─ 0004_articles_image_url.sql
├─ src/
│  ├─ config/sources.ts
│  ├─ services/
│  │  ├─ fetch-news.ts
│  │  ├─ refresh.ts
│  │  ├─ summarizer.ts
│  │  ├─ source-extract.ts
│  │  ├─ image-gen.ts
│  │  ├─ daily-media.ts
│  │  ├─ cafef-market.ts
│  │  └─ sentiment.ts
│  ├─ ui/
│  │  ├─ render.ts
│  │  ├─ admin.ts
│  │  └─ rss.ts
│  ├─ db.ts
│  ├─ index.ts
│  └─ types.ts
├─ .env.example
├─ package.json
└─ wrangler.toml
```

## System Requirements

- Node.js 20+
- Wrangler 4+
- Cloudflare account with D1, KV, R2, and Workers AI access

## Local Setup

1. Install dependencies:
   - `npm install`
2. Create local environment file:
   - copy `.env.example` to `.dev.vars`
3. Authenticate Cloudflare:
   - `npx wrangler login`
4. Create resources (if not created yet):
   - D1: `npx wrangler d1 create vn_market_news`
   - KV: `npx wrangler kv namespace create CACHE`
   - KV preview: `npx wrangler kv namespace create CACHE --preview`
   - R2: `npx wrangler r2 bucket create vn-market-assets`
5. Put generated IDs into `wrangler.toml` (D1/KV/R2/account).
6. Apply migrations:
   - local: `npm run migrate:local`
   - remote: `npm run migrate:remote`
7. Run locally:
   - `npm run dev`

## Environment Variables and Secrets

In `.dev.vars`:

- `ADMIN_REFRESH_TOKEN` (required)
- `OPENAI_API_KEY` (optional)
- `OPENAI_MODEL` (default: `gpt-5.5`)

Set production secrets:

- `npx wrangler secret put ADMIN_REFRESH_TOKEN`
- `npx wrangler secret put OPENAI_API_KEY`

Current key bindings in `wrangler.toml`:

- `DB` (D1 binding)
- `CACHE` (KV binding)
- `ASSETS` (R2 binding)
- `AI` (Workers AI binding)
- `crons = ["*/5 * * * *"]`

## Key Routes and API

- `GET /`: homepage dashboard.
- `GET /article?url=<encoded_url>`: article detail page.
- `GET /api/news/today`: JSON feed for current day (supports filters).
- `GET /rss/today`: RSS 2.0 feed for today.
- `POST /admin/refresh`: manually trigger refresh (`x-admin-token` header).
- `GET /admin/sources?token=<ADMIN_REFRESH_TOKEN>`: source management UI.
- `POST /admin/sources`: add source (`rss` or `html_list`).
- `POST /admin/sources/:id/toggle`: enable/disable source.
- `POST /admin/sources/:id/delete`: delete custom source.
- `GET /assets/*`: serves static assets/thumbnails from R2.

## Operations

- Cron runs every 5 minutes to fetch new content and update reports/media/sentiment.
- Frontend polls every 5 minutes and auto-reloads when fresh data is detected.
- Manual trigger:
  - `curl -X POST http://127.0.0.1:8787/admin/refresh -H "x-admin-token: <token>"`

## Production Deployment

1. Verify `wrangler.toml` account and all bindings.
2. Ensure remote migrations are applied:
   - `npm run migrate:remote`
3. Deploy:
   - `npm run deploy`
4. Smoke test:
   - `/`
   - `/api/news/today`
   - `/admin/sources?token=...`

## Business Notes

- "Market scenario (heuristic)" content is informational only.
- This service is not investment advice.
- Respect source robots/terms before enabling HTML crawling.
