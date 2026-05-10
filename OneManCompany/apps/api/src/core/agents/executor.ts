import type { Env } from "../../env";
import { runWorkersAIChat, type ChatMessage } from "../workersAI";
import type { AgentProfile, AgentTaskInput } from "./types";
import { safeJsonParse, toJson } from "../../utils/json";

export interface AgentRunResult {
  role: string;
  text: string;
  handoff?: { toRole: string; reason: string };
}

/**
 * Executes a single agent turn via Workers AI (+ AI Gateway when configured).
 */
export async function executeAgentTurn(env: Env, profile: AgentProfile, input: AgentTaskInput): Promise<AgentRunResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: profile.systemPrompt },
    {
      role: "user",
      content: [
        `Company: ${input.companyId}`,
        `Task: ${input.taskId}`,
        `Title: ${input.title}`,
        input.description ? `Description: ${input.description}` : "",
        input.acceptanceCriteria ? `Acceptance: ${input.acceptanceCriteria}` : "",
        input.handoffTo ? `Preferred handoff: ${input.handoffTo}` : "",
        "If you need another agent, end with a line HANDOFF: ROLE=COO | REASON=...",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  const { text } = await runWorkersAIChat(env, messages, {});
  const handoff = parseHandoff(text);
  return { role: String(profile.role), text, handoff };
}

function parseHandoff(text: string): { toRole: string; reason: string } | undefined {
  const m = text.match(/HANDOFF:\s*ROLE=([^|\s]+)\s*\|\s*REASON=(.+)/i);
  if (!m) return undefined;
  return { toRole: m[1].trim(), reason: m[2].trim() };
}

export function profileFromDbRow(row: {
  role: string;
  display_name: string;
  goal: string | null;
  tools_json: string | null;
  memory_policy: string | null;
  system_prompt: string | null;
}): AgentProfile {
  return {
    role: row.role,
    displayName: row.display_name,
    goal: row.goal ?? "",
    tools: safeJsonParse(row.tools_json, [] as AgentProfile["tools"]),
    memoryPolicy: (row.memory_policy as AgentProfile["memoryPolicy"]) ?? "task_scoped",
    systemPrompt: row.system_prompt ?? "",
  };
}

export function logAgentOutputMeta(_env: Env, _payload: unknown): string {
  return toJson({ stub: "persist agent telemetry in V2" });
}
