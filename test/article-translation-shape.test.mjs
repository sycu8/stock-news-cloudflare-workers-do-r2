import assert from "node:assert/strict";

import {
  buildArticleTranslationCacheKey,
  looksLikeVietnameseForInvestorEnglish,
  normalizeEnglishArticleTranslation
} from "../.tmp-test/services/article-translation-shape.js";

assert.match(
  buildArticleTranslationCacheKey("https://example.com/news?id=42"),
  /^article-translation:en:v1:[0-9a-f]{8}$/,
  "translation cache key should be stable and scoped"
);

assert.deepEqual(
  normalizeEnglishArticleTranslation({
    title: "Vietnam stocks react to energy news",
    summary: "A concise summary for foreign investors.",
    analysis: "- Energy names may move first.\n- Watch oil prices.",
    sourceName: "Vietstock"
  }),
  {
    title: "Vietnam stocks react to energy news",
    summary: "A concise summary for foreign investors.",
    analysis: "- Energy names may move first.\n- Watch oil prices.",
    sourceName: "Vietstock"
  },
  "valid English translation payload should be normalized"
);

assert.equal(
  normalizeEnglishArticleTranslation({ title: "-", summary: "", analysis: "" }),
  null,
  "empty translation payload should be rejected"
);

assert.equal(
  normalizeEnglishArticleTranslation({
    title: "Điều chỉnh tỷ giá trong ngày",
    summary: "Thị trường chứng khoán có thể phản ứng với các dòng tin về tài khóa và vĩ mô.",
    analysis: "",
    sourceName: "Vietstock"
  }),
  null,
  "responses that stayed in Vietnamese must be rejected (not cached as English)"
);

assert.equal(looksLikeVietnameseForInvestorEnglish("Vietnam-listed names may see higher volatility."), false);

console.log("article-translation-shape tests passed");
