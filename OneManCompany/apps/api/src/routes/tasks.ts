import { Hono } from "hono";
import type { Env } from "../env";
import { getTask, listTasks } from "../db/queries";
import { runCompanyObjective } from "../core/orchestration/CompanyOrchestrator";
import type { ObjectiveRequest } from "../types";

export const tasks = new Hono<{ Bindings: Env }>();

tasks.get("/company/:companyId", async (c) => {
  const companyId = c.req.param("companyId");
  const items = await listTasks(c.env, companyId);
  return c.json({ tasks: items });
});

tasks.get("/:taskId", async (c) => {
  const taskId = c.req.param("taskId");
  const row = await getTask(c.env, taskId);
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json({ task: row });
});

tasks.post("/objective", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Partial<ObjectiveRequest>;
  if (!body.companyId || !body.objective) {
    return c.json({ error: "companyId and objective required" }, 400);
  }
  const output = await runCompanyObjective(c.env, body.companyId, body.objective);
  return c.json({ output });
});
