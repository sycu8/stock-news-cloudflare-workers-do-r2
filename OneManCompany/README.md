# OneManCompany (Cloudflare MVP)

Experimental AI “virtual company” simulator — separate from the main `vn-market-daily-worker` deploy.

## Apps

- `apps/api` — Hono Worker + D1 + Durable Objects + Workers AI orchestration (EA → COO → CSO → QA)
- `apps/web` — React CEO console + pixel office preview

## API highlights

- `POST /api/tasks/objective` — run CEO objective through agent pipeline
- `GET/POST /api/workflows/company/:companyId` — list/create workflows
- `POST /api/workflows/:workflowId/run` — execute workflow objective

## Local dev

```bash
cd OneManCompany/apps/api && npm install && npx wrangler dev
cd OneManCompany/apps/web && npm install && npm run dev
```

## Status

See root [ROADMAP.md](../ROADMAP.md) — OMC Phase 2 (live DO/WebSockets) remains planned.
