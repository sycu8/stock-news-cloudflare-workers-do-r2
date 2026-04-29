import { formatVietnamDateTimeDisplay } from "../utils/date";

export function renderStatusPage(params: {
  nowIso: string;
  workerVersion: string;
  latestUpdateAt: string | null;
  avgUpdateMinutes: number | null;
  aiStatus: "ok" | "degraded";
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
  const aiLabel = params.aiStatus === "ok" ? "Healthy" : "Degraded";
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Status • VN Market Daily</title>
  <style>
    body{font-family:Inter,system-ui,Arial,sans-serif;background:#f5f7fb;color:#111827;margin:0}
    .wrap{max-width:980px;margin:0 auto;padding:18px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:12px}
    .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
    .kpi{border:1px solid #e5e7eb;border-radius:10px;padding:10px;background:#f9fafb}
    table{width:100%;border-collapse:collapse}
    th,td{padding:8px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:.92rem;vertical-align:top}
    .b{padding:3px 8px;border-radius:999px;font-size:.78rem;font-weight:700}
    .ok{background:#dcfce7;color:#166534}.err{background:#fee2e2;color:#991b1b}.unk{background:#e5e7eb;color:#374151}
  </style></head><body><main class="wrap">
    <div class="card">
      <h1 style="margin:0 0 8px;">System Status</h1>
      <p style="margin:0;color:#4b5563;">Cập nhật lúc: ${escapeHtml(formatVietnamDateTimeDisplay(params.nowIso))}</p>
    </div>
    <section class="card kpis">
      <div class="kpi"><strong>Feed health</strong><div>${okCount}/${total} nguồn healthy</div></div>
      <div class="kpi"><strong>AI summarizer</strong><div>${escapeHtml(aiLabel)}</div></div>
      <div class="kpi"><strong>Update frequency</strong><div>${params.avgUpdateMinutes ?? "n/a"} mins</div></div>
      <div class="kpi"><strong>Last deployment</strong><div>${escapeHtml(params.workerVersion)}</div></div>
      <div class="kpi"><strong>Latest available update</strong><div>${escapeHtml(params.latestUpdateAt ? formatVietnamDateTimeDisplay(params.latestUpdateAt) : "n/a")}</div></div>
    </section>
    <section class="card">
      <h2 style="margin-top:0;">Feed health details</h2>
      <table>
        <thead><tr><th>Source</th><th>Status</th><th>Items</th><th>Checked at</th><th>Message</th></tr></thead>
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
