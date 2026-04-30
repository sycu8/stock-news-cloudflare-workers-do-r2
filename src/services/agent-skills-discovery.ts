import { sha256Hex } from "../utils/sha256";
import { normalizeOrigin } from "./agent-discovery";

/** Agent Skills Discovery RFC v0.2.0 — index schema URI. */
export const AGENT_SKILLS_DISCOVERY_SCHEMA = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";

/**
 * Canonical SKILL.md bytes (UTF-8) served at `/.well-known/agent-skills/agent-skills/SKILL.md`.
 * The discovery index `digest` MUST match SHA-256 of this exact string.
 */
export const AGENT_SKILLS_SKILL_MD_BODY = `---
name: agent-skills-discovery
description: Publish a discovery index at /.well-known/agent-skills/index.json per Agent Skills Discovery RFC 0.2.0; validate with external scanners.
---

# Implement Agent Skills Discovery Index

Publish a skills discovery document per the [Agent Skills Discovery RFC](https://github.com/cloudflare/agent-skills-discovery-rfc) v0.2.0.

## Requirements

- Serve JSON at \`/.well-known/agent-skills/index.json\` with HTTP 200
- Include a \`$schema\` field set to \`https://schemas.agentskills.io/discovery/0.2.0/schema.json\`
- Include a \`skills\` array where each entry has:
  - \`name\` — skill identifier (lowercase alphanumeric + hyphens)
  - \`type\` — \`"skill-md"\` (single SKILL.md) or \`"archive"\` (bundled archive)
  - \`description\` — brief description of what the skill does
  - \`url\` — URL to the skill artifact (SKILL.md file or archive)
  - \`digest\` — SHA-256 hash of the artifact (\`sha256:{hex}\`)

## Validate

POST \`https://isitagentready.com/api/scan\` with \`Content-Type: application/json\` and body:

\`\`\`json
{"url": "https://YOUR-SITE.com"}
\`\`\`

Check that \`checks.discovery.agentSkills.status\` is \`"pass"\`.
`;

let skillArtifactDigestPromise: Promise<string> | null = null;

function getSkillArtifactDigest(): Promise<string> {
  if (!skillArtifactDigestPromise) {
    skillArtifactDigestPromise = sha256Hex(AGENT_SKILLS_SKILL_MD_BODY).then((hex) => `sha256:${hex}`);
  }
  return skillArtifactDigestPromise;
}

export async function buildAgentSkillsDiscoveryIndex(origin: string): Promise<Record<string, unknown>> {
  const o = normalizeOrigin(origin);
  const skillUrl = `${o}/.well-known/agent-skills/agent-skills/SKILL.md`;
  const digest = await getSkillArtifactDigest();
  return {
    $schema: AGENT_SKILLS_DISCOVERY_SCHEMA,
    skills: [
      {
        name: "agent-skills-discovery",
        type: "skill-md",
        description:
          "Publish and validate an Agent Skills discovery index (RFC 0.2.0) at /.well-known/agent-skills/index.json.",
        url: skillUrl,
        digest
      }
    ]
  };
}
