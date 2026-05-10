import type { Env } from "../../env";
import { getAgentByRole } from "../../db/queries";
import { executeAgentTurn, profileFromDbRow } from "../agents/executor";
import type { AgentTaskInput } from "../agents/types";

export async function planObjectiveWithCOO(env: Env, companyId: string, taskId: string, objective: string): Promise<string> {
  const row = await getAgentByRole(env, companyId, "COO");
  if (!row) return `COO unavailable — objective: ${objective}`;
  const profile = profileFromDbRow(row);
  const input: AgentTaskInput = {
    companyId,
    taskId,
    title: "Plan company objective",
    description: objective,
    acceptanceCriteria: "Subtasks with owners and acceptance criteria.",
  };
  const { text } = await executeAgentTurn(env, profile, input);
  return text;
}
