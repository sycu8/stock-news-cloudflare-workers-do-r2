import assert from "node:assert/strict";

import { analyzeArticleMarketImpact } from "../.tmp-test/services/article-impact.js";

const impacts = analyzeArticleMarketImpact(
  {
    title: "VHM công bố lợi nhuận tăng mạnh",
    url: "https://example.com/vhm",
    sourceId: "x",
    sourceName: "Example",
    publishedAt: "2026-05-10T01:00:00Z",
    snippet: "Kết quả kinh doanh tích cực giúp kỳ vọng cải thiện.",
    contentLimited: false,
    summaryVi: "VHM ghi nhận lợi nhuận vượt kỳ vọng.",
    imageUrl: null
  },
  { topVolume: [{ symbol: "VHM", price: "42.50", volume: "1,000,000", ratioPct: "1.2%", lot: "" }] }
);

assert.deepEqual(impacts[0], {
  symbol: "VHM",
  direction: "positive",
  relation: "direct",
  price: "42.50",
  reason: "Được nhắc trực tiếp trong tin; sắc thái tin đang nghiêng tích cực."
});

console.log("article-impact tests passed");
