import { formatCalendarDateVietnam } from "../utils/date";

/**
 * Vietnam public holiday calendar (YYYY-MM-DD = Vietnam local calendar day).
 * Includes common long breaks for the public sector; private employers may differ.
 * Review yearly against Bộ Nội vụ / Chính phủ announcements.
 */
const HOLIDAY_BY_DATE = new Map<string, string>();

function addRangeInclusive(startYmd: string, endYmd: string, label: string): void {
  const start = new Date(`${startYmd}T12:00:00+07:00`);
  const end = new Date(`${endYmd}T12:00:00+07:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
  for (let t = start.getTime(); t <= end.getTime(); t += 24 * 60 * 60 * 1000) {
    const key = formatCalendarDateVietnam(new Date(t));
    if (!HOLIDAY_BY_DATE.has(key)) HOLIDAY_BY_DATE.set(key, label);
  }
}

function addSingle(ymd: string, label: string): void {
  HOLIDAY_BY_DATE.set(ymd, label);
}

// --- 2025 (verify Tet/Hùng Vương yearly) ---
addSingle("2025-01-01", "Tết Dương lịch");
addRangeInclusive("2025-01-25", "2025-02-02", "Tết Nguyên đán (kỳ nghỉ lễ)");
addSingle("2025-04-07", "Giỗ Tổ Hùng Vương");
addRangeInclusive("2025-04-30", "2025-05-02", "Ngày Giải phóng miền Nam và Quốc tế Lao động");
addRangeInclusive("2025-09-02", "2025-09-03", "Quốc khánh");

// --- 2026 (MoHA schedule, widely reported) ---
addSingle("2026-01-01", "Tết Dương lịch");
addSingle("2026-01-02", "Nghỉ bù Tết Dương lịch");
addRangeInclusive("2026-02-14", "2026-02-22", "Tết Nguyên đán (kỳ nghỉ lễ)");
addRangeInclusive("2026-04-25", "2026-04-27", "Giỗ Tổ Hùng Vương (kỳ nghỉ)");
addRangeInclusive("2026-04-30", "2026-05-03", "Ngày Giải phóng miền Nam và Quốc tế Lao động");
addRangeInclusive("2026-08-29", "2026-09-02", "Quốc khánh (kỳ nghỉ)");
addSingle("2026-11-24", "Ngày Văn hóa Việt Nam");

// --- 2027 (approximate long breaks; verify when decree published) ---
addSingle("2027-01-01", "Tết Dương lịch");
addRangeInclusive("2027-02-04", "2027-02-12", "Tết Nguyên đán (kỳ nghỉ lễ — dự kiến)");
addRangeInclusive("2027-04-16", "2027-04-18", "Giỗ Tổ Hùng Vương (kỳ nghỉ — dự kiến)");
addRangeInclusive("2027-04-30", "2027-05-02", "Ngày Giải phóng miền Nam và Quốc tế Lao động");
addRangeInclusive("2027-09-01", "2027-09-03", "Quốc khánh (kỳ nghỉ — dự kiến)");

export function isVietnamPublicHoliday(reportDateYmd: string): boolean {
  const d = reportDateYmd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return HOLIDAY_BY_DATE.has(d);
}

export function getVietnamHolidayLabel(reportDateYmd: string): string | null {
  const d = reportDateYmd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return HOLIDAY_BY_DATE.get(d) ?? null;
}

/** Neutral daily-report copy when there are no articles and the day is a public holiday. */
export function neutralHolidayDailyOverviewCopy(reportDateYmd: string): {
  overviewVi: string;
  outlookVi: string;
  assumptionsVi: string;
} {
  const label = getVietnamHolidayLabel(reportDateYmd) ?? "ngày nghỉ lễ";
  return {
    overviewVi: [
      `Hôm nay là ${label} tại Việt Nam.`,
      "Trong các ngày nghỉ lễ, thị trường chứng khoán không có phiên giao dịch và nhiều nguồn RSS cập nhật ít hơn so với ngày làm việc.",
      "Trạng thái hiện tại là bình thường đối với kỳ nghỉ: không có đủ tin mới để tổng hợp xu hướng trong ngày, chứ không phải lỗi hệ thống hay tín hiệu tiêu cực về thị trường.",
      "Bạn có thể xem lại các ngày có phiên giao dịch gần đây bằng bộ lọc ngày phía trên."
    ].join(" "),
    outlookVi:
      "Khi thị trường mở cửa trở lại, tổng quan và kịch bản ngắn hạn sẽ được cập nhật từ luồng tin mới. Diễn biến thực tế phụ thuộc tin tức và thanh khoản các phiên sau. This is not financial advice.",
    assumptionsVi:
      "Giả định: kỳ nghỉ kéo dài ít tin doanh nghiệp/vĩ mô mới; khi có phiên giao dịch, dòng tin thường tăng lại."
  };
}

/** Default overview when DB has no daily_report yet (non-holiday = existing slightly urgent tone). */
export function defaultNoFeedOverviewCopy(reportDateYmd: string): {
  overviewVi: string;
  outlookVi: string;
  assumptionsVi: string;
} {
  if (isVietnamPublicHoliday(reportDateYmd)) {
    return neutralHolidayDailyOverviewCopy(reportDateYmd);
  }
  return {
    overviewVi:
      "Dữ liệu tổng hợp chưa sẵn sàng. Vui lòng refresh hoặc chờ hệ thống đồng bộ trong vài phút.",
    outlookVi:
      "Market outlook sẽ được cập nhật sau khi hệ thống thu thập dữ liệu tự động 5 phút/lần. This is not financial advice.",
    assumptionsVi: ""
  };
}
