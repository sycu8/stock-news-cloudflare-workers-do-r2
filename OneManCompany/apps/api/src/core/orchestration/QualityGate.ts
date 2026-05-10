import type { Env } from "../../env";
import { getAgentByRole } from "../../db/queries";
import { executeAgentTurn, profileFromDbRow } from "../agents/executor";
import type { AgentTaskInput } from "../agents/types";

export async function qaReview(env: Env, companyId: string, taskId: string, draft: string, acceptance?: string): Promise<string> {
  const row = await getAgentByRole(env, companyId, "QA");
  if (!row) return `QA unavailable — draft:\n${draft}`;
  const profile = profileFromDbRow(row);
  const input: AgentTaskInput = {
    companyId,
    taskId,
    title: "QA review",
    description: draft,
    acceptanceCriteria: acceptance ?? "Clear, accurate, actionable for CEO.",
  };
  const { text } = await executeAgentTurn(env, profile, input);
  return text;
}
