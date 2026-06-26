import type { StoredArticle } from "../types";

export function filterArticlesForPortfolio(articles: StoredArticle[], symbols: string[]): StoredArticle[] {
  if (!symbols.length) return articles;
  const set = new Set(symbols.map((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "")).filter(Boolean));
  return articles.filter((a) => {
    const t = `${a.title} ${a.summaryVi ?? ""} ${a.snippet}`;
    for (const sym of set) {
      if (sym.length >= 2 && new RegExp(`\\b${sym}\\b`, "i").test(t)) return true;
    }
    return false;
  });
}

export function parsePortfolioSymbols(raw: string | undefined | null, max = 18): string[] {
  if (!raw) return [];
  const parts = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    if (p.length > 8 || p.length < 2) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= max) break;
  }
  return out;
}

export function watchlistToCsv(symbols: string[]): string {
  return ["symbol", ...symbols.map((s) => s.toUpperCase())].join("\n");
}

export function parseWatchlistCsv(raw: string): string[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const body = lines[0]?.toLowerCase() === "symbol" ? lines.slice(1) : lines;
  return parsePortfolioSymbols(body.join(","));
}

export function parseWatchId(raw: string | undefined | null): string | null {
  const id = (raw ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  return id;
}
