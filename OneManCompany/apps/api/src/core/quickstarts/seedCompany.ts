import type { Env } from "../../env";
import type { IndustryId } from "./industries";
import { INDUSTRIES } from "./industries";
import { foundingAgentProfiles } from "../agents/registry";
import { newId } from "../../utils/ids";
import { toJson } from "../../utils/json";

export interface SeedCompanyResult {
  companyId: string;
  workspaceId: string;
  durableName: string;
}

export async function seedCompanyFromIndustry(env: Env, industryId: IndustryId, companyName?: string): Promise<SeedCompanyResult> {
  const preset = INDUSTRIES[industryId];
  const companyId = newId("co");
  const workspaceId = newId("ws");
  const name = companyName?.trim() || preset.companyNameDefault;
  const durableName = companyId;

  const profiles = foundingAgentProfiles(preset.label);
  const stmts: D1PreparedStatement[] = [];

  stmts.push(
    env.DB.prepare(`INSERT INTO companies (id, name, industry_id, operating_rhythm) VALUES (?, ?, ?, ?)`).bind(
      companyId,
      name,
      industryId,
      preset.operatingRhythm
    )
  );

  const kvKey = `ws:${workspaceId}:config`;
  stmts.push(
    env.DB.prepare(`INSERT INTO workspaces (id, company_id, kv_cache_key) VALUES (?, ?, ?)`).bind(workspaceId, companyId, kvKey)
  );

  for (const role of ["EA", "COO", "HR", "CSO", "QA"] as const) {
    const p = profiles[role];
    const agentId = newId("ag");
    stmts.push(
      env.DB.prepare(
        `INSERT INTO agents (id, company_id, role, display_name, goal, tools_json, memory_policy, system_prompt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        agentId,
        companyId,
        p.role,
        p.displayName,
        p.goal,
        toJson(p.tools),
        p.memoryPolicy,
        p.systemPrompt
      )
    );
  }

  for (const wf of preset.workflows) {
    const wid = newId("wf");
    stmts.push(
      env.DB.prepare(`INSERT INTO workflows (id, company_id, name, definition_json) VALUES (?, ?, ?, ?)`).bind(
        wid,
        companyId,
        wf.name,
        toJson({ steps: wf.steps })
      )
    );
  }

  for (const tpl of preset.promptTemplateKeys) {
    const tid = newId("pt");
    stmts.push(
      env.DB.prepare(`INSERT INTO prompt_templates (id, company_id, key, body) VALUES (?, ?, ?, ?)`).bind(
        tid,
        companyId,
        tpl.key,
        tpl.body
      )
    );
  }

  for (const t of preset.starterTasks) {
    const taskId = newId("tk");
    stmts.push(
      env.DB.prepare(
        `INSERT INTO tasks (id, company_id, title, description, status, assignee_agent_role) VALUES (?, ?, ?, ?, 'open', ?)`
      ).bind(taskId, companyId, t.title, t.description, t.assignee)
    );
  }

  await env.DB.batch(stmts);

  await env.CACHE.put(
    kvKey,
    toJson({
      industryId,
      companyId,
      workspaceId,
      updatedAt: new Date().toISOString(),
    }),
    { expirationTtl: 60 * 60 * 24 * 30 }
  );

  try {
    const id = env.COMPANY_ROOM.idFromName(durableName);
    const stub = env.COMPANY_ROOM.get(id);
    await stub.fetch(new Request("https://do/seed", { method: "POST", body: toJson({ companyId, industryId }) }));
  } catch (e) {
    console.error("[seedCompany] CompanyRoom seed failed (non-fatal)", e);
  }

  return { companyId, workspaceId, durableName };
}
