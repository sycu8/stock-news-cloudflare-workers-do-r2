import assert from "node:assert/strict";

import { buildPersonalizedBriefNote } from "../.tmp-test/services/morning-brief.js";

const articles = [
  {
    title: "FPT công bố kết quả",
    summaryVi: "FPT",
    snippet: "",
    url: "https://example.com/a",
    sourceId: "x",
    sourceName: "S",
    publishedAt: "2026-06-26T10:00:00Z",
    contentLimited: false,
    imageUrl: null
  }
];

assert.equal(buildPersonalizedBriefNote(articles, []), undefined);
const note = buildPersonalizedBriefNote(articles, ["FPT"]);
assert.ok(note?.includes("FPT"));
assert.ok(note?.includes("FPT công bố"));

console.log("morning-brief tests passed");
