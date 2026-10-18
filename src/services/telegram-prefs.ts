import type { ClusteredArticle } from "./news-cluster";
import { parsePortfolioSymbols } from "./portfolio-watchlist.js";

export interface TelegramSubscriberPrefs {
  symbols: string[];
  minImpact: number;
  breakingOnly: boolean;
}

export const DEFAULT_TELEGRAM_PREFS: TelegramSubscriberPrefs = {
  symbols: [],
  minImpact: 0,
  breakingOnly: false
};

export function normalizeTelegramPrefs(raw?: Partial<TelegramSubscriberPrefs> | null): TelegramSubscriberPrefs {
  const symbols = parsePortfolioSymbols((raw?.symbols ?? []).join(","));
  let minImpact = Number(raw?.minImpact ?? 0);
  if (!Number.isFinite(minImpact)) minImpact = 0;
  minImpact = Math.max(0, Math.min(100, Math.round(minImpact)));
  return {
    symbols,
    minImpact,
    breakingOnly: Boolean(raw?.breakingOnly)
  };
}

export function filterArticlesForTelegramSubscriber(
  articles: ClusteredArticle[],
  prefs: TelegramSubscriberPrefs
): ClusteredArticle[] {
  let rows = articles;
  if (prefs.symbols.length) {
    const set = new Set(prefs.symbols.map((s) => s.toUpperCase()));
    rows = rows.filter((a) => {
      const t = `${a.title} ${a.summaryVi ?? ""} ${a.snippet}`;
      for (const sym of set) {
        if (new RegExp(`\\b${sym}\\b`, "i").test(t)) return true;
      }
      return false;
    });
  }
  if (prefs.breakingOnly) {
    rows = rows.filter((a) => a.confirmationLevel === "confirmed" || a.confirmationLevel === "breaking");
  }
  if (prefs.minImpact > 0) {
    rows = rows.filter((a) => estimateArticleImpact(a) >= prefs.minImpact);
  }
  return rows.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 12);
}

/** Lightweight impact estimate for Telegram filtering (avoids heavy investor-intel import). */
function estimateArticleImpact(article: ClusteredArticle): number {
  const conf =
    article.confirmationLevel === "confirmed" ? 20 : article.confirmationLevel === "breaking" ? 12 : 4;
  const len = `${article.title} ${article.summaryVi ?? ""}`.length;
  return Math.min(100, Math.max(10, conf + Math.min(30, Math.floor(len / 80)) + article.sourceCount * 4));
}
