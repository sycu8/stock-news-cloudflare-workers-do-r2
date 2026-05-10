import { Hono } from "hono";
import type { Env } from "../env";
import { listAgents } from "../db/queries";
import { safeJsonParse } from "../utils/json";

export const agents = new Hono<{ Bindings: Env }>();

agents.get("/company/:companyId", async (c) => {
  const companyId = c.req.param("companyId");
  const rows = await listAgents(c.env, companyId);
  return c.json({
    agents: rows.map((r) => {
      const { tools_json, ...rest } = r;
      return { ...rest, tools: safeJsonParse(tools_json, [] as { name: string; description: string }[]) };
    }),
  });
});
