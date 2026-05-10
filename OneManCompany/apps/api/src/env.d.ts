export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  ARTIFACTS: R2Bucket;
  AI: Ai;
  COMPANY_ROOM: DurableObjectNamespace;
  AI_GATEWAY_ID: string;
  CF_ACCOUNT_ID: string;
  DEFAULT_WORKERS_AI_MODEL: string;
  CF_AIG_TOKEN?: string;
}
