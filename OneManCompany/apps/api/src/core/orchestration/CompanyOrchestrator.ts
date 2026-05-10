import type { Env } from "../../env";
import type { StructuredCompanyOutput } from "../../types";
import { getAgentByRole, insertTaskEvent } from "../../db/queries";
import { executeAgentTurn, profileFromDbRow } from "../agents/executor";
import type { AgentTaskInput } from "../agents/types";
import { planObjectiveWithCOO } from "./TaskPlanner";
import { qaReview } from "./QualityGate";
import { newId } from "../../utils/ids";
import { toJson } from "../../utils/json";
import { safeJsonParse } from "../../utils/json";

/**
 * V1 pipeline: EA → COO plan → CSO angle (strategy) → QA → EA summary.
 * Handoffs between DO + D1 can extend this later.
 */
export async function runCompanyObjective(env: Env, companyId: string, objective: string): Promise<StructuredCompanyOutput> {
  const rootTaskId = newId("tk");

  await env.DB.prepare(
    `INSERT INTO tasks (id, company_id, title, description, status, assignee_agent_role, acceptance_criteria) VALUES (?, ?, ?, ?, 'in_progress', 'EA', ?)`
  )
    .bind(rootTaskId, companyId, "CEO objective", objective, "Structured JSON output for CEO.")
    .run();

  const log = async (kind: string, agent: string | null, payload: unknown) => {
    await insertTaskEvent(env, {
      id: newId("ev"),
      task_id: rootTaskId,
      agent_role: agent,
      kind,
      payload_json: toJson(payload),
    });
  };

  await log("objective_received", "EA", { objective });

  const eaRow = await getAgentByRole(env, companyId, "EA");
  if (!eaRow) {
    return fallbackOutput(objective, "EA missing — seed onboarding.");
  }
  const eaProfile = profileFromDbRow(eaRow);
  const eaRoute = await executeAgentTurn(env, eaProfile, {
    companyId,
    taskId: rootTaskId,
    title: "Route CEO objective",
    description: objective,
    handoffTo: "COO",
  });
  await log("ea_route", "EA", { text: eaRoute.text });

  const cooPlan = await planObjectiveWithCOO(env, companyId, rootTaskId, objective);
  await log("coo_plan", "COO", { text: cooPlan });

  const csoRow = await getAgentByRole(env, companyId, "CSO");
  let strategy = "";
  if (csoRow) {
    const csoProfile = profileFromDbRow(csoRow);
    const csoInput: AgentTaskInput = {
      companyId,
      taskId: rootTaskId,
      title: "Strategy pass",
      description: `${objective}\n\nCOO plan:\n${cooPlan}`,
    };
    strategy = (await executeAgentTurn(env, csoProfile, csoInput)).text;
    await log("cso_strategy", "CSO", { text: strategy });
  }

  const bundleForQa = [`## COO\n${cooPlan}`, strategy ? `## CSO\n${strategy}` : ""].filter(Boolean).join("\n\n");
  const qa = await qaReview(env, companyId, rootTaskId, bundleForQa, "JSON-ready sections for CEO dashboard.");
  await log("qa_review", "QA", { text: qa });

  const eaSumm = await executeAgentTurn(env, eaProfile, {
    companyId,
    taskId: rootTaskId,
    title: "CEO summary after QA",
    description: `Objective:\n${objective}\n\nDraft sections:\n${bundleForQa}\n\nQA notes:\n${qa}\n\nReturn JSON matching fields: executive_summary, workstreams[], risks_and_assumptions[], next_steps[].`,
    acceptanceCriteria: "Valid JSON only in assistant message body.",
  });
  await log("ea_summary", "EA", { text: eaSumm.text });

  const parsed = safeJsonParse<StructuredCompanyOutput | null>(extractJsonBlock(eaSumm.text), null);
  const output =
    parsed ??
    ({
      executive_summary: eaSumm.text.slice(0, 800),
      workstreams: [
        { name: "Planning", owner_role: "COO", actions: [cooPlan.slice(0, 400)] },
        { name: "Strategy", owner_role: "CSO", actions: [strategy.slice(0, 400) || "N/A"] },
      ],
      risks_and_assumptions: [qa.slice(0, 400)],
      next_steps: ["Re-run with clearer JSON instruction or parse manually."],
    } satisfies StructuredCompanyOutput);

  await env.DB.prepare(`UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind("done", rootTaskId).run();

  return output;
}

function extractJsonBlock(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function fallbackOutput(objective: string, reason: string): StructuredCompanyOutput {
  return {
    executive_summary: reason,
    workstreams: [{ name: "Triage", owner_role: "EA", actions: [objective] }],
    risks_and_assumptions: ["Incomplete agent roster"],
    next_steps: ["Complete onboarding"],
  };
}
