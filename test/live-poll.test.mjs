import assert from "node:assert/strict";

import { filterArticlesForPortfolio } from "../.tmp-test/services/portfolio-watchlist.js";

const rows = [
  {
    title: "FPT công bố kết quả",
    summaryVi: "",
    snippet: "FPT",
    url: "https://example.com/a",
    sourceName: "S",
    publishedAt: "2026-06-26T10:00:00Z"
  },
  {
    title: "Vàng tăng giá",
    summaryVi: "",
    snippet: "vàng",
    url: "https://example.com/b",
    sourceName: "S",
    publishedAt: "2026-06-26T10:05:00Z"
  }
];

const portfolioRows = filterArticlesForPortfolio(rows, ["FPT"]);
assert.equal(portfolioRows.length, 1);
assert.equal(portfolioRows[0].title.includes("FPT"), true);

console.log("live-poll tests passed");
