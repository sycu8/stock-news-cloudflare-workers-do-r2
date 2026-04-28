import type { CafeFMarketSnapshot, Env } from "../types";
import { stripHtml, truncate } from "../utils/text";

const CAFEF_URL = "https://cafef.vn/du-lieu.chn";
const CACHE_KEY = "cafef-market-snapshot";

export async function getCafeFMarketSnapshot(env: Env): Promise<CafeFMarketSnapshot | null> {
  const cached = await env.CACHE.get(CACHE_KEY, "json");
  if (cached && typeof cached === "object") {
    const typed = cached as CafeFMarketSnapshot;
    if (typed?.fetchedAt && Array.isArray(typed.overviewItems)) {
      return typed;
    }
  }

  try {
    const fresh = await fetchCafeFMarketSnapshot();
    await env.CACHE.put(CACHE_KEY, JSON.stringify(fresh), { expirationTtl: 60 * 30 });
    return fresh;
  } catch (error) {
    console.error("CafeF snapshot fetch failed:", error);
    return null;
  }
}

async function fetchCafeFMarketSnapshot(): Promise<CafeFMarketSnapshot> {
  const resp = await fetch(CAFEF_URL, {
    headers: {
      "User-Agent": "vn-market-daily-worker/1.0 (+Cloudflare Worker)",
      Accept: "text/html,application/xhtml+xml"
    }
  });
  if (!resp.ok) {
    throw new Error(`CafeF fetch failed: ${resp.status}`);
  }

  const html = await resp.text();
  const normalized = stripHtml(html).replace(/\s+/g, " ").trim();

  return {
    fetchedAt: new Date().toISOString(),
    marketDateLabel: extractDateLabel(normalized),
    overviewItems: extractOrderedUnique(
      normalized,
      "Toàn cảnh thị trường",
      [
        "Chỉ số chứng khoán - Top cổ phiếu",
        "Khối ngoại",
        "Thanh khoản",
        "Ngoại hối",
        "Độ rộng",
        "Tự doanh",
        "Bản đồ",
        "Hàng hóa - Tiền mã hóa",
        "Tin tức - Báo cáo"
      ]
    ),
    quickLinks: [
      { label: "Bảng giá điện tử", url: "https://liveboard.cafef.vn/" },
      { label: "Giao dịch nước ngoài", url: "https://cafef.vn/du-lieu/tracuulichsu2/3/hose/today.chn" },
      { label: "Dữ liệu lịch sử", url: "https://cafef.vn/du-lieu/lich-su-giao-dich/hose/all-1.chn" },
      { label: "Dữ liệu doanh nghiệp", url: "https://cafef.vn/du-lieu/du-lieu-doanh-nghiep.chn" }
    ],
    toolLinks: [
      { label: "Báo cáo phân tích", url: "https://cafef.vn/du-lieu/phan-tich-bao-cao.chn" },
      { label: "Công cụ PTKT", url: "https://cafef.vn/du-lieu/du-lieu-download.chn" },
      { label: "Bảng giá trực tuyến", url: "https://liveboard.cafef.vn/" },
      { label: "Công bố thông tin", url: "https://cafef.vn/du-lieu/cong-bo-thong-tin.chn" }
    ],
    sections: extractOrderedUnique(
      normalized,
      "Toàn cảnh thị trường",
      [
        "Top 10 cổ phiếu",
        "Định giá",
        "Nhóm dẫn dắt thị trường",
        "Diễn biến giao dịch khối ngoại",
        "Thanh khoản thị trường",
        "Hàng hóa",
        "Tỷ giá",
        "Tiền mã hóa",
        "Giao dịch tự doanh",
        "Top Tự doanh",
        "Độ rộng thị trường",
        "Tin tức",
        "Sự kiện T",
        "Lịch đại hội CĐ",
        "Bản đồ thị trường",
        "Thị trường ngoại hối",
        "Báo cáo phân tích"
      ]
    ),
    notes: extractOrderedUnique(
      normalized,
      "(*) Lưu ý:",
      [
        truncate(
          "(*) Lưu ý: Dữ liệu được tổng hợp từ các nguồn đáng tin cậy, có giá trị tham khảo với các nhà đầu tư.",
          180
        ),
        truncate("CafeF có cả dữ liệu Việt Nam và thế giới trong nhóm Tin tức - Báo cáo.", 120)
      ]
    ),
    sourceUrl: CAFEF_URL
  };
}

function extractDateLabel(text: string): string {
  const match = text.match(/Thứ\s+[A-Za-zÀ-ỹ0-9,\s]+?\d{4}/i);
  return match?.[0]?.trim() ?? "Đang cập nhật";
}

function extractOrderedUnique(text: string, anchor: string, preferred: string[]): string[] {
  const startAt = text.indexOf(anchor);
  const scope = startAt >= 0 ? text.slice(startAt, Math.min(text.length, startAt + 4000)) : text;
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of preferred) {
    if (scope.includes(item) && !seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }

  return out;
}
