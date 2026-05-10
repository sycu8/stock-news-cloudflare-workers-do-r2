/**
 * One-liner CEO prompts — aligned with the spirit of
 * https://1mancompany.github.io/OneManCompany/#demos
 * (adapted to this Cloudflare MVP objective pipeline).
 */
export interface DemoScenario {
  id: string;
  /** Short heading like the official demo tiles */
  title: string;
  /** Subtitle shown in UI */
  blurb: string;
  /** Injected into the CEO objective field */
  ceoLine: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "game",
    title: "Let's Make a Game",
    blurb: "CEO gives one sentence — team plans scope, risks, and next steps (MVP: strategy output).",
    ceoLine:
      "Build a small puzzle game for mobile: one core mechanic, 3 levels, a title screen, and a plan for art + sound. Deliver a structured milestone breakdown.",
  },
  {
    id: "storybook",
    title: "Let's Make a TTS Storybook",
    blurb: "One command — outline narration, pages, and QA checklist (MVP: doc-style plan).",
    ceoLine:
      "Create a children's storybook with 8 pages, TTS narration script per page, illustration briefs per page, and accessibility checks for age 5–7.",
  },
  {
    id: "saas",
    title: "Let's Validate a Micro-SaaS",
    blurb: "B2B idea → ICP, risks, experiments — matches the SaaS founder quick start.",
    ceoLine: "Validate a B2B micro-SaaS idea for dentists: ICP, offer, pricing hypothesis, and 2-week validation plan.",
  },
  {
    id: "agency",
    title: "Let's Ship a Client Sprint",
    blurb: "Agency-style delivery: scope, milestones, QA gate.",
    ceoLine:
      "We owe a client a 2-week sprint: redesign onboarding flow, implement analytics events, and ship with a QA sign-off checklist.",
  },
  {
    id: "research",
    title: "Let's Run a Research Sprint",
    blurb: "Research consultant track: questions, sources, synthesis shape.",
    ceoLine:
      "Run a 5-day research sprint on competitor pricing in EU fintech: research questions, source plan, synthesis outline, and exec readout structure.",
  },
];
