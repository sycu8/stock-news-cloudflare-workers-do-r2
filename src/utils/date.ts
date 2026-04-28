export function formatDateOnly(isoLike: string | Date): string {
  const date = typeof isoLike === "string" ? new Date(isoLike) : isoLike;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
