import type { Env, StoredArticle } from "../types";

interface SearchCandidate {
  title: string;
  summaryVi: string | null;
  sourceName: string;
  url: string;
  publishedAt: string;
  score: number;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) s += a[i]! * b[i]!;
  return s;
}

function norm(a: number[]): number {
  return Math.sqrt(dot(a, a)) || 1;
}

async function embedTexts(env: Env, texts: string[]): Promise<number[][] | null> {
  if (!env.AI || texts.length === 0) return null;
  try {
    const out = await env.AI.run("@cf/baai/bge-base-en-v1.5", { text: texts });
    const data =
      (out as { data?: number[][] })?.data ??
      (out as { result?: { data?: number[][] } })?.result?.data ??
      null;
    return Array.isArray(data) ? data : null;
  } catch (error) {
    console.error("ai-search embed failed:", error);
    return null;
  }
}

function lexicalScore(q: string, article: StoredArticle): number {
  const hay = `${article.title} ${article.summaryVi ?? ""} ${article.snippet}`.toLowerCase();
  const tokens = q
    .toLowerCase()
    .split(/\s+/g)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2);
  if (!tokens.length) return 0;
  let hit = 0;
  for (const t of tokens) if (hay.includes(t)) hit += 1;
  return hit / tokens.length;
}

export async function searchArticlesWithCloudflareAi(env: Env, q: string, articles: StoredArticle[], limit = 8): Promise<SearchCandidate[]> {
  const query = q.trim().slice(0, 120);
  if (!query) return [];
  const base = articles.slice(0, 180);
  const lexical = base
    .map((a) => ({ article: a, score: lexicalScore(query, a) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);
  const shortlist = lexical.length ? lexical.map((x) => x.article) : base.slice(0, 40);

  const embeddings = await embedTexts(
    env,
    [query, ...shortlist.map((a) => `${a.title}\n${a.summaryVi ?? a.snippet}`)]
  );
  if (!embeddings || embeddings.length < 2) {
    return shortlist.slice(0, limit).map((a, idx) => ({
      title: a.title,
      summaryVi: a.summaryVi,
      sourceName: a.sourceName,
      url: a.url,
      publishedAt: a.publishedAt,
      score: Number((1 - idx * 0.01).toFixed(4))
    }));
  }

  const qVec = embeddings[0]!;
  const qNorm = norm(qVec);
  return shortlist
    .map((a, idx) => {
      const v = embeddings[idx + 1]!;
      const semantic = dot(qVec, v) / (qNorm * norm(v));
      const lexi = lexicalScore(query, a);
      const score = semantic * 0.75 + lexi * 0.25;
      return {
        title: a.title,
        summaryVi: a.summaryVi,
        sourceName: a.sourceName,
        url: a.url,
        publishedAt: a.publishedAt,
        score: Number(score.toFixed(6))
      };
    })
    .sort((a, b) => b.score - a.score || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}
