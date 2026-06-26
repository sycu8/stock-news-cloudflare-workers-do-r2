import { Hono } from "hono";
import type { Env } from "../env";
import { safeJsonParse, toJson } from "../utils/json";
import { newId } from "../utils/ids";
import { runCompanyObjective } from "../core/orchestration/CompanyOrchestrator";

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

workflows.post("/company/:companyId", async (c) => {
  const companyId = c.req.param("companyId");
  const body = (await c.req.json()) as { name?: string; definition?: unknown };
  const name = (body.name ?? "Workflow").trim().slice(0, 120);
  const id = newId("wf");
  await c.env.DB.prepare(
    `INSERT INTO workflows (id, company_id, name, definition_json) VALUES (?, ?, ?, ?)`
  )
    .bind(id, companyId, name, toJson(body.definition ?? { steps: [] }))
    .run();
  return c.json({ id, name }, 201);
});

workflows.post("/:workflowId/run", async (c) => {
  const workflowId = c.req.param("workflowId");
  const row = await c.env.DB.prepare(`SELECT company_id, name, definition_json FROM workflows WHERE id = ?`)
    .bind(workflowId)
    .first<{ company_id: string; name: string; definition_json: string }>();
  if (!row) return c.json({ error: "not_found" }, 404);
  const def = safeJsonParse(row.definition_json, {}) as { objective?: string };
  const objective = (def.objective ?? `Run workflow: ${row.name}`).trim();
  const output = await runCompanyObjective(c.env, row.company_id, objective);
  return c.json({ workflowId, output }, 200);
});
