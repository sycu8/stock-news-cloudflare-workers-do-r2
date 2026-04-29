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
- UX & reliability (recent):
  - Sticky nav with logo shortlink to `/` (refresh home); header logo also links home.
  - **Tin vắn**: tab **Trong nước** (default) vs **Nước ngoài**; international finance sources (e.g. CNBC) appear under the foreign tab; sentiment badges on brief lines.
  - Image proxy **`/img`** with Cloudflare edge transforms (`cf.image`) for external URLs; `onerror` fallback to brand logo.
  - Performance & a11y baseline: skip link, landmarks, cache headers on HTML/JSON/RSS, optional RUM `POST /api/rum`, CI workflow (Lighthouse + Pa11y smoke tests).

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

## Image delivery (Cloudflare)

### Remote RSS / article thumbnails (this repo)

External HTTPS image URLs are rewritten to same-origin proxy URLs. The Worker implements:

`GET /img?u=<url-encoded-https-url>&w=<16-4096>&q=<40-100>`

- **Transform path:** `src/services/cf-image-fetch.ts` calls `fetch(upstream, { cf: { image: { width, fit: "scale-down", quality, metadata: "none" } } })`.
- **Fallback:** if that response is not a valid image, the Worker fetches the upstream without `cf.image`.
- **Responsive images:** `srcset` uses multiple `w` values (e.g. 320, 640, 960, 1200) on `/img` for the same `u`.
- **Same-origin assets** under `/assets/*` are **not** passed through `/img` in the markup; they are served from R2 as before.

**Account / zone requirements**

- Image transforms on `fetch` require your Cloudflare account/zone to have **Image Resizing** (or equivalent Images entitlement) enabled for traffic through this Worker—this is what your **Cloudflare Images** subscription typically unlocks alongside library hosting.
- Local `wrangler dev` may not mirror production transform behaviour; verify on a deployed `*.workers.dev` or custom hostname.

### Cloudflare Images library (`imagedelivery.net`)

For assets you **upload** via the Cloudflare Images dashboard or API, use delivery URLs:

`https://imagedelivery.net/<account_hash>/<image_id>/<variant_name>`

Store `image_id` + variant in D1 if you migrate logos/thumbnails off R2. Those URLs can be used **directly** in `<img src>` without `/img`.

### Product roadmap (terminal vision)

Longer-term direction for **stocknews.orangecloud.vn** is documented in the assistant design note (AI terminal, watchlists, briefings, alerts). Implementation should be phased; data-heavy features (volume, foreign flow) need explicit licensed feeds before UI promises go live.

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
│  │  ├─ cf-image-fetch.ts
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

- `GET /`: homepage dashboard (SSR); query params include `source`, `sentiment`, `date`, `q`, `page` (bounded).
- `GET /search`: redirects to `/` preserving query string (alias for “ticker/search” style URLs).
- `GET /article?u=<encoded_url>`: article detail page (`d` optional for consistency with redirects).
- `GET /img?u=<encoded_https_url>&w=<px>&q=<quality>`: optimized remote image proxy (see Image delivery).
- `GET /api/news/today`: JSON feed for current day (`date`, `source`, `page`, `pageSize` bounded).
- `POST /api/rum`: accepts JSON beacon from the homepage (structured logs); used for metrics experiments.
- `GET /rss/today`: RSS 2.0 feed for today (cache-friendly headers).
- `GET /health`: JSON liveness probe for uptime monitors.
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
   - `/img?u=<encoded-https-url-of-a-tiny-test-image>&w=64&q=80` (expect `image/*` response)
   - `/health`
   - `/rss/today`
   - `/admin/sources?token=...`

## CI (GitHub Actions)

Workflow `.github/workflows/perf-a11y-ci.yml` runs on push/PR to `main`: installs deps, boots `wrangler dev` locally, runs smoke curls, Lighthouse CI (`.lighthouserc.json`), and Pa11y CI (`.pa11yci.json`).

Scripts:

- `npm run ci:lighthouse`
- `npm run ci:a11y`

## Changelog (high level)

| Area | Summary |
|------|---------|
| Images | `/img` + `cf.image` transforms; responsive srcset; README contract for Images library URLs |
| Tin vắn | Domestic / foreign tabs; CNBC-class sources in foreign tab where topic matches |
| Navigation | Logo links to `/`; sticky nav includes logo button |
| Performance | Cached HTML/API/RSS headers; bounded query params |
| Repo | Lighthouse + Pa11y gates, RUM endpoint hooks in UI |

## Business Notes

- "Market scenario (heuristic)" content is informational only.
- This service is not investment advice.
- Respect source robots/terms before enabling HTML crawling.
