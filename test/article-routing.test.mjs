import assert from "node:assert/strict";

import {
  buildArticleDetailPath,
  extractArticleUrlHashFromSlug,
  findArticleByUrlHash,
  slugifyArticleTitle
} from "../.tmp-test/services/article-routing.js";

assert.equal(
  slugifyArticleTitle("Cổ phiếu ngân hàng tăng mạnh: nhà đầu tư chú ý gì?"),
  "co-phieu-ngan-hang-tang-manh-nha-dau-tu-chu-y-gi",
  "slugifyArticleTitle should remove Vietnamese accents and keep URL readable"
);

const path = buildArticleDetailPath(
  "2026-05-10",
  "https://example.com/news?id=123",
  "Tin mới về VN-Index và nhóm chứng khoán"
);

assert.match(
  path,
  /^\/tin\/2026-05-10\/tin-moi-ve-vn-index-va-nhom-chung-khoan-[0-9a-f]{8}$/,
  "buildArticleDetailPath should create a friendly dated article URL with a stable hash"
);
assert.equal(extractArticleUrlHashFromSlug(path.split("/").pop() ?? ""), path.slice(-8));

const articles = [
  {
    title: "Bài A",
    url: "https://example.com/a",
    sourceId: "x",
    sourceName: "Example",
    publishedAt: "2026-05-10T01:00:00Z",
    snippet: "",
    contentLimited: false,
    summaryVi: "",
    imageUrl: null
  },
  {
    title: "Bài B",
    url: "https://example.com/b",
    sourceId: "x",
    sourceName: "Example",
    publishedAt: "2026-05-10T02:00:00Z",
    snippet: "",
    contentLimited: false,
    summaryVi: "",
    imageUrl: null
  }
];
const hash = extractArticleUrlHashFromSlug(
  buildArticleDetailPath("2026-05-10", articles[1].url, articles[1].title).split("/").pop() ?? ""
);

assert.equal(
  findArticleByUrlHash(articles, hash)?.url,
  "https://example.com/b",
  "findArticleByUrlHash should resolve an article from the friendly URL hash"
);

console.log("article-routing tests passed");
