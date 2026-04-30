import type { Env, StoredArticle } from "../types";
import { getFeedByDate } from "./refresh";
import { getTodayDateKey } from "../db";

export type CalendarEventType = "dividend" | "agm" | "earnings" | "etf_review" | "derivatives_expiry";

export interface MarketCalendarEvent {
  type: CalendarEventType;
  title: string;
  date: string;
  sourceUrl?: string;
  sourceName?: string;
  confidence: "high" | "medium";
}

export async function buildMarketCalendar(
  env: Env,
  reportDate = getTodayDateKey(),
  lookaheadDays = 45
): Promise<MarketCalendarEvent[]> {
  const feed = await getFeedByDate(env, reportDate, { page: 1, pageSize: 200 });
  return buildMarketCalendarFromArticles(feed.articles, reportDate, lookaheadDays);
}

export function buildMarketCalendarFromArticles(
  articles: StoredArticle[],
  reportDate = getTodayDateKey(),
  lookaheadDays = 45
): MarketCalendarEvent[] {
  const from = parseDateOnly(reportDate);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + lookaheadDays);

  const extracted = articles.flatMap((a) => extractEventsFromArticle(a, from, to));
  const system = [...buildDerivativesExpiries(from, to), ...buildEtfReviewDates(from, to)];
  const merged = dedupeEvents([...extracted, ...system]);
  return merged.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}

function extractEventsFromArticle(article: StoredArticle, from: Date, to: Date): MarketCalendarEvent[] {
  const text = `${article.title}\n${article.summaryVi ?? ""}\n${article.snippet}`;
  const lower = text.toLowerCase();
  const type: CalendarEventType | null = lower.match(/cổ tức|chia cổ tức|tạm ứng cổ tức/i)
    ? "dividend"
    : lower.match(/đhcd|đại hội đồng cổ đông|hop dhcd|họp dhcd/i)
      ? "agm"
      : lower.match(/kqkd|earnings|lợi nhuận quý|báo cáo tài chính/i)
        ? "earnings"
        : null;
  if (!type) return [];
  const dates = extractDates(text, article.publishedAt)
    .filter((d) => d >= from && d <= to)
    .slice(0, 2);
  if (!dates.length) return [];
  return dates.map((d) => ({
    type,
    title: article.title,
    date: formatDateOnly(d),
    sourceUrl: article.url,
    sourceName: article.sourceName,
    confidence: "medium"
  }));
}

function extractDates(text: string, fallbackIso: string): Date[] {
  const out: Date[] = [];
  const dmY = text.matchAll(/\b([0-3]?\d)[\/\-]([01]?\d)[\/\-]((?:20)?\d{2})\b/g);
  for (const m of dmY) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const yRaw = Number(m[3]);
    const year = yRaw < 100 ? 2000 + yRaw : yRaw;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(d.getTime())) out.push(d);
  }
  const ymd = text.matchAll(/\b(20\d{2})[\/\-]([01]\d)[\/\-]([0-3]\d)\b/g);
  for (const m of ymd) {
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    if (!Number.isNaN(d.getTime())) out.push(d);
  }
  if (!out.length) {
    const fallback = new Date(fallbackIso);
    if (!Number.isNaN(fallback.getTime())) out.push(fallback);
  }
  return out;
}

function buildDerivativesExpiries(from: Date, to: Date): MarketCalendarEvent[] {
  const events: MarketCalendarEvent[] = [];
  let y = from.getUTCFullYear();
  let m = from.getUTCMonth();
  while (Date.UTC(y, m, 1) <= to.getTime()) {
    const date = thirdWeekdayOfMonth(y, m, 4); // Thursday
    if (date >= from && date <= to) {
      events.push({
        type: "derivatives_expiry",
        title: "Đáo hạn phái sinh (ước tính theo lịch tháng)",
        date: formatDateOnly(date),
        confidence: "high"
      });
    }
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return events;
}

function buildEtfReviewDates(from: Date, to: Date): MarketCalendarEvent[] {
  const events: MarketCalendarEvent[] = [];
  for (let year = from.getUTCFullYear(); year <= to.getUTCFullYear(); year += 1) {
    for (const month of [2, 5, 8, 11]) {
      const date = thirdWeekdayOfMonth(year, month, 5); // Friday
      if (date >= from && date <= to) {
        events.push({
          type: "etf_review",
          title: "ETF review (ước tính theo chu kỳ quý)",
          date: formatDateOnly(date),
          confidence: "high"
        });
      }
    }
  }
  return events;
}

function thirdWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (7 + weekday - first.getUTCDay()) % 7;
  const day = 1 + offset + 14;
  return new Date(Date.UTC(year, month, day));
}

function dedupeEvents(events: MarketCalendarEvent[]): MarketCalendarEvent[] {
  const seen = new Set<string>();
  const out: MarketCalendarEvent[] = [];
  for (const ev of events) {
    const key = `${ev.type}|${ev.date}|${normalize(ev.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ev);
  }
  return out;
}

function parseDateOnly(input: string): Date {
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date();
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function formatDateOnly(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalize(input: string): string {
  return input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
