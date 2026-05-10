import { Hono } from "hono";
import type { Env } from "../env";
import { newId } from "../utils/ids";
import { toJson } from "../utils/json";

export const artifacts = new Hono<{ Bindings: Env }>();

artifacts.get("/company/:companyId", async (c) => {
  const companyId = c.req.param("companyId");
  const { results } = await c.env.DB.prepare(`SELECT * FROM artifacts WHERE company_id = ? ORDER BY created_at DESC LIMIT 100`)
    .bind(companyId)
    .all();
  return c.json({ artifacts: results ?? [] });
});

artifacts.post("/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    companyId?: string;
    taskId?: string;
    title?: string;
    contentType?: string;
    text?: string;
    metadata?: Record<string, unknown>;
  };
  if (!body.companyId || !body.title) {
    return c.json({ error: "companyId and title required" }, 400);
  }
  const id = newId("art");
  let r2Key: string | null = null;
  let preview = body.text?.slice(0, 2000) ?? null;

  if (body.text && body.text.length > 16_000) {
    r2Key = `artifacts/${body.companyId}/${id}.txt`;
    await c.env.ARTIFACTS.put(r2Key, body.text, { httpMetadata: { contentType: body.contentType ?? "text/plain" } });
    preview = body.text.slice(0, 500);
  }

  await c.env.DB.prepare(
    `INSERT INTO artifacts (id, company_id, task_id, title, content_type, r2_key, body_preview, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.companyId,
      body.taskId ?? null,
      body.title,
      body.contentType ?? "text/plain",
      r2Key,
      preview,
      body.metadata ? toJson(body.metadata) : null
    )
    .run();

  return c.json({ id, r2Key });
});
