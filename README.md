# VN Market Daily Worker

Website tin nhanh chung khoan Viet Nam chay tren Cloudflare Workers (TypeScript + Hono), tu dong cap nhat 5 phut/lan tu RSS va nguon da phe duyet, tong hop dashboard web than thien mobile.

## Tinh nang hien tai

- Crawl tin tuc tu dong tu `RSS` va `html_list` (co check `robots.txt` voi nguon cho phep crawl).
- Quan ly nguon dong bang D1 (`news_sources`), gom them/bat-tat/xoa tu trang admin.
- Tu dong refresh theo `Cron Trigger` moi 5 phut (`*/5 * * * *`).
- Luu du lieu bai viet, bao cao ngay, media briefs, lich su crawl trong D1.
- Cache payload trang chu bang KV de giam tai.
- Ho tro R2 de phuc vu asset (`/assets/*`) va luu anh dai dien sinh bang AI.
- Lam giau bai viet:
  - trich `og:image` tu bai goc,
  - tom tat bang Workers AI/OpenAI fallback,
  - neu thieu anh thi co the sinh anh tu noi dung.
- UI tong hop:
  - tin noi bat + hot keywords,
  - loc theo ngay/tu khoa/source/sentiment,
  - phan trang,
  - ban tin van & media trong ngay,
  - du lieu thi truong (CafeF),
  - lich su cap nhat thong minh theo sentiment va bien dong.
- SEO/UX:
  - metadata, Open Graph, JSON-LD,
  - logo + favicon,
  - font Montserrat,
  - menu mobile, back-to-top, auto refresh client moi 5 phut khi co du lieu moi.

## Kien truc nhanh

- Runtime: Cloudflare Workers.
- Framework: Hono.
- Storage:
  - D1: bai viet, reports, media, source config, crawl runs.
  - KV: cache payload, view counters, history snapshot.
  - R2: logo/fallback assets/AI-generated thumbnails.
- AI:
  - Workers AI (`env.AI`) cho tom tat va tao anh.
  - OpenAI la fallback neu co `OPENAI_API_KEY`.

## Cau truc thu muc chinh

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

## Yeu cau he thong

- Node.js 20+
- Wrangler 4+
- Tai khoan Cloudflare co quyen D1, KV, R2, Workers AI

## Cai dat local

1. Cai dependency:
   - `npm install`
2. Tao file bien moi truong local:
   - copy `.env.example` -> `.dev.vars`
3. Dang nhap Cloudflare:
   - `npx wrangler login`
4. Tao resource (neu chua co):
   - D1: `npx wrangler d1 create vn_market_news`
   - KV: `npx wrangler kv namespace create CACHE`
   - KV preview: `npx wrangler kv namespace create CACHE --preview`
   - R2: `npx wrangler r2 bucket create vn-market-assets`
5. Dien ID vao `wrangler.toml` (D1/KV/R2/account).
6. Apply migration:
   - local: `npm run migrate:local`
   - remote: `npm run migrate:remote`
7. Chay local:
   - `npm run dev`

## Bien moi truong va secrets

Trong `.dev.vars`:

- `ADMIN_REFRESH_TOKEN` (bat buoc)
- `OPENAI_API_KEY` (tuy chon)
- `OPENAI_MODEL` (mac dinh `gpt-5.5`)

Set production secret:

- `npx wrangler secret put ADMIN_REFRESH_TOKEN`
- `npx wrangler secret put OPENAI_API_KEY`

Trong `wrangler.toml` hien tai dang dung:

- `DB` (D1 binding)
- `CACHE` (KV binding)
- `ASSETS` (R2 binding)
- `AI` (Workers AI binding)
- `crons = ["*/5 * * * *"]`

## API va route quan trong

- `GET /`: trang tong hop.
- `GET /article?url=<encoded_url>`: trang chi tiet bai viet.
- `GET /api/news/today`: JSON feed cho ngay hien tai (co filter query).
- `GET /rss/today`: RSS 2.0 tu danh sach bai trong ngay.
- `POST /admin/refresh`: ep refresh thu cong (header `x-admin-token`).
- `GET /admin/sources?token=<ADMIN_REFRESH_TOKEN>`: UI quan ly source.
- `POST /admin/sources`: them source moi (`rss`/`html_list`).
- `POST /admin/sources/:id/toggle`: bat/tat source.
- `POST /admin/sources/:id/delete`: xoa source custom.
- `GET /assets/*`: phuc vu static/thumbnail tu R2.

## Van hanh

- Cron se tu chay moi 5 phut, crawl tin moi, cap nhat report, media, sentiment.
- Frontend co script check update moi 5 phut va tu reload neu payload thay doi.
- De trigger tay:
  - `curl -X POST http://127.0.0.1:8787/admin/refresh -H "x-admin-token: <token>"`

## Trien khai production

1. Kiem tra `wrangler.toml` da dung account va cac binding.
2. Dam bao migration da apply remote:
   - `npm run migrate:remote`
3. Deploy:
   - `npm run deploy`
4. Test nhanh:
   - `/`
   - `/api/news/today`
   - `/admin/sources?token=...`

## Luu y nghiep vu

- Noi dung "kich ban thi truong (heuristic)" chi mang tinh tham khao.
- Khong phai khuyen nghi dau tu.
- Ton trong robots/terms cua nguon khi bat crawl HTML.
