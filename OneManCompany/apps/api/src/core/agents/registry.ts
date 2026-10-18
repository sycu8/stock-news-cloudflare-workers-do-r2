import type { AgentProfile, BuiltinAgentRole } from "./types";
import { systemPromptForRole } from "./prompts";

const defaultTools = (names: string[]): AgentProfile["tools"] =>
  names.map((name) => ({
    name,
    description: name === "summarize_progress" ? "Summarize task progress for CEO dashboard" : `${name} (orchestration helper)`
  }));

export function foundingAgentProfiles(industryHint: string): Record<BuiltinAgentRole, AgentProfile> {
  return {
    EA: {
      role: "EA",
      displayName: "Executive Assistant",
      goal: `Coordinate the company on behalf of the CEO. Context: ${industryHint}`,
      tools: defaultTools(["route_task", "summarize_progress"]),
      memoryPolicy: "task_scoped",
      systemPrompt: systemPromptForRole("EA"),
    },
    COO: {
      role: "COO",
      displayName: "Chief Operating Officer",
      goal: `Ship objectives as workflows and measurable tasks. Context: ${industryHint}`,
      tools: defaultTools(["plan_workflow", "split_tasks"]),
      memoryPolicy: "preferences_d1",
      systemPrompt: systemPromptForRole("COO"),
    },
    HR: {
      role: "HR",
      displayName: "People & Talent",
      goal: `Maintain agent roster and industry playbooks. Context: ${industryHint}`,
      tools: defaultTools(["define_role", "onboarding_checklist"]),
      memoryPolicy: "preferences_d1",
      systemPrompt: systemPromptForRole("HR"),
    },
    CSO: {
      role: "CSO",
      displayName: "Chief Strategy Officer",
      goal: `Markets, customers, and revenue strategy. Context: ${industryHint}`,
      tools: defaultTools(["market_scan", "icp_draft"]),
      memoryPolicy: "preferences_d1",
      systemPrompt: systemPromptForRole("CSO"),
    },
    QA: {
      role: "QA",
      displayName: "Quality",
      goal: `Enforce acceptance criteria before CEO-facing delivery. Context: ${industryHint}`,
      tools: defaultTools(["review_output", "score_rubric"]),
      memoryPolicy: "task_scoped",
      systemPrompt: systemPromptForRole("QA"),
    },
  };
}
