import { Hono } from "hono";
import type { Env } from "../env";
import type { IndustryId } from "../core/quickstarts/industries";
import { INDUSTRIES, listIndustryOptions } from "../core/quickstarts/industries";
import { seedCompanyFromIndustry } from "../core/quickstarts/seedCompany";
import type { OnboardRequest } from "../types";

export const onboarding = new Hono<{ Bindings: Env }>();

onboarding.get("/industries", (c) => c.json({ industries: listIndustryOptions() }));

onboarding.post("/workspace", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as OnboardRequest;
  const industryId = body.industryId as IndustryId | undefined;
  if (!industryId || !(industryId in INDUSTRIES)) {
    return c.json({ error: "invalid industryId" }, 400);
  }
  const result = await seedCompanyFromIndustry(c.env, industryId, body.companyName);
  return c.json({
    ok: true,
    companyId: result.companyId,
    workspaceId: result.workspaceId,
    durableName: result.durableName,
    industry: INDUSTRIES[industryId].label,
  });
});
