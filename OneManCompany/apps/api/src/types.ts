import type { IndustryId } from "./core/quickstarts/industries";

export type { IndustryId };

export interface CompanyRecord {
  id: string;
  name: string;
  industry_id: IndustryId;
  operating_rhythm: string | null;
  created_at: string;
}

export interface WorkspaceRecord {
  id: string;
  company_id: string;
  kv_cache_key: string | null;
  created_at: string;
}

export interface AgentRecord {
  id: string;
  company_id: string;
  role: string;
  display_name: string;
  goal: string | null;
  tools_json: string | null;
  memory_policy: string | null;
  system_prompt: string | null;
  created_at: string;
}

export interface TaskRecord {
  id: string;
  company_id: string;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  status: string;
  assignee_agent_role: string | null;
  acceptance_criteria: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRecord {
  id: string;
  company_id: string;
  name: string;
  definition_json: string;
  created_at: string;
}

export interface ArtifactRecord {
  id: string;
  company_id: string;
  task_id: string | null;
  title: string;
  content_type: string | null;
  r2_key: string | null;
  body_preview: string | null;
  metadata_json: string | null;
  created_at: string;
}

export interface OnboardRequest {
  industryId: IndustryId;
  companyName?: string;
}

export interface ObjectiveRequest {
  companyId: string;
  objective: string;
}

export interface StructuredCompanyOutput {
  executive_summary: string;
  workstreams: { name: string; owner_role: string; actions: string[] }[];
  risks_and_assumptions: string[];
  next_steps: string[];
}
