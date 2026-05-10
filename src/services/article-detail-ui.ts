export function shareCtaLabel(): string {
  return "Chia sẻ ngay tại:";
}

export function hasUsefulAiAnalysis(input: string | null | undefined): boolean {
  const cleaned = cleanAiAnalysisForDisplay(input);
  if (!cleaned) return false;
  const meaningful = cleaned
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]+\s*/u, "").trim())
    .join(" ")
    .replace(/[-*•\s]+/gu, "")
    .trim();
  return meaningful.length >= 8;
}

export interface AiAnalysisSection {
  title: string;
  bullets: string[];
}

export function parseAiAnalysisSections(input: string | null | undefined): AiAnalysisSection[] {
  const cleaned = cleanAiAnalysisForDisplay(input);
  if (!cleaned) return [];
  const sections: AiAnalysisSection[] = [];
  let current: AiAnalysisSection | null = null;

  const pushSection = (title: string): AiAnalysisSection => {
    const section = { title: stripTrailingColon(cleanBulletMarker(title)), bullets: [] };
    sections.push(section);
    return section;
  };

  for (const rawLine of cleaned.split(/\r?\n/)) {
    const line = cleanBulletMarker(rawLine);
    if (!line) continue;
    const split = splitHeadingAndBody(line);
    if (split) {
      current = pushSection(split.title);
      if (split.body) current.bullets.push(cleanAnalysisBullet(split.body));
      continue;
    }
    if (!current) current = pushSection("");
    current.bullets.push(cleanAnalysisBullet(line));
  }

  return sections
    .map((section) => ({
      title: hideUnwantedQuickPointsHeading(section.title),
      bullets: section.bullets.map(cleanAnalysisBullet).filter(Boolean)
    }))
    .filter((section) => section.bullets.length > 0);
}

/** Bỏ nhãn “Điểm nhanh” (mặc định cũ hoặc do model trả về) — chỉ giữ gạch đầu dòng. */
function hideUnwantedQuickPointsHeading(title: string): string {
  const t = stripForHeadingCompare(title);
  if (t === "diem nhanh" || t.startsWith("diem nhanh:")) return "";
  return title;
}

function stripForHeadingCompare(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[Đđ]/g, "d")
    .replace(/:+\s*$/u, "")
    .trim()
    .toLowerCase();
}

export function cleanAiAnalysisForDisplay(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (trimmed.includes("*")) {
    const starParts = trimmed
      .split(/\s*\*\s*/g)
      .map((part) => part.trim())
      .filter((part) => isMeaningfulBulletSegment(part));
    if (starParts.length > 1) {
      return starParts.map((part) => `* ${part}`).join("\n");
    }
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => isMeaningfulBulletSegment(line))
    .join("\n")
    .trim();
}

function isMeaningfulBulletSegment(input: string): boolean {
  const text = input.replace(/^\s*[-*•]+\s*/u, "").replace(/[-*•\s]+/gu, "").trim();
  return text.length > 0;
}

function cleanBulletMarker(input: string): string {
  return input.replace(/^\s*[-*•]+\s*/u, "").trim();
}

function cleanAnalysisBullet(input: string): string {
  return cleanBulletMarker(input)
    .replace(/\s+[-*•]+\s*$/u, "")
    .trim();
}

function splitHeadingAndBody(input: string): { title: string; body: string } | null {
  const idx = input.indexOf(":");
  if (idx < 0) return null;
  const title = stripTrailingColon(input.slice(0, idx + 1));
  const body = input.slice(idx + 1).trim();
  if (!isLikelySectionHeading(title)) return null;
  return { title, body };
}

function stripTrailingColon(input: string): string {
  return input.replace(/:+$/u, "").trim();
}

function isLikelySectionHeading(input: string): boolean {
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[Đđ]/g, "d")
    .toLowerCase();
  if (normalized.length > 80) return false;
  return (
    normalized.includes("co che tac dong") ||
    normalized.includes("nhom nganh") ||
    normalized.includes("ma huong loi") ||
    normalized.includes("rui ro") ||
    normalized.includes("khung thoi gian") ||
    normalized.includes("can theo doi") ||
    normalized.includes("diem nhanh")
  );
}
