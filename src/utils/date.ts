export function formatDateOnly(isoLike: string | Date): string {
  const date = typeof isoLike === "string" ? new Date(isoLike) : isoLike;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Calendar YYYY-MM-DD in a specific IANA time zone (for report-day keys, not UTC midnight). */
export function formatCalendarDateInZone(isoLike: string | Date, timeZone: string): string {
  const date = typeof isoLike === "string" ? new Date(isoLike) : isoLike;
  if (Number.isNaN(date.getTime())) {
    return formatDateOnly(date);
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export function formatCalendarDateVietnam(isoLike: string | Date): string {
  return formatCalendarDateInZone(isoLike, "Asia/Ho_Chi_Minh");
}

/**
 * Treat `YYYY-MM-DD` as a Vietnam local calendar day; return inclusive UTC ISO bounds for SQL.
 */
export function vietnamReportDayUtcIsoRange(reportDate: string): { start: string; end: string } | null {
  const d = reportDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const start = new Date(`${d}T00:00:00+07:00`);
  const end = new Date(`${d}T23:59:59.999+07:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Mốc đầu phiên báo để poll so sánh bài “mới hơn” khi không có anchor trên DOM */
export function reportDayStartIso(reportDate: string): string {
  const b = vietnamReportDayUtcIsoRange(reportDate);
  return b?.start ?? "1970-01-01T00:00:00.000Z";
}

export function formatVietnamDateDisplay(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "full",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(date);
}

export function formatVietnamDateTimeDisplay(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(date);
}

export function formatVietnamTimeDisplay(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(date);
}

export function toIsoOrNow(input?: string): string {
  const value = input ? new Date(input) : new Date();
  if (Number.isNaN(value.getTime())) {
    return new Date().toISOString();
  }
  return value.toISOString();
}
