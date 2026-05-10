import assert from "node:assert/strict";

import {
  cleanAiAnalysisForDisplay,
  hasUsefulAiAnalysis,
  parseAiAnalysisSections,
  shareCtaLabel
} from "../.tmp-test/services/article-detail-ui.js";

assert.equal(shareCtaLabel(), "Chia sẻ ngay tại:", "share CTA label should be explicit");
assert.equal(hasUsefulAiAnalysis("-"), false, "a lone dash should not count as useful AI analysis");
assert.equal(hasUsefulAiAnalysis(" - \n • "), false, "empty bullet-only output should not count as useful AI analysis");
assert.equal(
  hasUsefulAiAnalysis("- Dòng tiền có thể phản ứng mạnh với nhóm ngân hàng."),
  true,
  "real bullet analysis should render"
);
assert.equal(
  cleanAiAnalysisForDisplay("-\n- Cơ chế tác động:\n- Dòng tiền có thể phản ứng mạnh."),
  "- Cơ chế tác động:\n- Dòng tiền có thể phản ứng mạnh.",
  "empty bullet-only lines should be removed before rendering"
);
assert.equal(
  cleanAiAnalysisForDisplay("* - * Cơ chế tác động: tin có thể ảnh hưởng dòng tiền. * Rủi ro: cần theo dõi thanh khoản."),
  "* Cơ chế tác động: tin có thể ảnh hưởng dòng tiền.\n* Rủi ro: cần theo dõi thanh khoản.",
  "empty star bullet segments should be removed before rendering"
);
assert.deepEqual(
  parseAiAnalysisSections("- First point about flows.\n- Second point about risk."),
  [{ title: "", bullets: ["First point about flows.", "Second point about risk."] }],
  "plain bullets without section headings must not invent a Quick points title"
);

assert.deepEqual(
  parseAiAnalysisSections(
    [
      "* Cơ chế tác động:",
      "* Tin tức có thể làm nhóm năng lượng biến động mạnh. -",
      "* Nhóm ngành/mã hưởng lợi hoặc chịu áp lực:",
      "* Khai thác dầu khí hưởng lợi, vận chuyển dầu có thể chịu áp lực.",
      "* Rủi ro cần theo dõi: biến động giá dầu và thanh khoản."
    ].join("\n")
  ),
  [
    { title: "Cơ chế tác động", bullets: ["Tin tức có thể làm nhóm năng lượng biến động mạnh."] },
    { title: "Nhóm ngành/mã hưởng lợi hoặc chịu áp lực", bullets: ["Khai thác dầu khí hưởng lợi, vận chuyển dầu có thể chịu áp lực."] },
    { title: "Rủi ro cần theo dõi", bullets: ["biến động giá dầu và thanh khoản."] }
  ],
  "AI analysis should be grouped into readable sections"
);

console.log("article-detail-ui tests passed");
