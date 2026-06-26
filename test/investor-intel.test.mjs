import assert from "node:assert/strict";

import {
  parsePortfolioSymbols,
  filterArticlesForPortfolio,
  parseWatchlistCsv,
  watchlistToCsv,
  parseWatchId
} from "../.tmp-test/services/portfolio-watchlist.js";

assert.deepEqual(parsePortfolioSymbols("vnm, fpt , HPG"), ["VNM", "FPT", "HPG"]);
assert.deepEqual(parseWatchlistCsv("symbol\nVNM\nFPT"), ["VNM", "FPT"]);
assert.equal(watchlistToCsv(["vnm", "fpt"]).split("\n")[0], "symbol");

const id = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
assert.equal(parseWatchId(id), id);
assert.equal(parseWatchId("not-a-uuid"), null);

const articles = [
  {
    title: "VNM tăng mạnh",
    summaryVi: "Vinamilk",
    snippet: "",
    url: "https://example.com/1",
    sourceId: "x",
    sourceName: "Test",
    publishedAt: "2026-06-26T01:00:00Z",
    contentLimited: false,
    imageUrl: null
  },
  {
    title: "Thị trường chung",
    summaryVi: "VN-Index",
    snippet: "",
    url: "https://example.com/2",
    sourceId: "x",
    sourceName: "Test",
    publishedAt: "2026-06-26T02:00:00Z",
    contentLimited: false,
    imageUrl: null
  }
];

const filtered = filterArticlesForPortfolio(articles, ["VNM"]);
assert.equal(filtered.length, 1);

console.log("portfolio-watchlist tests passed");
