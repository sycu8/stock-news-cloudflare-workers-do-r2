import type { StoredArticle } from "../types";

export type ConfirmationLevel = "confirmed" | "single" | "breaking";

export interface ClusteredArticle extends StoredArticle {
  sourceCount: number;
  sourceNames: string[];
  confirmationLevel: ConfirmationLevel;
  confirmationLabel: string;
}

export function collapseDuplicateNews(articles: StoredArticle[]): ClusteredArticle[] {
  const groups = new Map<string, StoredArticle[]>();
  for (const a of articles) {
    const key = clusterKey(a.title, a.publishedAt);
    const current = groups.get(key) ?? [];
    current.push(a);
    groups.set(key, current);
  }

  const merged: ClusteredArticle[] = [];
  for (const [, list] of groups) {
    list.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    const lead = list[0]!;
    const sourceNames = Array.from(new Set(list.map((x) => x.sourceName))).sort();
    const sourceCount = sourceNames.length;
    const confirmationLevel = toConfirmationLevel(sourceCount);
    merged.push({
      ...lead,
      sourceCount,
      sourceNames,
      confirmationLevel,
      confirmationLabel: toConfirmationLabel(sourceCount, confirmationLevel)
    });
  }

  return merged.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function toConfirmationLevel(sourceCount: number): ConfirmationLevel {
  if (sourceCount >= 3) return "confirmed";
  if (sourceCount <= 1) return "single";
  return "breaking";
}

function toConfirmationLabel(sourceCount: number, level: ConfirmationLevel): string {
  if (level === "confirmed") return `Confirmed by ${sourceCount} sources`;
  if (level === "single") return "Single source only";
  return "Breaking / unconfirmed";
}

function clusterKey(title: string, publishedAt: string): string {
  const dateHour = publishedAt.slice(0, 13);
  const normalized = normalizeTitle(title)
    .split(" ")
    .filter(Boolean)
    .slice(0, 10)
    .join(" ");
  return `${dateHour}::${normalized}`;
}

function normalizeTitle(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
