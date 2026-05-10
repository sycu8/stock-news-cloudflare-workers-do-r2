import type { Env } from "../env";
import type { AgentRecord, CompanyRecord, TaskRecord } from "../types";

export async function getCompany(env: Env, id: string): Promise<CompanyRecord | null> {
  const row = await env.DB.prepare(`SELECT * FROM companies WHERE id = ?`).bind(id).first<CompanyRecord>();
  return row ?? null;
}

export async function listAgents(env: Env, companyId: string): Promise<AgentRecord[]> {
  const { results } = await env.DB.prepare(`SELECT * FROM agents WHERE company_id = ? ORDER BY role`).bind(companyId).all<AgentRecord>();
  return results ?? [];
}

export async function getAgentByRole(env: Env, companyId: string, role: string): Promise<AgentRecord | null> {
  const row = await env.DB.prepare(`SELECT * FROM agents WHERE company_id = ? AND role = ?`).bind(companyId, role).first<AgentRecord>();
  return row ?? null;
}

export async function listTasks(env: Env, companyId: string, limit = 50): Promise<TaskRecord[]> {
  const { results } = await env.DB.prepare(`SELECT * FROM tasks WHERE company_id = ? ORDER BY created_at DESC LIMIT ?`).bind(companyId, limit).all<TaskRecord>();
  return results ?? [];
}

export async function getTask(env: Env, id: string): Promise<TaskRecord | null> {
  const row = await env.DB.prepare(`SELECT * FROM tasks WHERE id = ?`).bind(id).first<TaskRecord>();
  return row ?? null;
}

export async function insertTaskEvent(
  env: Env,
  row: { id: string; task_id: string; agent_role: string | null; kind: string; payload_json: string | null }
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO task_events (id, task_id, agent_role, kind, payload_json) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(row.id, row.task_id, row.agent_role, row.kind, row.payload_json)
    .run();
}
