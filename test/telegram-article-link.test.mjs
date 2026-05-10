import assert from "node:assert/strict";

import { buildTelegramArticleHref } from "../.tmp-test/services/telegram-article-link.js";

const href = buildTelegramArticleHref(
  {
    title: "Cổ phiếu dầu khí biến động mạnh",
    url: "https://example.com/original?id=42",
    sourceId: "x",
    sourceName: "Example",
    publishedAt: "2026-05-10T02:00:00.000Z",
    snippet: "",
    contentLimited: false,
    summaryVi: "",
    imageUrl: null
  },
  "https://vietstock.info"
);

assert.match(
  href,
  /^https:\/\/vietstock\.info\/tin\/2026-05-10\/co-phieu-dau-khi-bien-dong-manh-[0-9a-f]{8}$/,
  "Telegram article link should point to the internal vietstock.info article URL"
);
assert.equal(href.includes("example.com"), false, "Telegram article link should not expose the original source URL");

console.log("telegram-article-link tests passed");
