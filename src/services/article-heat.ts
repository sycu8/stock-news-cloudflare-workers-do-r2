/** Heuristic “heat” for ranking / impact — shared by homepage and investor desk. */
export function hotScore(a: { title: string; snippet: string; summaryVi: string | null; sourceName: string }): number {
  const text = `${a.title} ${a.summaryVi ?? ""} ${a.snippet}`.toLowerCase();
  const terms = [
    ["vn-index", 3],
    ["vnindex", 3],
    ["lãi suất", 2],
    ["tỷ giá", 2],
    ["kết quả kinh doanh", 2],
    ["mua ròng", 2],
    ["bán ròng", 2],
    ["khối ngoại", 2],
    ["tăng", 1],
    ["giảm", 1],
    ["điều chỉnh", 1],
    ["đột biến", 2]
  ] as const;
  let s = 0;
  for (const [t, w] of terms) {
    if (text.includes(t)) s += w;
  }
  if (a.sourceName.toLowerCase().includes("research")) s += 1;
  return s;
}
