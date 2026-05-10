export type BuiltinAgentRole = "EA" | "COO" | "HR" | "CSO" | "QA";

export interface AgentToolDef {
  name: string;
  description: string;
}

export interface AgentProfile {
  role: BuiltinAgentRole | string;
  displayName: string;
  goal: string;
  tools: AgentToolDef[];
  memoryPolicy: "task_scoped" | "preferences_d1" | "none";
  systemPrompt: string;
}

export interface AgentTaskInput {
  companyId: string;
  taskId: string;
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  handoffTo?: BuiltinAgentRole | string;
}

export interface AgentHandoff {
  toRole: string;
  reason: string;
  subtaskTitle: string;
  subtaskDescription?: string;
}
