import { Hono } from "hono";
import type { Env } from "../env";
import { safeJsonParse } from "../utils/json";

export const workflows = new Hono<{ Bindings: Env }>();

workflows.get("/company/:companyId", async (c) => {
  const companyId = c.req.param("companyId");
  const { results } = await c.env.DB.prepare(`SELECT * FROM workflows WHERE company_id = ? ORDER BY created_at DESC`)
    .bind(companyId)
    .all<{ id: string; company_id: string; name: string; definition_json: string; created_at: string }>();
  return c.json({
    workflows: (results ?? []).map((w) => ({
      id: w.id,
      name: w.name,
      definition: safeJsonParse(w.definition_json, {}),
      created_at: w.created_at,
    })),
  });
});
