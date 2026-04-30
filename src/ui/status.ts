import { formatVietnamDateTimeDisplay } from "../utils/date";
import { themeAppearanceSwitcher, themeFontLinks, themeSemanticVariablesBlock, type Appearance } from "./theme";

export function renderStatusPage(params: {
  nowIso: string;
  workerVersion: string;
  latestUpdateAt: string | null;
  avgUpdateMinutes: number | null;
  aiStatus: "ok" | "degraded";
  appearance: Appearance;
  feedHealth: Array<{
    sourceId: string;
    sourceName: string;
    enabled: boolean;
    status: "success" | "error" | "unknown";
    message: string;
    fetchedCount: number;
    checkedAt: string | null;
  }>;
}): string {
  const feedRows = params.feedHealth
    .map((x) => {
      const badge = x.status === "success" ? "ok" : x.status === "error" ? "err" : "unk";
      return `<tr>
        <td>${escapeHtml(x.sourceName)}</td>
        <td><span class="b ${badge}">${escapeHtml(x.status)}</span></td>
        <td>${x.fetchedCount}</td>
        <td>${escapeHtml(x.checkedAt ? formatVietnamDateTimeDisplay(x.checkedAt) : "n/a")}</td>
        <td>${escapeHtml(x.message || "-")}</td>
      </tr>`;
    })
    .join("");
  const okCount = params.feedHealth.filter((x) => x.status === "success").length;
  const total = params.feedHealth.length;
  const aiLabel = params.aiStatus === "ok" ? "Ổn định" : "Suy giảm";
  const sw = themeAppearanceSwitcher(params.appearance, "/status");
  return `<!doctype html><html lang="vi" data-theme="${params.appearance}"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Trạng thái hệ thống • VN Market Daily</title>
  <meta name="description" content="Trang theo dõi sức khỏe nguồn dữ liệu, AI và tần suất cập nhật của hệ thống." />
  ${themeFontLinks()}
  <style>
    ${themeSemanticVariablesBlock()}
    .statusTop{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:12px}
    .wrap{max-width:980px;margin:0 auto;padding:18px}
    .card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:var(--shadow)}
    .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
    .kpi{border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--kpi-bg)}
    table{width:100%;border-collapse:collapse}
    th,td{padding:8px;border-bottom:1px solid var(--border);text-align:left;font-size:.92rem;vertical-align:top}
    button,a,input,select{min-height:var(--control-h);min-width:var(--control-h)}
    .b{padding:3px 8px;border-radius:999px;font-size:.78rem;font-weight:700}
    .ok{background:#dcfce7;color:#166534}.err{background:#fee2e2;color:#991b1b}.unk{background:#e5e7eb;color:#374151}
  </style></head><body class="appBody"><main class="wrap">
    <div class="statusTop"><p style="margin:0"><a href="/">← Trang chủ</a></p>${sw}</div>
    <div class="card">
      <h1 style="margin:0 0 8px;">Trạng thái hệ thống</h1>
      <p style="margin:0;color:var(--muted);">Cập nhật lúc: ${escapeHtml(formatVietnamDateTimeDisplay(params.nowIso))}</p>
    </div>
    <section class="card kpis">
      <div class="kpi"><strong>Sức khỏe nguồn feed</strong><div>${okCount}/${total} nguồn ổn định</div></div>
      <div class="kpi"><strong>AI tóm tắt</strong><div>${escapeHtml(aiLabel)}</div></div>
      <div class="kpi"><strong>Tần suất cập nhật</strong><div>${params.avgUpdateMinutes ?? "n/a"} phút</div></div>
      <div class="kpi"><strong>Lần deploy gần nhất</strong><div>${escapeHtml(params.workerVersion)}</div></div>
      <div class="kpi"><strong>Cập nhật khả dụng gần nhất</strong><div>${escapeHtml(params.latestUpdateAt ? formatVietnamDateTimeDisplay(params.latestUpdateAt) : "n/a")}</div></div>
    </section>
    <section class="card">
      <h2 style="margin-top:0;">Chi tiết sức khỏe feed</h2>
      <table>
        <thead><tr><th>Nguồn</th><th>Trạng thái</th><th>Số mục</th><th>Thời điểm kiểm tra</th><th>Thông điệp</th></tr></thead>
        <tbody>${feedRows || '<tr><td colspan="5">No sources found.</td></tr>'}</tbody>
      </table>
    </section>
  </main></body></html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
