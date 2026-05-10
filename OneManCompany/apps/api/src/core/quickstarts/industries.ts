export type IndustryId =
  | "saas_founder"
  | "ecommerce_operator"
  | "agency_owner"
  | "content_creator"
  | "research_consultant";

export interface IndustryQuickStart {
  id: IndustryId;
  label: string;
  companyNameDefault: string;
  operatingRhythm: string;
  workflows: { name: string; steps: string[] }[];
  promptTemplateKeys: { key: string; body: string }[];
  starterTasks: { title: string; description: string; assignee: "EA" | "COO" | "CSO" | "HR" | "QA" }[];
}

export const INDUSTRIES: Record<IndustryId, IndustryQuickStart> = {
  saas_founder: {
    id: "saas_founder",
    label: "SaaS Founder",
    companyNameDefault: "SaaS Venture Co",
    operatingRhythm: "Weekly: ship loop (Mon plan, Wed build, Fri demo). Daily CEO standup with EA.",
    workflows: [
      {
        name: "Idea → Validation",
        steps: ["Problem interview script", "Landing smoke test", "Pricing experiment", "Build vs buy"],
      },
      {
        name: "GTM v0",
        steps: ["ICP one-pager", "Outbound sequences", "Partner wedge", "Onboarding checklist"],
      },
    ],
    promptTemplateKeys: [
      {
        key: "ceo_weekly_memo",
        body: "Summarize shipped outcomes, metrics, risks, and next week bets for a B2B micro-SaaS.",
      },
      {
        key: "icp_deep_dive",
        body: "Draft ICP with firmographics, workflows, buying triggers, and anti-ICP for {{industry}}.",
      },
    ],
    starterTasks: [
      { title: "Define wedge hypothesis", description: "One sentence on who pays first and why now.", assignee: "CSO" },
      { title: "Ship validation plan", description: "5 customer conversations + success criteria.", assignee: "COO" },
      { title: "Review legal/privacy baseline", description: "SaaS terms + data map skeleton.", assignee: "HR" },
    ],
  },
  ecommerce_operator: {
    id: "ecommerce_operator",
    label: "E-commerce Operator",
    companyNameDefault: "DTC Ops Co",
    operatingRhythm: "Daily ops pulse; weekly merchandising; monthly supplier review.",
    workflows: [
      { name: "SKU Launch", steps: ["Demand signal", "Supplier quote", "Creative brief", "Launch checklist"] },
      { name: "Retention", steps: ["Email flows", "Loyalty hooks", "CX macros", "Returns postmortem"] },
    ],
    promptTemplateKeys: [
      { key: "promo_calendar", body: "Draft 2-week promo calendar with margin guardrails." },
      { key: "sku_postmortem", body: "Analyze SKU performance: traffic, CVR, contribution margin." },
    ],
    starterTasks: [
      { title: "Inventory risk scan", description: "Top 10 SKUs by stockout risk.", assignee: "COO" },
      { title: "Merch narrative refresh", description: "Homepage + collection story.", assignee: "CSO" },
    ],
  },
  agency_owner: {
    id: "agency_owner",
    label: "Agency Owner",
    companyNameDefault: "Studio Partners",
    operatingRhythm: "Weekly client portfolio review; biweekly new biz pipeline; monthly utilization.",
    workflows: [
      { name: "New Client Kickoff", steps: ["SOW alignment", "Stakeholder map", "Reporting cadence", "Scope buffer"] },
      { name: "Delivery", steps: ["Milestone plan", "QA gate", "Client comms", "Margin check"] },
    ],
    promptTemplateKeys: [
      { key: "sow_scope_guard", body: "List scope boundaries and change-order triggers for {{project_type}}." },
      { key: "client_weekly_update", body: "Exec email: progress, decisions needed, risks." },
    ],
    starterTasks: [
      { title: "Pipeline hygiene", description: "Top 5 opportunities with next actions.", assignee: "CSO" },
      { title: "Bench vs demand", description: "2-week staffing outlook.", assignee: "COO" },
    ],
  },
  content_creator: {
    id: "content_creator",
    label: "Content Creator",
    companyNameDefault: "Creator House",
    operatingRhythm: "Content batch days; weekly analytics; sponsor pipeline review.",
    workflows: [
      { name: "Series Planning", steps: ["Audience insight", "Hook bank", "Batch film", "Distribution matrix"] },
      { name: "Sponsor Pack", steps: ["Rate card", "Case studies", "Deliverables", "Brand safety"] },
    ],
    promptTemplateKeys: [
      { key: "hook_generator", body: "10 hooks for {{topic}} aligned to audience pain/outcome." },
      { key: "script_outline", body: "Outline with retention beats for 8–12 minute video." },
    ],
    starterTasks: [
      { title: "Content calendar v0", description: "4-week themes + CTAs.", assignee: "COO" },
      { title: "Brand voice doc", description: "3 pillars, taboo phrases, examples.", assignee: "HR" },
    ],
  },
  research_consultant: {
    id: "research_consultant",
    label: "Research Consultant",
    companyNameDefault: "Insight Advisory",
    operatingRhythm: "Engagement kickoff/close rituals; peer review before client send.",
    workflows: [
      { name: "Research Sprint", steps: ["Questions tree", "Source plan", "Synthesis", "Client readout"] },
      { name: "Proposal", steps: ["Hypothesis", "Method", "Timeline", "Risks"] },
    ],
    promptTemplateKeys: [
      { key: "research_plan", body: "Method note: data sources, biases, and milestones for {{topic}}." },
      { key: "exec_readout", body: "1-page brief: insights, implications, decisions." },
    ],
    starterTasks: [
      { title: "Engagement charter", description: "Goals, outputs, stakeholders.", assignee: "COO" },
      { title: "Thought leadership angle", description: "3 contrarian hypotheses to test.", assignee: "CSO" },
    ],
  },
};

export function listIndustryOptions(): { id: IndustryId; label: string }[] {
  return (Object.keys(INDUSTRIES) as IndustryId[]).map((id) => ({ id, label: INDUSTRIES[id].label }));
}
