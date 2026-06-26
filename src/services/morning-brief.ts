import type { DailyReport, Env, StoredArticle } from "../types";
import { filterArticlesForPortfolio } from "./portfolio-watchlist";
import { summarizeMorningExecutiveBrief } from "./summarizer";

const BRIEF_CACHE_PREFIX = "brief:morning:";

export interface MorningBrief {
  reportDate: string;
  generatedAt: string;
  executiveBriefVi: string;
  personalizedNoteVi?: string;
}

export async function loadMorningBrief(env: Env, reportDate: string): Promise<MorningBrief | null> {
  const raw = await env.CACHE.get(`${BRIEF_CACHE_PREFIX}${reportDate}`, "json");
  if (!raw || typeof raw !== "object") return null;
  const b = raw as MorningBrief;
  if (!b.reportDate || typeof b.executiveBriefVi !== "string") return null;
  return b;
}

export async function persistMorningBrief(env: Env, brief: MorningBrief): Promise<void> {
  await env.CACHE.put(`${BRIEF_CACHE_PREFIX}${brief.reportDate}`, JSON.stringify(brief), {
    expirationTtl: 60 * 60 * 24 * 14
  });
}

export function buildPersonalizedBriefNote(articles: StoredArticle[], watchSymbols: string[]): string | undefined {
  if (!watchSymbols.length) return undefined;
  const matched = filterArticlesForPortfolio(articles, watchSymbols).slice(0, 8);
  if (!matched.length) return undefined;
  const symList = watchSymbols.slice(0, 8).join(", ");
  const lines = matched.map((a) => `- ${a.title}`).join("\n");
  return `Góc nhìn danh mục (${symList}): có ${matched.length} tin nhắc mã theo dõi hôm nay, ví dụ:\n${lines}`;
}

export async function generateMorningBriefIfNeeded(
  env: Env,
  reportDate: string,
  report: DailyReport,
  articles: StoredArticle[],
  watchSymbols: string[] = []
): Promise<MorningBrief | null> {
  const existing = await loadMorningBrief(env, reportDate);
  if (existing) return existing;

  const executiveBriefVi = await summarizeMorningExecutiveBrief(reportDate, report, articles, env);
  const personalizedNoteVi = buildPersonalizedBriefNote(articles, watchSymbols);

  const brief: MorningBrief = {
    reportDate,
    generatedAt: new Date().toISOString(),
    executiveBriefVi,
    personalizedNoteVi
  };
  await persistMorningBrief(env, brief);
  return brief;
}
